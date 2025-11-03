/**
 * Pre-registration API Endpoint
 * POST /api/user/pre-register - Register user for paid plan pre-registration
 * GET /api/user/pre-register - Check pre-registration status
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userSettings: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      preRegistered: user.userSettings?.preRegistered || false,
      preRegisteredAt: user.userSettings?.preRegisteredAt || null
    })
  } catch (error) {
    console.error('Error checking pre-registration status:', error)
    return NextResponse.json(
      { error: 'Failed to check pre-registration status' },
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userSettings: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // UserSettings가 없으면 생성
    if (!user.userSettings) {
      await prisma.userSettings.create({
        data: {
          userId: user.id,
          preRegistered: true,
          preRegisteredAt: new Date()
        }
      })
    } else {
      // 이미 UserSettings가 있으면 업데이트
      await prisma.userSettings.update({
        where: { userId: user.id },
        data: {
          preRegistered: true,
          preRegisteredAt: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: '사전등록이 완료되었습니다!',
      preRegistered: true,
      preRegisteredAt: new Date()
    })
  } catch (error: any) {
    console.error('Error pre-registering user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to pre-register user' },
      { status: 500 }
    )
  }
}
