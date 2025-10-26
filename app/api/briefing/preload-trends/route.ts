import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { BriefingService } from '@/backend/services/briefing.service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 백그라운드로 키워드 생성 (비동기)
    BriefingService.generateAndSaveTrendKeywords(session.user.email)
      .catch(error => {
        console.error('❌ 백그라운드 키워드 생성 오류:', error)
      })

    return NextResponse.json({
      success: true,
      message: '트렌드 키워드 생성을 시작했습니다.'
    })
  } catch (error: any) {
    console.error('Preload trends error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to preload trends'
    }, { status: 500 })
  }
}

