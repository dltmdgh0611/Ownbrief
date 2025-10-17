import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'

/**
 * Google OAuth 재인증 URL 생성
 * Scope가 변경되었거나 토큰이 만료되었을 때 사용
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Google OAuth 재인증 URL 생성
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
      response_type: 'code',
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/gmail.readonly',
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent', // 항상 동의 화면 표시하여 새로운 토큰 받기
      state: 'reauthorize',
    })

    const reauthorizeUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.json({ reauthorizeUrl })
  } catch (error) {
    console.error('Reauthorize error:', error)
    return NextResponse.json(
      { error: 'Failed to generate reauthorize URL' },
      { status: 500 }
    )
  }
}

