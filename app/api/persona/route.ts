import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { PersonaService } from '@/backend/services/persona.service'

/**
 * 페르소나 조회 및 업데이트 API
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const persona = await PersonaService.getPersona(session.user.email)

    // 페르소나가 없어도 에러가 아님 (온보딩 전 상태)
    return NextResponse.json({ persona })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to get persona' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    // 추후 구현: 페르소나 직접 수정
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to update persona' },
      { status: 500 }
    )
  }
}



