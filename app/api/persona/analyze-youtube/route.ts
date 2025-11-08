import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { YouTubeClient } from '@/backend/lib/youtube'
import { createGeminiClient } from '@/backend/lib/gemini'

export const dynamic = 'force-dynamic'

const genAI = createGeminiClient()

/**
 * 유튜브 플레이리스트 분석 API
 * 유튜브 데이터를 기반으로 관심사 키워드 추출
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 유튜브 데이터 분석
    const youtubeData = await YouTubeClient.analyzeInterestsFromPlaylists(session.user.email)
    
    if (!youtubeData || !youtubeData.interests || youtubeData.interests.length === 0) {
      return NextResponse.json({ 
        interests: [],
        message: 'No YouTube data available'
      })
    }

    // Gemini AI로 키워드 정제
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `
다음은 사용자의 유튜브 플레이리스트에서 추출한 관심사입니다:
${JSON.stringify(youtubeData.interests, null, 2)}

이를 바탕으로 다양한 카테고리의 10-15개 관심사 키워드를 추출하세요.

규칙:
- 간결한 한국어 키워드 (예: "주식 투자", "AI 스타트업", "힙합 음악악", "웹 개발", "머신러닝")
- 다양한 카테고리에서 골고루 추출
- 광고성 키워드, URL 제외
- 개수: 10-15개
- 반드시 한국어로만 출력

JSON 배열로만 출력:
["키워드1", "키워드2", ...]
`.trim()

    const result = await model.generateContent(prompt)
    const response = result.response.text()
    
    // JSON 추출
    const jsonMatch = response.match(/\[[\s\S]*?\]/)
    const jsonStr = jsonMatch ? jsonMatch[0] : '[]'
    
    const interests = JSON.parse(jsonStr)

    return NextResponse.json({ interests })
  } catch (error: any) {
    console.error('API error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to analyze YouTube data' },
      { status: 500 }
    )
  }
}


