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
    // Prepare Actor input (메모리 절약을 위해 설정 최적화)
    const input = {
      "urls": [
        `https://www.youtube.com/watch?v=${videoId}`
      ],
      "subtitle_langs": "ko, en",
      "max_concurrent": 1   // 동시 처리 수를 1로 제한
    }

    console.log(`🚀 Apify 액터 실행 시작: ${videoId}`)
    console.log(`📝 액터 입력:`, input)

    // Run the Actor and wait for it to finish (메모리 절약을 위한 옵션 추가)
    // 액터 ID 확인: DaRyPdjlAcZ95pQ7H (YouTube Transcript Scraper)
    console.log(`🎬 사용할 액터 ID: DaRyPdjlAcZ95pQ7H`)
    const run = await client.actor("DaRyPdjlAcZ95pQ7H").call(input, {
      memory: 8192,  // 1GB 메모리 제한
      timeout: 300   // 5분 타임아웃
    })
    console.log(`📊 액터 실행 완료: ${run.id}`)

    // Fetch Actor results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    console.log(`📝 액터 결과: ${items.length}개 항목`)
    console.log(`📝 액터 결과 구조:`, JSON.stringify(items[0], null, 2))

    if (items.length > 0) {
      const item = items[0]
      
      // subtitle_urls 필드 확인
      if (item.subtitle_urls) {
        console.log('✅ subtitle_urls 발견:', item.subtitle_urls)
        
        // 우선순위: 한국어 > 영어 > 기타
        const subtitleUrl = item.subtitle_urls.ko || item.subtitle_urls.en || Object.values(item.subtitle_urls)[0]
        
        if (subtitleUrl) {
          console.log('✅ 자막 URL 선택:', subtitleUrl)
          
          try {
            // 자막 URL에서 실제 자막 데이터 가져오기
            const subtitleResponse = await fetch(subtitleUrl)
            if (!subtitleResponse.ok) {
              console.error('❌ 자막 URL 요청 실패:', subtitleResponse.status)
              return []
            }
            
            const subtitleData = await subtitleResponse.text()
            console.log(`📝 자막 데이터 길이: ${subtitleData.length}자`)
            console.log(`📝 자막 데이터 미리보기:`, subtitleData.substring(0, 200) + '...')
            
            // 자막 데이터 파싱 (SRT 형식)
            const segments = parseSRTContent(subtitleData)
            console.log(`✅ Apify 자막 성공: ${segments.length}개 세그먼트`)
            return segments
            
          } catch (error) {
            console.error('❌ 자막 URL에서 데이터 가져오기 실패:', error)
            return []
          }
        } else {
          console.log('❌ subtitle_urls에 유효한 URL이 없음')
        }
      }
      
      // 기존 방식도 시도 (직접 자막 텍스트가 있는 경우)
      let transcriptData = null
      
      if (item.transcript) {
        transcriptData = item.transcript
        console.log('✅ transcript 필드에서 자막 발견')
      } else if (item.subtitles) {
        transcriptData = item.subtitles
        console.log('✅ subtitles 필드에서 자막 발견')
      } else if (item.captions) {
        transcriptData = item.captions
        console.log('✅ captions 필드에서 자막 발견')
      } else if (item.text) {
        transcriptData = item.text
        console.log('✅ text 필드에서 자막 발견')
      } else if (item.content) {
        transcriptData = item.content
        console.log('✅ content 필드에서 자막 발견')
      } else {
        // 모든 필드 확인
        console.log('🔍 사용 가능한 필드들:', Object.keys(item))
        
        // 문자열 필드들 찾기
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === 'string' && value.length > 100) {
            console.log(`🔍 긴 텍스트 필드 발견: ${key} (${value.length}자)`)
            transcriptData = value
            break
          }
        }
      }

      if (transcriptData) {
        // 자막 데이터 파싱 (SRT 형식)
        const segments = parseSRTContent(transcriptData)
        console.log(`✅ Apify 자막 성공: ${segments.length}개 세그먼트`)
        return segments
      }
    }

    console.log('❌ 액터 결과에서 자막을 찾을 수 없음')
    return []

  } catch (error) {
    console.error('❌ Apify 자막 추출 오류:', error)
    return []
  }
}

// SRT 형식 자막을 파싱하는 함수
function parseSRTContent(srtContent: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = []
  const lines = srtContent.split('\n')
  
  let currentSegment: any = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 번호 라인 (예: "1")
    if (/^\d+$/.test(line)) {
      if (currentSegment) {
        segments.push(currentSegment)
      }
      currentSegment = { text: '', duration: 0, offset: 0 }
    }
    // 시간 라인 (예: "00:00:00,120 --> 00:00:05,680")
    else if (line.includes('-->')) {
      if (currentSegment) {
        const timeMatch = line.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/)
        if (timeMatch) {
          currentSegment.offset = parseTimeToSeconds(timeMatch[1])
          const endTime = parseTimeToSeconds(timeMatch[2])
          currentSegment.duration = endTime - currentSegment.offset
        }
      }
    }
    // 텍스트 라인
    else if (line && currentSegment) {
      currentSegment.text += (currentSegment.text ? ' ' : '') + line
    }
  }
  
  // 마지막 세그먼트 추가
  if (currentSegment && currentSegment.text) {
    segments.push(currentSegment)
  }
  
  return segments
}

// 시간 문자열을 초로 변환하는 함수
function parseTimeToSeconds(timeStr: string): number {
  const [time, ms] = timeStr.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000
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
