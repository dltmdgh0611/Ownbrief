import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/settings?error=unauthorized', request.url))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('Notion OAuth error:', error)
      return NextResponse.redirect(new URL('/settings?error=notion_auth_failed', request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/settings?error=no_code', request.url))
    }

    // Notion에서 액세스 토큰 교환
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/notion/callback`,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      console.error('Notion token exchange failed:', tokenData)
      return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', request.url))
    }

    // 사용자 정보 가져오기
    const userResponse = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Notion-Version': '2022-06-28',
      },
    })

    const userData = await userResponse.json()

    if (!userData.id) {
      console.error('Notion user info failed:', userData)
      return NextResponse.redirect(new URL('/settings?error=user_info_failed', request.url))
    }

    // 데이터베이스에 저장
    await prisma.connectedService.upsert({
      where: {
        userId_serviceName: {
          userId: session.user.id,
          serviceName: 'notion',
        },
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: null, // Notion 토큰은 만료되지 않음
        metadata: {
          userId: userData.id,
          userName: userData.name,
          userEmail: userData.person?.email,
          workspaceId: userData.workspace_id,
        },
      },
      create: {
        userId: session.user.id,
        serviceName: 'notion',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: null, // Notion 토큰은 만료되지 않음
        metadata: {
          userId: userData.id,
          userName: userData.name,
          userEmail: userData.person?.email,
          workspaceId: userData.workspace_id,
        },
      },
    })

    console.log('✅ Notion connected successfully for user:', session.user.email)

    return NextResponse.redirect(new URL('/settings?success=notion_connected', request.url))
  } catch (error) {
    console.error('Notion OAuth callback error:', error)
    return NextResponse.redirect(new URL('/settings?error=callback_failed', request.url))
  }
}
