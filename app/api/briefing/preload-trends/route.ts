import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { BriefingService } from '@/backend/services/briefing.service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 키워드 생성 (await로 기다려서 실패 시 브리핑 중단)
    await BriefingService.generateAndSaveTrendKeywords(session.user.email)

    return NextResponse.json({
      success: true,
      message: '트렌드 키워드 생성 완료'
    })
  } catch (error: any) {
    console.error('Preload trends error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to preload trends'
    }, { status: 500 })
  }
}

