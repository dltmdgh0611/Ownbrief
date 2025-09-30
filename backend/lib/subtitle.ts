import { getVideoTranscriptWithApify } from './apify-transcript'

export interface SubtitleSegment {
  text: string
  duration: number
  offset: number
}

export async function getVideoTranscript(videoId: string): Promise<SubtitleSegment[]> {
  console.log(`🔍 동영상 자막 추출 시작: ${videoId}`)
  
  // Apify API 토큰이 없으면 오류
  if (!process.env.APIFY_API_TOKEN) {
    console.error('❌ Apify API 토큰이 없습니다. .env.local에 APIFY_API_TOKEN을 설정해주세요.')
    return []
  }

  // Apify만 사용
  console.log('🚀 Apify를 사용한 자막 추출 시도...')
  const apifyResult = await getVideoTranscriptWithApify(videoId)
  
  if (apifyResult.length > 0) {
    console.log(`✅ Apify 자막 추출 성공: ${apifyResult.length}개 세그먼트`)
    return apifyResult
  }
  
  console.log('❌ Apify 자막 추출 실패')
  return []
}

export function combineTranscripts(transcripts: SubtitleSegment[][]): string {
  const videoSummaries = []
  
  // 각 동영상별로 최대 30개 세그먼트만 추출 (중심부)
  for (let videoIndex = 0; videoIndex < transcripts.length; videoIndex++) {
    const videoSegments = transcripts[videoIndex]
    
    if (videoSegments.length === 0) continue
    
    // 중심부 세그먼트 선택 (최대 30개)
    let selectedSegments = videoSegments
    
    if (videoSegments.length > 30) {
      const startIndex = Math.floor((videoSegments.length - 30) / 2)
      selectedSegments = videoSegments.slice(startIndex, startIndex + 30)
    }
    
    // 세그먼트 텍스트 결합
    const videoText = selectedSegments
      .map(segment => segment.text.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    if (videoText.length > 0) {
      videoSummaries.push(`[동영상 ${videoIndex + 1}] ${videoText}`)
    }
  }
  
  const combinedText = videoSummaries.join('\n\n')
  console.log(`📝 자막 요약 결과: ${videoSummaries.length}개 동영상, ${combinedText.length}자`)
  console.log(`📊 세그먼트 통계: 총 ${transcripts.reduce((sum, t) => sum + t.length, 0)}개 → ${transcripts.reduce((sum, t) => sum + Math.min(t.length, 30), 0)}개`)
  
  return combinedText
}
