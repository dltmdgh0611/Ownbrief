/**
 * User Settings API Endpoint
 * GET /api/user/settings - Fetch user settings
 * POST /api/user/settings - Save user settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { UserService } from '@/backend/services/user.service'
import { PersonaService } from '@/backend/services/persona.service'
import { prisma } from '@/backend/lib/prisma'
import { refreshConnectedServiceTokens } from '@/backend/lib/token-refresh'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 설정 탭에 들어올 때 만료된 토큰 자동 갱신
    console.log('🔄 연결된 서비스 토큰 확인 및 갱신 시작...')
    await refreshConnectedServiceTokens(session.user.email)

    const userSettings = await UserService.getUserSettings(session.user.email)
    const persona = await PersonaService.getPersona(session.user.email)
    // const isAdmin = await UserService.isAdmin(session.user.email) // 임시로 주석 처리

    // 연결된 서비스 정보 가져오기 (갱신 후)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        connectedServices: {
          select: {
            id: true,
            serviceName: true,
            accessToken: true,
            expiresAt: true,
            enabled: true, // 토큰 갱신 상태 확인용
            metadata: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    })

    const settings = {
      interests: persona?.interests || [],
      isAdmin: false, // 임시로 false 설정
      referralCode: null, // 데이터베이스에 없으므로 null
      referralCount: 0, // 데이터베이스에 없으므로 0
      connectedServices: user?.connectedServices || []
    }

    return NextResponse.json({ 
      settings, 
      connectedServices: user?.connectedServices || [] 
    })
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { interests } = await request.json()

    // 피드백 제출 (PersonaService를 통해)
    await PersonaService.submitFeedback(session.user.email, { interests })

    const persona = await PersonaService.getPersona(session.user.email)

    return NextResponse.json({
      success: true,
      message: 'Settings saved',
      settings: {
        interests: persona?.interests || []
      }
    })
  } catch (error: any) {
    console.error('Error saving user settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save user settings' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { serviceName } = await request.json()

    if (!serviceName) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 })
    }

    // 연결된 서비스 삭제
    await prisma.connectedService.deleteMany({
      where: {
        user: {
          email: session.user.email
        },
        serviceName: serviceName
      }
    })

    return NextResponse.json({
      success: true,
      message: `${serviceName} 연동이 해제되었습니다.`
    })
  } catch (error: any) {
    console.error('Error disconnecting service:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect service' },
      { status: 500 }
    )
  }
}