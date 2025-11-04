import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { BriefingService } from '@/backend/services/briefing.service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 키워드 생성 (실패해도 빈 배열로 저장하여 브리핑 계속 진행)
    try {
      await BriefingService.generateAndSaveTrendKeywords(session.user.email)
      return NextResponse.json({
        success: true,
        message: '트렌드 키워드 생성 완료'
      })
    } catch (error: any) {
      // 키워드 생성 실패해도 브리핑은 계속 진행되도록 성공으로 반환
      console.error('Preload trends error (계속 진행):', error)
      return NextResponse.json({
        success: true,
        message: '트렌드 키워드 생성 실패 (빈 배열로 저장됨)',
        warning: error.message || 'Failed to preload trends'
      })
    }
  } catch (error: any) {
    console.error('Preload trends API error:', error)
    // 인증 오류 등 심각한 오류만 500 반환
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to preload trends'
    }, { status: 500 })
  }
}

