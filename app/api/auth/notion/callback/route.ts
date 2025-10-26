import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'http://localhost:3000'
    
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/settings?error=unauthorized', baseUrl))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('Notion OAuth error:', error)
      return NextResponse.redirect(new URL('/settings?error=notion_auth_failed', baseUrl))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/settings?error=no_code', baseUrl))
    }

    // Notion에서 액세스 토큰 교환
    const redirectUri = `${baseUrl}/api/auth/notion/callback`
    
    console.log('🔐 Token exchange request:', {
      redirectUri,
      clientId: process.env.NOTION_CLIENT_ID,
      hasSecret: !!process.env.NOTION_CLIENT_SECRET,
    })
    
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()
    
    console.log('📥 Token exchange response:', {
      success: !!tokenData.access_token,
      error: tokenData.error,
      errorDescription: tokenData.error_description,
    })

    if (!tokenData.access_token) {
      console.error('Notion token exchange failed:', tokenData)
      return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', baseUrl))
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
      return NextResponse.redirect(new URL('/settings?error=user_info_failed', baseUrl))
    }

    // 사용자가 접근 가능한 모든 워크스페이스 조회
    const workspacesResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 1, // 최소한의 요청으로 워크스페이스 확인
      }),
    })

    const workspacesData = await workspacesResponse.json()
    
    // workspace_id 추출 (tokenData에 포함됨)
    const workspaceInfo = {
      workspaceId: tokenData.workspace_id,
      workspaceName: tokenData.workspace_name || 'Notion Workspace',
      workspaceIcon: tokenData.workspace_icon || null,
      botId: tokenData.bot_id,
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
          ...workspaceInfo,
          type: 'oauth',
          duplicatedTemplateId: tokenData.duplicated_template_id,
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
          ...workspaceInfo,
          type: 'oauth',
          duplicatedTemplateId: tokenData.duplicated_template_id,
        },
      },
    })

    console.log('✅ Notion connected successfully for user:', session.user.email)

    return NextResponse.redirect(new URL('/settings?success=notion_connected', baseUrl))
  } catch (error) {
    console.error('Notion OAuth callback error:', error)
    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'http://localhost:3000'
    return NextResponse.redirect(new URL('/settings?error=callback_failed', baseUrl))
  }
}
