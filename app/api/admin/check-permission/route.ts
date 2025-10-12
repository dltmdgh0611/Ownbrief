import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { UserService } from '@/backend/services/user.service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const isAdmin = await UserService.isAdmin(session.user.email)

    return NextResponse.json({
      isAdmin,
      userEmail: session.user.email
    })

  } catch (error: any) {
    console.error('관리자 권한 확인 오류:', error)
    return NextResponse.json(
      { error: error.message || '권한 확인에 실패했습니다.' },
      { status: 500 }
    )
  }
}
