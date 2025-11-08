import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * 개별 서비스 OAuth 연결 엔드포인트
 * 
 * GET /api/auth/connect-service?service=gmail|calendar|youtube
 * - Google OAuth URL 생성하여 리다이렉트
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const service = searchParams.get('service')

    if (!service || !['gmail', 'calendar', 'youtube'].includes(service)) {
      return NextResponse.json(
        { error: 'Invalid service. Must be gmail, calendar, or youtube' },
        { status: 400 }
      )
    }

    // 서비스별 scope 매핑
    const scopeMap: { [key: string]: string } = {
      gmail: 'https://www.googleapis.com/auth/gmail.readonly',
      calendar: 'https://www.googleapis.com/auth/calendar.readonly',
      youtube: 'https://www.googleapis.com/auth/youtube.readonly',
    }

    const scope = scopeMap[service]
    
    // 기본 scope에 서비스 scope 추가
    const fullScope = `openid email profile ${scope}`

    // 리다이렉트 URI 구성 (슬래시 중복 방지)
    const baseUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '') // 끝의 슬래시 제거
    const redirectUri = `${baseUrl}/api/auth/service-callback`
    
    // 디버깅: 실제 사용되는 URI 로그 출력
    console.log('🔗 NEXTAUTH_URL (원본):', process.env.NEXTAUTH_URL)
    console.log('🔗 Base URL (정규화):', baseUrl)
    console.log('🔗 OAuth Redirect URI:', redirectUri)

    // Google OAuth URL 생성
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: fullScope,
      access_type: 'offline',
      prompt: 'consent',
      state: JSON.stringify({ service, returnTo: '/onboarding' }), // 서비스 정보와 리턴 URL 포함
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    
    console.log('🔗 Full OAuth URL:', authUrl.substring(0, 200) + '...')

    return NextResponse.json({ authUrl, redirectUri })
  } catch (error: any) {
    console.error('Connect service error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate service connection' },
      { status: 500 }
    )
  }
}


