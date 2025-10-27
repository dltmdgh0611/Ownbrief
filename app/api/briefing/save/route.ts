import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * 브리핑 저장 API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sectionData } = await request.json()
    
    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 오늘 날짜 범위 계산
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    // 오늘 날짜의 브리핑이 이미 있는지 확인
    const existingBriefing = await prisma.briefing.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    if (existingBriefing) {
      // 기존 브리핑 업데이트
      const updated = await prisma.briefing.update({
        where: { id: existingBriefing.id },
        data: {
          sectionData: sectionData
        }
      })
      return NextResponse.json({ briefingId: updated.id })
    }

    // 기존 브리핑이 없으면 빈 레코드 생성 (script는 null)
    const briefing = await prisma.briefing.create({
      data: {
        userId: user.id,
        script: '',
        dataSources: {},
        sectionData: sectionData
      }
    })

    return NextResponse.json({ briefingId: briefing.id })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to save briefing' },
      { status: 500 }
    )
  }
}

