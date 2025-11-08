import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * 직접 선택용 키워드 목록 반환
 */
export async function GET(request: NextRequest) {
  try {
    // 카테고리별 키워드 목록 (한국어)
    const keywords = [
      { id: 'seoul-news', label: '서울 지역 뉴스', color: 'green' },
      { id: 'kpop', label: '케이팝', color: 'yellow' },
      { id: 'ai-product', label: 'AI 제품 전략', color: 'red' },
      { id: 'film', label: '영화 분석 및 리뷰', color: 'purple' },
      { id: 'growth-hacking', label: '그로스 해킹', color: 'blue' },
      { id: 'literature', label: '문학', color: 'pink' },
      { id: 'ai-startups', label: 'AI 스타트업', color: 'orange' },
      { id: 'philosophy', label: '철학', color: 'purple' },
      { id: 'machine-learning', label: '머신러닝', color: 'blue' },
      { id: 'web-development', label: '웹 개발', color: 'green' },
      { id: 'data-science', label: '데이터 사이언스', color: 'cyan' },
      { id: 'blockchain', label: '블록체인 및 암호화폐', color: 'yellow' },
      { id: 'design', label: 'UI/UX 디자인', color: 'pink' },
      { id: 'marketing', label: '디지털 마케팅', color: 'orange' },
      { id: 'fitness', label: '피트니스 및 건강', color: 'red' },
      { id: 'gaming', label: '게임 및 e스포츠', color: 'purple' },
      { id: 'travel', label: '여행 및 라이프스타일', color: 'green' },
      { id: 'cooking', label: '요리 및 레시피', color: 'orange' },
      { id: 'music', label: '음악 및 콘서트', color: 'pink' },
      { id: 'investment', label: '주식 및 투자', color: 'blue' },
    ]

    return NextResponse.json({ keywords })
  } catch (error: any) {
    console.error('Get suggested keywords error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get keywords' },
      { status: 500 }
    )
  }
}


