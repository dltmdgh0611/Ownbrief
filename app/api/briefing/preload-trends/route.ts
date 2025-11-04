import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { BriefingService } from '@/backend/services/briefing.service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log(`🔨 [preload-trends] API 요청 시작`)
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.error(`❌ [preload-trends] 인증 실패: 세션 없음`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userEmail = session.user.email
    console.log(`📋 [preload-trends] 요청 파라미터: userEmail=${userEmail}`)

    // 키워드 생성 (실패해도 빈 배열로 저장하여 브리핑 계속 진행)
    try {
      console.log(`🔄 [preload-trends] 키워드 생성 시작: userEmail=${userEmail}`)
      await BriefingService.generateAndSaveTrendKeywords(userEmail)
      console.log(`✅ [preload-trends] 키워드 생성 완료: userEmail=${userEmail}`)
      return NextResponse.json({
        success: true,
        message: '트렌드 키워드 생성 완료'
      })
    } catch (error: any) {
      // 키워드 생성 실패해도 브리핑은 계속 진행되도록 성공으로 반환
      console.error(`❌ [preload-trends] 키워드 생성 오류 (계속 진행): userEmail=${userEmail}`)
      console.error(`   오류 타입: ${error.constructor.name}`)
      console.error(`   오류 메시지: ${error.message}`)
      console.error(`   오류 스택:`, error.stack)
      return NextResponse.json({
        success: true,
        message: '트렌드 키워드 생성 실패 (빈 배열로 저장됨)',
        warning: error.message || 'Failed to preload trends'
      })
    }
  } catch (error: any) {
    console.error(`❌ [preload-trends] API 전체 오류`)
    console.error(`   오류 타입: ${error.constructor.name}`)
    console.error(`   오류 메시지: ${error.message}`)
    console.error(`   오류 스택:`, error.stack)
    // 인증 오류 등 심각한 오류만 500 반환
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to preload trends'
    }, { status: 500 })
  }
}

