import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * 서비스 토큰 저장 API
 * OAuth 콜백 후 ConnectedService 생성
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { service, accessToken, refreshToken, expiresAt } = await request.json()

    if (!service || !['gmail', 'calendar', 'youtube'].includes(service)) {
      return NextResponse.json(
        { error: 'Invalid service' },
        { status: 400 }
      )
    }

    // User 찾기
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ConnectedService 생성/업데이트
    await prisma.connectedService.upsert({
      where: {
        userId_serviceName: {
          userId: user.id,
          serviceName: service,
        },
      },
      create: {
        userId: user.id,
        serviceName: service,
        accessToken: accessToken || '',
        refreshToken: refreshToken || '',
        expiresAt: expiresAt ? new Date(expiresAt * 1000) : null,
        enabled: true,
      },
      update: {
        accessToken: accessToken || '',
        refreshToken: refreshToken || '',
        expiresAt: expiresAt ? new Date(expiresAt * 1000) : null,
        enabled: true,
      },
    })

    console.log(`✅ ConnectedService saved for ${service}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Save service token error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save service token' },
      { status: 500 }
    )
  }
}


