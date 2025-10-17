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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userSettings = await UserService.getUserSettings(session.user.email)
    const persona = await PersonaService.getPersona(session.user.email)
    const isAdmin = await UserService.isAdmin(session.user.email)

    const settings = {
      interests: persona?.interests || [],
      isAdmin,
      referralCode: userSettings?.referralCode || null,
      referralCount: userSettings?.referralCount || 0
    }

    return NextResponse.json({ settings })
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