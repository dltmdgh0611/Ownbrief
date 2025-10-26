import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/settings?error=unauthorized', process.env.NEXTAUTH_URL!))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('Slack OAuth error:', error)
      return NextResponse.redirect(new URL('/settings?error=slack_auth_failed', process.env.NEXTAUTH_URL!))
    }

    if (!code) {
      console.error('No authorization code received')
      return NextResponse.redirect(new URL('/settings?error=no_code', process.env.NEXTAUTH_URL!))
    }

    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || '' // 끝의 슬래시 제거
    const redirectUri = `${baseUrl}/api/auth/slack/callback`
    
    console.log('Slack callback received:', {
      code: code,
      redirect_uri: redirectUri,
      client_id: process.env.SLACK_CLIENT_ID
    })

    // Slack에서 액세스 토큰 교환 (User OAuth Token)
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      console.error('Slack token exchange failed:', tokenData.error)
      return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', process.env.NEXTAUTH_URL!))
    }

    // 사용자 정보 가져오기 (User OAuth Token 사용)
    const userResponse = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${tokenData.authed_user?.access_token || tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()

    if (!userData.ok) {
      console.error('Slack user info failed:', userData.error)
      return NextResponse.redirect(new URL('/settings?error=user_info_failed', process.env.NEXTAUTH_URL!))
    }

    // 데이터베이스에 저장
    await prisma.connectedService.upsert({
      where: {
        userId_serviceName: {
          userId: session.user.id,
          serviceName: 'slack',
        },
      },
      update: {
        accessToken: tokenData.authed_user?.access_token || tokenData.access_token,
        refreshToken: tokenData.authed_user?.refresh_token || tokenData.refresh_token || null,
        expiresAt: tokenData.authed_user?.expires_in ? new Date(Date.now() + tokenData.authed_user.expires_in * 1000) : null,
        enabled: true, // 연결 시 자동 활성화
        metadata: {
          teamId: tokenData.team?.id,
          teamName: tokenData.team?.name,
          userId: userData.user_id,
          userName: userData.user,
          workspaceId: tokenData.team?.id,
          workspaceName: tokenData.team?.name,
        },
      },
      create: {
        userId: session.user.id,
        serviceName: 'slack',
        accessToken: tokenData.authed_user?.access_token || tokenData.access_token,
        refreshToken: tokenData.authed_user?.refresh_token || tokenData.refresh_token || null,
        expiresAt: tokenData.authed_user?.expires_in ? new Date(Date.now() + tokenData.authed_user.expires_in * 1000) : null,
        enabled: true, // 연결 시 자동 활성화
        metadata: {
          teamId: tokenData.team?.id,
          teamName: tokenData.team?.name,
          userId: userData.user_id,
          userName: userData.user,
          workspaceId: tokenData.team?.id,
          workspaceName: tokenData.team?.name,
        },
      },
    })

    console.log('✅ Slack connected successfully for user:', session.user.email)

    return NextResponse.redirect(new URL('/settings?success=slack_connected', process.env.NEXTAUTH_URL!))
  } catch (error) {
    console.error('Slack OAuth callback error:', error)
    return NextResponse.redirect(new URL('/settings?error=callback_failed', process.env.NEXTAUTH_URL!))
  }
}
