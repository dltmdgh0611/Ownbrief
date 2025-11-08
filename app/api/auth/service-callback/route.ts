import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

/**
 * OAuth 콜백 후 서비스 토큰 저장
 * GET /api/auth/service-callback?code=...&state=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    // Base URL 정규화 (슬래시 중복 방지)
    const baseUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/onboarding?error=missing_params`)
    }

    // state에서 서비스 정보 추출
    let serviceInfo: { service: string; returnTo: string }
    try {
      serviceInfo = JSON.parse(state)
    } catch {
      return NextResponse.redirect(`${baseUrl}/onboarding?error=invalid_state`)
    }

    const { service } = serviceInfo

    if (!service || !['gmail', 'calendar', 'youtube'].includes(service)) {
      return NextResponse.redirect(`${baseUrl}/onboarding?error=invalid_service`)
    }

    // 세션 확인
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.redirect(`${baseUrl}/onboarding?error=unauthorized`)
    }

    // User 찾기
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.redirect(`${baseUrl}/onboarding?error=user_not_found`)
    }

    // 서비스별 scope 매핑
    const scopeMap: { [key: string]: string } = {
      gmail: 'https://www.googleapis.com/auth/gmail.readonly',
      calendar: 'https://www.googleapis.com/auth/calendar.readonly',
      youtube: 'https://www.googleapis.com/auth/youtube.readonly',
    }

    const scope = scopeMap[service]
    const fullScope = `openid email profile ${scope}`

    // OAuth2 클라이언트 생성
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${baseUrl}/api/auth/service-callback`
    )

    // 토큰 교환
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token) {
      return NextResponse.redirect(`${baseUrl}/onboarding?error=no_token`)
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
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        enabled: true,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        enabled: true,
      },
    })

    console.log(`✅ ConnectedService saved for ${service}`)

    // 성공 시 팝업 닫기 스크립트 반환
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>연결 완료</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'SERVICE_CONNECTED', service: '${service}' }, window.location.origin);
              window.close();
            } else {
              window.location.href = '${baseUrl}/onboarding?connected=${service}';
            }
          </script>
          <p>연결이 완료되었습니다. 이 창을 닫아주세요.</p>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    )
  } catch (error: any) {
    console.error('Service callback error:', error)
    const baseUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
    return NextResponse.redirect(`${baseUrl}/onboarding?error=callback_failed`)
  }
}

