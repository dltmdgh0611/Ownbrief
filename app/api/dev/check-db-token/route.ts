import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

/**
 * DB에서 직접 토큰 정보 조회 (개발용)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // DB에서 직접 조회
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
      select: {
        id: true,
        provider: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
      },
    })

    if (!account) {
      return NextResponse.json({
        error: 'No Google account found',
        userId: session.user.id,
      })
    }

    // 민감한 정보는 일부만 표시
    return NextResponse.json({
      accountId: account.id,
      provider: account.provider,
      hasAccessToken: !!account.access_token,
      accessTokenPreview: account.access_token ? `${account.access_token.substring(0, 20)}...` : null,
      hasRefreshToken: !!account.refresh_token,
      refreshTokenPreview: account.refresh_token ? `${account.refresh_token.substring(0, 20)}...` : null,
      expiresAt: account.expires_at,
      expiresAtDate: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
      isExpired: account.expires_at ? account.expires_at * 1000 < Date.now() : true,
    })
  } catch (error: any) {
    console.error('Error checking DB token:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

