import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { BriefingService } from '@/backend/services/briefing.service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    console.log('🧪 트렌드 뉴스레터 생성 테스트 시작...')

    // generateTrendTopics 함수 호출
    const topics = await BriefingService.generateTrendTopics(session.user.email)

    console.log(`✅ 트렌드 주제 생성 완료: ${topics.length}개`)

    return NextResponse.json({
      success: true,
      topicCount: topics.length,
      topics: topics.map(t => ({
        keyword: t.keyword,
        newsLength: t.news.length,
        scriptLength: t.script.length,
        script: t.script,
        news: t.news
      }))
    })
  } catch (error: any) {
    console.error('❌ 트렌드 뉴스레터 생성 오류:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate trend newsletter'
    }, { status: 500 })
  }
}

