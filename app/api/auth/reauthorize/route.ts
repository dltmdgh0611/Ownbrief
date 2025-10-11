import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'

/**
 * Google OAuth 재인증 URL 생성
 * Refresh token이 없는 사용자를 위한 재인증 유도
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Google OAuth 재인증 URL 생성
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
      response_type: 'code',
      scope: 'openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube',
      access_type: 'offline',
      prompt: 'consent', // 강제로 동의 화면 표시하여 refresh token 받기
      state: 'reauthorize',
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.json({
      success: true,
      authUrl,
      message: 'Redirect user to this URL to reauthorize',
    })
  } catch (error: any) {
    console.error('Error generating reauth URL:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

