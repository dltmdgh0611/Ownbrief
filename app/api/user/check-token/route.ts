import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

/**
 * 사용자의 Google OAuth 토큰 상태 확인
 * Refresh token이 있는지 체크
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자의 Google 계정 정보 조회
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
      select: {
        access_token: true,
        refresh_token: true,
        expires_at: true,
      },
    })

    if (!account) {
      return NextResponse.json({
        hasAccount: false,
        hasRefreshToken: false,
        isExpired: true,
        needsReauth: true,
        message: 'Google account not connected',
      })
    }

    const hasRefreshToken = !!account.refresh_token
    const isExpired = account.expires_at ? account.expires_at * 1000 < Date.now() : true
    const needsReauth = !hasRefreshToken || (!account.access_token && !hasRefreshToken)

    return NextResponse.json({
      hasAccount: true,
      hasRefreshToken,
      isExpired,
      needsReauth,
      expiresAt: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
      message: needsReauth 
        ? '⚠️ Refresh token이 없습니다. 재로그인이 필요합니다.' 
        : isExpired 
          ? '🔄 Access token이 만료되었지만 자동으로 갱신됩니다.'
          : '✅ 토큰이 정상입니다.',
    })
  } catch (error: any) {
    console.error('Error checking token:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

