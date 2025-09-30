import { ApifyClient } from 'apify-client'

export interface SubtitleSegment {
  text: string
  duration: number
  offset: number
}

// Initialize the ApifyClient with API token
const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN!,
})

export async function getVideoTranscriptWithApify(videoId: string): Promise<SubtitleSegment[]> {
  console.log(`🔍 Apify로 동영상 자막 추출 시작: ${videoId}`)
  
  try {
    // Prepare Actor input (실제 액터 입력 형식)
    const input = {
      "searchQueries": [],
      "maxResults": 0,
      "maxResultsShorts": 0,
      "maxResultStreams": 0,
      "startUrls": [
        {
          "url": `https://www.youtube.com/watch?v=${videoId}`
        }
      ],
      "subtitlesLanguage": "ko",
      "subtitlesFormat": "plaintext"
    }

    console.log(`🚀 Apify 액터 실행 시작: ${videoId}`)
    console.log(`📝 액터 입력:`, input)

    // Run the Actor and wait for it to finish
    // 액터 ID: h7sDV53CddomktSi5 (Youtube Subtitles Pro)
    console.log(`🎬 사용할 액터 ID: h7sDV53CddomktSi5`)
    const run = await client.actor("h7sDV53CddomktSi5").call(input, {
      memory: 8192,  // 8GB 메모리 제한
      timeout: 300   // 5분 타임아웃
    })
    console.log(`📊 액터 실행 완료: ${run.id}`)

    // Fetch Actor results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    console.log(`📝 액터 결과: ${items.length}개 항목`)
    console.log(`📝 액터 결과 구조:`, JSON.stringify(items[0], null, 2))

    if (items.length > 0) {
      const item = items[0]
      
      // Plaintext 형식 출력:
      // {
      //   "text": "전체 자막 텍스트...",
      //   ...기타 메타데이터
      // }
      
      if (item.text && typeof item.text === 'string') {
        console.log(`✅ text 필드 발견: ${item.text.length}자`)
        console.log(`📝 텍스트 미리보기:`, item.text.substring(0, 200) + '...')
        
        // plaintext를 문장 단위로 분할하여 세그먼트 생성
        const segments = parsePlaintextToSegments(item.text)
        
        console.log(`✅ Apify 자막 성공: ${segments.length}개 세그먼트`)
        console.log(`📊 첫 번째 세그먼트:`, segments[0])
        return segments
      }
      
      console.log('❌ text 필드를 찾을 수 없음')
      console.log('🔍 사용 가능한 필드들:', Object.keys(item))
      console.log('🔍 item 전체 내용:', item)
    }

    console.log('❌ 액터 결과에서 자막을 찾을 수 없음')
    return []

  } catch (error) {
    console.error('❌ Apify 자막 추출 오류:', error)
    return []
  }
}

// Plaintext를 세그먼트로 변환하는 함수
function parsePlaintextToSegments(text: string): SubtitleSegment[] {
  // 문장 단위로 분할 (마침표, 느낌표, 물음표 기준)
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  console.log(`📝 plaintext를 ${sentences.length}개 문장으로 분할`)
  
  // 각 문장을 세그먼트로 변환 (타임스탬프 정보 없으므로 순차적으로 할당)
  const segments: SubtitleSegment[] = []
  let currentOffset = 0
  
  for (const sentence of sentences) {
    // 문장 길이에 따라 대략적인 duration 계산 (글자당 0.1초 가정)
    const estimatedDuration = Math.max(2, sentence.length * 0.1)
    
    segments.push({
      text: sentence,
      duration: estimatedDuration,
      offset: currentOffset
    })
    
    currentOffset += estimatedDuration
  }
  
  return segments
}

// 기존 함수와 호환성을 위한 래퍼 함수
export async function getVideoTranscript(videoId: string): Promise<SubtitleSegment[]> {
  // Apify API 토큰이 있으면 Apify 사용, 없으면 기존 방법 사용
  if (process.env.APIFY_API_TOKEN) {
    return await getVideoTranscriptWithApify(videoId)
  } else {
    console.log('⚠️ Apify API 토큰이 없음, 기존 방법 사용')
    // 기존 방법으로 폴백 (필요시 구현)
    return []
  }
}
