import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

/**
 * 사용자 계정 삭제 API
 * 모든 관련 데이터를 CASCADE로 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 사용자 삭제 (CASCADE로 관련 데이터 모두 삭제)
    await prisma.user.delete({
      where: { id: user.id },
    })

    console.log(`✅ User deleted: ${user.email}`)

    return NextResponse.json({ 
      message: 'Account deleted successfully',
      deletedUserId: user.id,
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
