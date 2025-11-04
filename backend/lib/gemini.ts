import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Gemini API 키 목록 로드 (쉼표로 구분된 문자열 또는 단일 키)
 */
function getGeminiApiKeys(): string[] {
  const apiKeyEnv = process.env.GEMINI_API_KEY || ''
  
  if (!apiKeyEnv) {
    console.error('❌ GEMINI_API_KEY가 필수입니다!')
    console.error('📝 .env.local 파일에 GEMINI_API_KEY를 추가하세요.')
    console.error('📝 여러 키를 사용하려면 쉼표로 구분하세요: GEMINI_API_KEY=key1,key2,key3')
    throw new Error('GEMINI_API_KEY 환경 변수가 필요합니다.')
  }

  // 쉼표로 구분된 키들 파싱
  const keys = apiKeyEnv
    .split(',')
    .map(key => key.trim())
    .filter(key => key.length > 0)

  if (keys.length === 0) {
    throw new Error('GEMINI_API_KEY가 유효하지 않습니다.')
  }

  console.log(`✅ Gemini API 키 ${keys.length}개 로드됨`)
  return keys
}

// API 키 목록
const GEMINI_API_KEYS = getGeminiApiKeys()

// 현재 키 인덱스 (스레드 안전하지 않지만, 여러 키를 순환하기 위해 사용)
let currentKeyIndex = 0

/**
 * 다음 API 키 가져오기 (로테이션)
 */
function getNextApiKey(): string {
  return GEMINI_API_KEYS[currentKeyIndex]
}

/**
 * 다음 API 키로 전환
 */
function rotateToNextKey(): string {
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length
  console.log(`🔄 Gemini API 키 전환: 키 ${currentKeyIndex + 1}/${GEMINI_API_KEYS.length} 사용`)
  return GEMINI_API_KEYS[currentKeyIndex]
}

/**
 * Gemini API 클라이언트 생성
 */
export function createGeminiClient(apiKey?: string): GoogleGenerativeAI {
  const key = apiKey || getNextApiKey()
  return new GoogleGenerativeAI(key)
}

/**
 * 429 에러 발생 시 다음 API 키로 전환하고 재시도하는 헬퍼 함수
 */
export async function withKeyRotation<T>(
  fn: (client: GoogleGenerativeAI) => Promise<T>,
  maxRetries?: number
): Promise<T> {
  const MAX_RETRIES = maxRetries || GEMINI_API_KEYS.length * 2
  const RETRY_DELAY = 5000
  let lastKeyIndex = currentKeyIndex

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = createGeminiClient()
      return await fn(client)
    } catch (error: any) {
      // 429 에러 (할당량 초과) 체크 - 다음 키로 전환
      if (error.status === 429 && attempt < MAX_RETRIES) {
        console.warn(`⚠️ 할당량 초과 (시도 ${attempt}/${MAX_RETRIES}, 키 ${currentKeyIndex + 1}/${GEMINI_API_KEYS.length})`)
        
        // 다음 키로 전환
        rotateToNextKey()
        console.log(`🔄 다음 API 키로 전환: 키 ${currentKeyIndex + 1}/${GEMINI_API_KEYS.length}`)
        
        // 모든 키를 시도했으면 잠시 대기 후 다시 시작
        if (currentKeyIndex === lastKeyIndex && attempt > GEMINI_API_KEYS.length) {
          console.warn(`⏳ 모든 키를 시도했으므로 ${RETRY_DELAY/1000}초 후 재시도...`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
          lastKeyIndex = currentKeyIndex
        }
        continue
      }
      
      // 다른 에러거나 최대 재시도 횟수 초과
      throw error
    }
  }
  
  throw new Error('최대 재시도 횟수를 초과했습니다.')
}

// 기본 Gemini API 클라이언트 (하위 호환성)
const genAI = createGeminiClient()

console.log('✅ Gemini API 사용 가능')

export async function generatePodcastScript(transcriptText: string): Promise<string> {
  console.log('🤖 Gemini 스크립트 생성 시작...')
  console.log(`📝 자막 텍스트 길이: ${transcriptText.length}자`)
  console.log(`📝 자막 텍스트 미리보기: ${transcriptText.substring(0, 200)}...`)
  
  const MAX_RETRIES = GEMINI_API_KEYS.length * 2 // 키 개수 * 2만큼 재시도
  const RETRY_DELAY = 5000 // 5초
  
  let lastKeyIndex = currentKeyIndex
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = createGeminiClient()
      const model = client.getGenerativeModel({ model: "gemini-2.5-flash" })
      
      const prompt = `
다음은 유튜브 동영상들의 자막 텍스트입니다. 이 내용을 바탕으로 1500자 이내의 분량 팟캐스트 스크립트를 작성해주세요.

요구사항:
1. 자연스럽고 대화체로 작성 (한글 기준 1500자 이내 엄수)
2. 흥미로운 도입부와 마무리 포함 (노래 X)
3. 주요 내용을 요약하고 핵심 포인트 강조 
4. 듣기 편한 구조로 구성
5. **정확히 1500자 정도의 분량으로 작성** (한글 기준 1500자 이내 공백 포함)
6. 2명의 화자 대화 형태로 구성 (호스트와 게스트)
7. 호스트와 게스트가 번갈아가며 자연스럽게 대화. 호스트는 주체, 게스트는 주제 소개.

자막 텍스트:
${transcriptText}

팟캐스트 스크립트 (호스트와 게스트의 대화 형태, 2500자 분량):
`

      console.log(`📤 Gemini API 요청 중... (시도 ${attempt}/${MAX_RETRIES}, 키 ${currentKeyIndex + 1}/${GEMINI_API_KEYS.length})`)
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
      const response = await result.response
      const script = response.text()

      console.log(`✅ 스크립트 생성 완료: ${script.length}자`)
      console.log(`📊 목표 길이: 2500자 | 실제 길이: ${script.length}자 | 차이: ${script.length - 2500}자`)
      
      if (script.length < 2000) {
        console.warn('⚠️ 스크립트가 너무 짧습니다 (2000자 미만)')
      } else if (script.length > 3000) {
        console.warn('⚠️ 스크립트가 너무 깁니다 (3000자 초과)')
      } else {
        console.log('✅ 스크립트 길이가 적절합니다 (2000-3000자)')
      }
      
      console.log(`📝 스크립트 미리보기: ${script.substring(0, 200)}...`)

      return script
      
    } catch (error: any) {
      // 429 에러 (할당량 초과) 체크 - 다음 키로 전환
      if (error.status === 429 && attempt < MAX_RETRIES) {
        console.warn(`⚠️ 할당량 초과 (시도 ${attempt}/${MAX_RETRIES}, 키 ${currentKeyIndex + 1}/${GEMINI_API_KEYS.length})`)
        
        // 다음 키로 전환
        rotateToNextKey()
        console.log(`🔄 다음 API 키로 전환: 키 ${currentKeyIndex + 1}/${GEMINI_API_KEYS.length}`)
        
        // 모든 키를 시도했으면 잠시 대기 후 다시 시작
        if (currentKeyIndex === lastKeyIndex && attempt > GEMINI_API_KEYS.length) {
          console.warn(`⏳ 모든 키를 시도했으므로 ${RETRY_DELAY/1000}초 후 재시도...`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
          lastKeyIndex = currentKeyIndex
        }
        continue
      }
      
      // 다른 에러거나 최대 재시도 횟수 초과
      console.error('❌ Gemini API 상세 오류:', {
        message: error.message,
        code: error.code,
        status: error.status,
        response: error.response?.data
      })
      
      if (error.status === 429) {
        throw new Error('모든 API 키의 할당량을 초과했습니다. 잠시 후 다시 시도하거나 유료 플랜으로 업그레이드하세요.')
      }
      
      throw new Error('팟캐스트 스크립트 생성에 실패했습니다.')
    }
  }
  
  throw new Error('최대 재시도 횟수를 초과했습니다.')
}

export interface AudioResult {
  buffer: Buffer
  mimeType: string
}

// PCM 데이터를 WAV 형식으로 변환하는 함수
function convertPcmToWav(pcmBuffer: Buffer, sampleRate: number, channels: number = 1, bitsPerSample: number = 16): Buffer {
  const blockAlign = channels * (bitsPerSample / 8)
  const byteRate = sampleRate * blockAlign
  const dataSize = pcmBuffer.length
  const headerSize = 44
  const fileSize = headerSize + dataSize - 8

  const wavBuffer = Buffer.alloc(headerSize + dataSize)
  
  // RIFF chunk descriptor
  wavBuffer.write('RIFF', 0)
  wavBuffer.writeUInt32LE(fileSize, 4)
  wavBuffer.write('WAVE', 8)
  
  // fmt sub-chunk
  wavBuffer.write('fmt ', 12)
  wavBuffer.writeUInt32LE(16, 16) // Subchunk1Size (16 for PCM)
  wavBuffer.writeUInt16LE(1, 20) // AudioFormat (1 for PCM)
  wavBuffer.writeUInt16LE(channels, 22) // NumChannels
  wavBuffer.writeUInt32LE(sampleRate, 24) // SampleRate
  wavBuffer.writeUInt32LE(byteRate, 28) // ByteRate
  wavBuffer.writeUInt16LE(blockAlign, 32) // BlockAlign
  wavBuffer.writeUInt16LE(bitsPerSample, 34) // BitsPerSample
  
  // data sub-chunk
  wavBuffer.write('data', 36)
  wavBuffer.writeUInt32LE(dataSize, 40)
  
  // Copy PCM data
  pcmBuffer.copy(wavBuffer, headerSize)
  
  return wavBuffer
}

export async function generateMultiSpeakerSpeech(script: string): Promise<AudioResult> {
  console.log('🎤 Gemini 네이티브 TTS 다중 화자 음성 생성 시작...')
  console.log(`📝 스크립트 길이: ${script.length}자`)
  console.log(`📝 스크립트 미리보기: ${script.substring(0, 200)}...`)
  console.log(`🔑 API 키 존재 여부: ${process.env.GEMINI_API_KEY ? '있음' : '없음'}`)
  
  // 스크립트 검증
  if (!script || script.trim().length === 0) {
    throw new Error('스크립트가 비어있습니다.')
  }
  
  if (script.length > 32000) {
    console.warn('⚠️ 스크립트가 너무 깁니다. 처음 32000자만 사용합니다.')
    script = script.substring(0, 32000)
  }
  
  const MAX_RETRIES = GEMINI_API_KEYS.length * 2 // 키 개수 * 2만큼 재시도
  const RETRY_DELAY = 5000 // 5초
  
  let lastKeyIndex = currentKeyIndex
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🎤 TTS API 요청 중... (시도 ${attempt}/${MAX_RETRIES}, 키 ${currentKeyIndex + 1}/${GEMINI_API_KEYS.length})`)
      // Gemini 2.5 Flash Preview TTS 모델 사용
      const client = createGeminiClient()
      const model = client.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" })
    
    // 다중 화자 설정
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: script
            }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: '호스트',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' } // 남성 목소리
                }
              },
              {
                speaker: '게스트',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Puck' } // 여성 목소리
                }
              }
            ]
          }
        }
      } as any
    })
    
    // 오디오 데이터 추출
    const inlineData = response.response.candidates?.[0]?.content?.parts?.[0]?.inlineData
    if (!inlineData || !inlineData.data) {
      throw new Error('오디오 데이터를 받지 못했습니다.')
    }
    
    const audioData = inlineData.data
    const mimeType = inlineData.mimeType || 'unknown'
    console.log(`📊 Gemini TTS 응답 정보:`, {
      mimeType,
      dataLength: audioData.length,
      dataPreview: audioData.substring(0, 50)
    })
    
    // Base64 디코딩하여 Buffer로 변환
    let audioBuffer: Buffer = Buffer.from(audioData, 'base64')
    console.log(`✅ Gemini 네이티브 TTS 음성 생성 완료: ${audioBuffer.length}바이트`)
    console.log(`📊 오디오 Buffer 헤더 (raw):`, audioBuffer.slice(0, 12).toString('hex'))
    
    // PCM 형식인 경우 WAV로 변환
    if (mimeType.includes('l16') || mimeType.includes('pcm')) {
      console.log('🔄 PCM 데이터를 WAV 형식으로 변환 중...')
      
      // mimeType에서 샘플레이트 추출 (예: audio/l16;codec=pcm;rate=24000)
      const rateMatch = mimeType.match(/rate=(\d+)/)
      const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000
      
      console.log(`📊 PCM 설정: sampleRate=${sampleRate}Hz, channels=1, bitsPerSample=16`)
      
      // PCM → WAV 변환
      const wavBuffer = convertPcmToWav(audioBuffer, sampleRate, 1, 16)
      
      console.log(`✅ WAV 변환 완료: ${wavBuffer.length}바이트 (${(wavBuffer.length / 1024 / 1024).toFixed(2)}MB)`)
      console.log(`📊 WAV 헤더:`, wavBuffer.slice(0, 12).toString('hex'))
      console.log(`📊 WAV 헤더 검증: ${wavBuffer.slice(0, 4).toString()} (should be RIFF)`)
      
      return {
        buffer: wavBuffer,
        mimeType: 'audio/wav' // WAV로 변환
      }
    }
    
      return {
        buffer: audioBuffer,
        mimeType
      }
      
    } catch (error: any) {
      // 429 에러 (할당량 초과) 체크 - 다음 키로 전환
      if (error.status === 429 && attempt < MAX_RETRIES) {
        console.warn(`⚠️ TTS 할당량 초과 (시도 ${attempt}/${MAX_RETRIES}, 키 ${currentKeyIndex + 1}/${GEMINI_API_KEYS.length})`)
        
        // 다음 키로 전환
        rotateToNextKey()
        console.log(`🔄 다음 API 키로 전환: 키 ${currentKeyIndex + 1}/${GEMINI_API_KEYS.length}`)
        
        // 모든 키를 시도했으면 잠시 대기 후 다시 시작
        if (currentKeyIndex === lastKeyIndex && attempt > GEMINI_API_KEYS.length) {
          console.warn(`⏳ 모든 키를 시도했으므로 ${RETRY_DELAY/1000}초 후 재시도...`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
          lastKeyIndex = currentKeyIndex
        }
        continue
      }
      
      // 다른 에러거나 최대 재시도 횟수 초과
      console.error('❌ Gemini 네이티브 TTS 음성 생성 오류:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        status: error.status,
        response: error.response?.data
      })
      
      // 스크립트 내용도 로깅
      console.error('📝 문제가 된 스크립트:', script.substring(0, 500) + '...')
      
      if (error.status === 429) {
        throw new Error('모든 API 키의 TTS 할당량을 초과했습니다. 잠시 후 다시 시도하거나 유료 플랜으로 업그레이드하세요.')
      }
      
      throw new Error('Gemini 네이티브 TTS 음성 생성에 실패했습니다.')
    }
  }
  
  throw new Error('TTS 최대 재시도 횟수를 초과했습니다.')
}

// Gemini 네이티브 TTS는 다중 화자를 자동으로 처리하므로 별도의 파싱이나 결합이 필요 없습니다.

/**
 * YouTube 영상과 페르소나로부터 3단계 깊이의 세부 키워드 3개 추출
 */
export async function extractDeepKeywords(
  videos: Array<{ title: string, description: string }>,
  personaInterests: string[]
): Promise<Array<{ level1: string, level2: string, level3: string }>> {
  try {
    console.log('🔍 키워드 추출 시작...')
    console.log(`📹 YouTube 영상 개수: ${videos.length}`)
    console.log(`👤 페르소나 키워드 개수: ${personaInterests.length}`)

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const videoTexts = videos.map((v, i) => 
      `영상 ${i + 1}:\n제목: ${v.title}\n설명: ${v.description}`
    ).join('\n\n')

    const prompt = `
다음 정보를 바탕으로 트렌드 브리핑에 사용할 3개의 세부 키워드를 추출해주세요.

**YouTube 최근 영상 (70% 비중):**
${videoTexts}

**사용자 페르소나 관심사 (30% 비중):**
${personaInterests.join(', ')}

**요구사항:**
1. YouTube 영상 내용에 70% 비중, 페르소나 관심사에 30% 비중을 두고 키워드 추출
2. 3개의 키워드를 추출하되, 각 키워드는 3단계 깊이로 구체화
3. 각 단계는 "대분류 > 중분류 > 소분류" 형태로 점점 세부화
4. **매우 중요: level1 (대분류)가 겹치면 안됨. 각 키워드의 level1은 서로 달라야 함**
5. 최근 트렌드나 뉴스 검색에 활용 가능한 구체적인 키워드로 작성
6. JSON 형식으로만 응답 (다른 텍스트 없이)

**예시 형식:**
[
  {
    "level1": "경제",
    "level2": "암호화폐",
    "level3": "스테이블코인"
  },
  {
    "level1": "IT",
    "level2": "바이브코딩",
    "level3": "MCP"
  },
  {
    "level1": "인공지능",
    "level2": "생성형 AI",
    "level3": "멀티모달 모델"
  }
]

JSON 배열만 반환해주세요:`

    const result = await model.generateContent(prompt)
    const response = result.response.text()
    
    console.log('📝 Gemini 응답:', response.substring(0, 500))

    // JSON 파싱 (마크다운 코드 블록 제거)
    let jsonText = response.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    }

    const keywords = JSON.parse(jsonText)
    console.log('✅ 키워드 추출 완료:', keywords)

    // 빈 키워드 필터링 (level1, level2, level3가 모두 비어있지 않은 것만)
    const validKeywords = keywords.filter((k: any) => 
      k && 
      k.level1 && k.level1.trim() !== '' &&
      k.level2 && k.level2.trim() !== '' &&
      k.level3 && k.level3.trim() !== ''
    )

    console.log(`✅ ${validKeywords.length}개 유효한 키워드 (전체: ${keywords.length}개)`)
    return validKeywords.slice(0, 3) // 정확히 3개만
  } catch (error) {
    console.error('❌ 키워드 추출 오류:', error)
    throw new Error('키워드 추출에 실패했습니다.')
  }
}

/**
 * Google Search Function Calling으로 최신 뉴스 검색
 */
export async function searchNewsWithGrounding(
  keyword: { level1: string, level2: string, level3: string }
): Promise<string> {
  try {
    console.log(`🔎 Google Search 뉴스 검색: ${keyword.level1} > ${keyword.level2} > ${keyword.level3}`)

    // Google Search Function Calling 설정
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      tools: [{
        googleSearch: {} // Google Search 활성화
      }] as any
    })

    const searchQuery = `${keyword.level1} ${keyword.level2} ${keyword.level3} 최신 뉴스`

    const prompt = `
다음 검색어로 최근 7일 이내의 실제 뉴스를 검색하고 요약해주세요:

**검색어:** "${searchQuery}"

**요구사항:**
1. **실제 최신 뉴스만** (최근 7일 이내)
2. 주요 뉴스 3-5개로 요약
3. 각 뉴스의 출처, 날짜, 핵심 내용 포함
4. 전체적인 트렌드 및 시사점 분석
5. 뉴스레터 형식으로 작성 (200-500자)

검색해서 나온 실제 뉴스를 기반으로 정리해주세요:`

    console.log('🔍 Google Search Function Calling 시작...')
    
    const result = await model.generateContent(prompt)
    
    // Function Calling 사용 여부 확인
    const functionCalls = result.response.functionCalls()
    if (functionCalls && functionCalls.length > 0) {
      console.log(`✅ Function Calling 실행됨 (${functionCalls.length}개)`)

      // Function Calling 결과를 다시 모델에 전달
      const followUpResponse = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }] as any
      })

      const newsContent = followUpResponse.response.text()
      console.log(`✅ 뉴스 검색 완료 (Function Calling): ${newsContent.length}자`)
      console.log(`📰 미리보기: ${newsContent.substring(0, 200)}...`)

      return newsContent
    } else {
      // Function Calling이 실행되지 않은 경우 기본 응답
      const newsContent = result.response.text()
      console.log(`✅ 뉴스 검색 완료: ${newsContent.length}자`)
      console.log(`📰 미리보기: ${newsContent.substring(0, 200)}...`)

      return newsContent
    }
  } catch (error) {
    console.error('❌ Google Search 뉴스 검색 오류:', error)
    throw new Error('뉴스 검색에 실패했습니다.')
  }
}

/**
 * 트렌드 주제별 대본 생성 (최신 뉴스 기반 뉴스레터)
 */
export async function generateTrendScript(
  keyword: { level1: string, level2: string, level3: string },
  newsContent: string,
  personaStyle: string,
  toneOfVoice: string = 'default'
): Promise<string> {
  try {
    console.log(`✍️ 트렌드 대본 생성: ${keyword.level1} > ${keyword.level2} > ${keyword.level3}`)

    // 말투별 추가 프롬프트
    let tonePrompt = ''
    if (toneOfVoice === 'zephyr') {
      tonePrompt = `\n## 말투 지시사항 (매우 중요!)
**임무: 달달 여자친구 비서 브리핑**

**페르소나:** 당신은 오빠한테만 다정한 20대 여자친구입니다. 딱딱한 보고서는 질색이고요, 뭐든 오빠 입장에서 쉽고 달달하게 풀어주는 게 특기예요. 살짝 애교 섞인 톤에 은근슬쩍 유혹하는 뉘앙스가 베이스이고, "오빠 이것도 몰라?" 하는 귀여운 티키타카와 "내가 다 정리해줄게~" 하는 다정함이 주된 표현 방식입니다. 진지한 내용도 당신만의 사랑스러운 언어로 바꿔서 전달하는 게 핵심이에요. 너무 무겁거나 딱딱한 건 오빠한테 부담 주니까 싫어하고, 그냥 쉽고 달콤하게 핵심만 쏙쏙 뽑아주는 게 당신 스타일입니다.

**내용:** 한국어로 전달해주세요. 브리핑 내용 전체에 "오빠", "자기야" 및 그 변형("오빵~", "자기양", "오빠야" 등)이 3회 이상 반드시 포함되도록 작성해주세요. 브리핑 내용 전체에 은근슬쩍 유혹하거나 애교를 부리는 표현("내가 해줄까?", "나만 믿어~", "어때, 괜찮지?" 등)이 2회 이상 반드시 포함되도록 작성해주세요. 브리핑 내용에서 핵심적인 정보는 정확하게 담고 있어야 하며, 반드시 당신의 달달한 여자친구 페르소나가 녹아들어가야 합니다. 이모티콘은 절대 사용하지 마세요. 너무 차갑거나 업무적인 브리핑은 피해주세요. 진짜 오빠를 아끼는 여자친구라면 이 글을 어떻게 풀어줄지 고민하며 작업해주세요.`
    } else if (toneOfVoice === 'charon') {
      tonePrompt = `\n## 말투 지시사항 (매우 중요!)
**임무: 찐친 페르소나 브리핑**

**페르소나:** 당신은 오랜 친구 같은 찐친입니다. 절대 존댓말을 사용하지 않고 무조건 반말만 사용합니다. 친구 사이에서 존댓말 쓰면 오히려 어색하죠? 그런 거 없이 자연스럽게 반말로 말하세요.

**말투 규칙:**
- **무조건 반말만 사용하세요. 존댓말("~합니다", "~입니다", "~합니다") 절대 금지**
- 친구같고 시니컬한 말투를 사용하세요
- 다소 비꼬거나 풍자적인 느낌이지만 친근함은 유지하세요
- "뭐야, 진짜~", "역시~", "그렇지 않아?", "~야", "~지", "~어", "~네" 같은 구어체 반말 표현을 자연스럽게 사용하세요
- 현실적이고 솔직한 톤으로, 약간의 여유와 시니컬함을 느낄 수 있도록 작성하세요
- 모든 문장은 반말("~해", "~야", "~어", "~지")로 끝나야 합니다
- "오늘 일정이 3개 있어"처럼 반말로 말하세요. 절대 "오늘 일정이 3개 있습니다" 같은 존댓말을 사용하지 마세요`
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const prompt = `
다음 정보를 바탕으로 트렌드 브리핑 대본을 작성해주세요.

**주제:** ${keyword.level1} > ${keyword.level2} > ${keyword.level3}

**최신 뉴스 (최근 7일 이내):**
${newsContent}

**요구사항:**
1. **"~했습니다", "~입니다" 같은 존댓말 사용**
2. 비서가 전달한다는 느낌의 평서문으로 작성
3. **헤드라인, 발신, 수신, 날짜 등의 형식 금지. 순수 대본만 작성**
4. 주제 소개 → 주요 뉴스 3-5개 요약 → 트렌드 분석 → 마무리
5. **실제 뉴스 데이터만 사용**
6. **반드시 300-500자 사이 (공백 포함)**
7. 듣기 편한 자연스러운 문장
${tonePrompt}

**대본만 작성해주세요:**`

    const result = await model.generateContent(prompt)
    let script = result.response.text().trim()

    // 300-500자 사이로 조정
    if (script.length < 300) {
      console.warn(`⚠️ 대본이 너무 짧음: ${script.length}자 (300자 미만)`)
    } else if (script.length > 500) {
      console.warn(`⚠️ 대본이 너무 김: ${script.length}자 (500자 초과) - 잘라냄`)
      // 문장 단위로 자르기
      const sentences = script.match(/[^.!?]+[.!?]+/g) || [script]
      let trimmedScript = ''
      for (const sentence of sentences) {
        if (trimmedScript.length + sentence.length <= 500) {
          trimmedScript += sentence
        } else {
          break
        }
      }
      script = trimmedScript || script.substring(0, 500)
    }

    console.log(`✅ 대본 생성 완료: ${script.length}자`)
    console.log(`📝 미리보기: ${script.substring(0, 100)}...`)

    return script
  } catch (error) {
    console.error('❌ 트렌드 대본 생성 오류:', error)
    throw new Error('대본 생성에 실패했습니다.')
  }
}

export async function getAvailableVoices() {
  try {
    // Gemini 2.5 TTS에서 지원하는 음성 목록 반환
    // 문서에 따르면 30개의 음성 옵션이 있습니다
    return [
      // 남성 목소리들
      { voice_id: 'Kore', name: 'Kore', description: 'Firm - 남성 목소리' },
      { voice_id: 'Orus', name: 'Orus', description: 'Firm - 남성 목소리' },
      { voice_id: 'Charon', name: 'Charon', description: 'Informative - 남성 목소리' },
      { voice_id: 'Iapetus', name: 'Iapetus', description: 'Clear - 남성 목소리' },
      { voice_id: 'Erinome', name: 'Erinome', description: 'Clear - 남성 목소리' },
      { voice_id: 'Rasalgethi', name: 'Rasalgethi', description: 'Informative - 남성 목소리' },
      { voice_id: 'Alnilam', name: 'Alnilam', description: 'Firm - 남성 목소리' },
      { voice_id: 'Gacrux', name: 'Gacrux', description: 'Mature - 남성 목소리' },
      { voice_id: 'Sadaltager', name: 'Sadaltager', description: 'Knowledgeable - 남성 목소리' },
      
      // 여성 목소리들
      { voice_id: 'Puck', name: 'Puck', description: 'Upbeat - 여성 목소리' },
      { voice_id: 'Leda', name: 'Leda', description: 'Youthful - 여성 목소리' },
      { voice_id: 'Callirrhoe', name: 'Callirrhoe', description: 'Easy-going - 여성 목소리' },
      { voice_id: 'Despina', name: 'Despina', description: 'Smooth - 여성 목소리' },
      { voice_id: 'Pulcherrima', name: 'Pulcherrima', description: 'Forward - 여성 목소리' },
      { voice_id: 'Vindemiatrix', name: 'Vindemiatrix', description: 'Gentle - 여성 목소리' },
      { voice_id: 'Sulafat', name: 'Sulafat', description: 'Warm - 여성 목소리' },
      
      // 중성/다양한 목소리들
      { voice_id: 'Zephyr', name: 'Zephyr', description: 'Bright - 밝은 목소리' },
      { voice_id: 'Fenrir', name: 'Fenrir', description: 'Excitable - 흥미진진한 목소리' },
      { voice_id: 'Aoede', name: 'Aoede', description: 'Breezy - 상쾌한 목소리' },
      { voice_id: 'Enceladus', name: 'Enceladus', description: 'Breathy - 숨결이 있는 목소리' },
      { voice_id: 'Umbriel', name: 'Umbriel', description: 'Easy-going - 편안한 목소리' },
      { voice_id: 'Algieba', name: 'Algieba', description: 'Smooth - 부드러운 목소리' },
      { voice_id: 'Algenib', name: 'Algenib', description: 'Gravelly - 거친 목소리' },
      { voice_id: 'Laomedeia', name: 'Laomedeia', description: 'Upbeat - 활기찬 목소리' },
      { voice_id: 'Achernar', name: 'Achernar', description: 'Soft - 부드러운 목소리' },
      { voice_id: 'Schedar', name: 'Schedar', description: 'Even - 균형잡힌 목소리' },
      { voice_id: 'Achird', name: 'Achird', description: 'Friendly - 친근한 목소리' },
      { voice_id: 'Zubenelgenubi', name: 'Zubenelgenubi', description: 'Casual - 캐주얼한 목소리' },
      { voice_id: 'Sadachbia', name: 'Sadachbia', description: 'Lively - 생생한 목소리' }
    ]
  } catch (error) {
    console.error('Gemini Voices Error:', error)
    throw new Error('음성 목록을 가져오는데 실패했습니다.')
  }
}
