import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { PersonaService } from '@/backend/services/persona.service'

export const dynamic = 'force-dynamic'

/**
 * AI 페르소나 생성 API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const persona = await PersonaService.generatePersona(session.user.email)

    return NextResponse.json({ persona })
  } catch (error: any) {
    console.error('API error:', error)
    
    // OAuth 토큰 오류 감지
    if (error.message?.includes('invalid_grant') || 
        error.message?.includes('401') ||
        error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Google 권한이 만료되었거나 부족합니다. 다시 로그인해주세요.' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate persona' },
      { status: 500 }
    )
  }
}


