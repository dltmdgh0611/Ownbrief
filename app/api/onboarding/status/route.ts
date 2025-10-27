import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * 온보딩 상태 확인 API (페르소나 기반)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userPersona: true,
      },
    })

    if (!user) {
      return NextResponse.json({
        isNewUser: true,
        needsOnboarding: true,
        personaConfirmed: false,
      })
    }

    const needsOnboarding = !user.userPersona || !user.userPersona.confirmed

    return NextResponse.json({
      isNewUser: false,
      needsOnboarding,
      personaConfirmed: user.userPersona?.confirmed || false,
    })
  } catch (error) {
    console.error('Onboarding status error:', error)
    return NextResponse.json(
      { error: 'Failed to get onboarding status' },
      { status: 500 }
    )
  }
}

