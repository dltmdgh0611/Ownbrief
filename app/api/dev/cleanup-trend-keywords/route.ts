import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/backend/lib/prisma'

/**
 * 만료된 트렌드 키워드 삭제 (매일 한 번 실행)
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date()

    // 만료된 키워드 삭제 (Prisma 쿼리로 변경)
    const result = await prisma.dailyTrendKeywords.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    })

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `${result.count}개의 만료된 키워드가 삭제되었습니다.`
    })
  } catch (error: any) {
    console.error('Cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cleanup keywords'
    }, { status: 500 })
  }
}

