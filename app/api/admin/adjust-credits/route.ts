import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { UserService } from '@/backend/services/user.service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const { targetEmail, credits } = await request.json()

    if (!targetEmail || credits === undefined) {
      return NextResponse.json(
        { error: 'targetEmail과 credits가 필요합니다.' },
        { status: 400 }
      )
    }

    const isAdmin = await UserService.isAdmin(session.user.email)
    if (!isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const newCredits = await UserService.adjustCredits(
      session.user.email,
      targetEmail,
      credits
    )

    console.log(`🔧 관리자 ${session.user.email}가 ${targetEmail}의 크레딧을 ${credits}로 조정`)

    return NextResponse.json({
      success: true,
      targetEmail,
      credits: newCredits,
      message: '크레딧이 성공적으로 조정되었습니다.'
    })

  } catch (error: any) {
    console.error('크레딧 조정 오류:', error)
    return NextResponse.json(
      { error: error.message || '크레딧 조정에 실패했습니다.' },
      { status: 500 }
    )
  }
}
