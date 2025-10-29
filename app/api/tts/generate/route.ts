import { NextRequest, NextResponse } from 'next/server'
import { createGeminiClient } from '@/backend/lib/gemini'

const genAI = createGeminiClient()

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5분 타임아웃 - 트렌드 섹션 등 긴 텍스트 대응

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

/**
 * Gemini 2.5 Flash Preview Native Audio TTS
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { text, voice = 'Kore', speed = 1.0 } = await request.json()

    if (!text) {
      return NextResponse.json({ 
        success: false,
        error: 'MISSING_TEXT',
        message: 'Text is required' 
      }, { status: 400 })
    }
    
    if (text.length > 5000) {
      return NextResponse.json({ 
        success: false,
        error: 'TEXT_TOO_LONG',
        message: 'Text must be less than 5000 characters' 
      }, { status: 400 })
    }

    console.log(`🎵 TTS requested for: ${text.substring(0, 50)}...`)
    console.log(`🔑 API 키 존재 여부: ${process.env.GEMINI_API_KEY ? '있음' : '없음'}`)

    // API 키 확인
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY가 설정되지 않았습니다')
      return NextResponse.json({ 
        success: false,
        error: 'API_KEY_MISSING',
        message: 'TTS 서비스가 설정되지 않았습니다'
      }, { status: 503 })
    }

    // 타임아웃 설정 (5분 = 300초 - 트렌드 섹션 등 긴 텍스트 대응)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      console.error('⏱️ TTS 생성 타임아웃')
    }, 300000)
    
    try {
      // Gemini 2.5 Flash Preview TTS 모델 사용
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" })
      
      console.log('🎤 Gemini TTS 모델 초기화 완료')
      
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { 
                voiceName: voice // 요청받은 음성 사용
              }
            }
          }
        } as any
      })
      
      clearTimeout(timeoutId)
      
      console.log('🎤 Gemini TTS 요청 완료')
      const response = await result.response
    
      // 오디오 데이터 추출
      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData
      if (!inlineData || !inlineData.data) {
        console.error('❌ 오디오 데이터가 없습니다:', {
          candidates: response.candidates?.length,
          content: response.candidates?.[0]?.content,
          parts: response.candidates?.[0]?.content?.parts?.length
        })
        throw new Error('No audio data received from Gemini')
      }
      
      const audioData = inlineData.data
      const mimeType = inlineData.mimeType
      const processingTime = Date.now() - startTime
      
      console.log('🎵 Gemini TTS 성공:', {
        mimeType: mimeType,
        dataLength: audioData.length,
        processingTime: `${processingTime}ms`
      })
    
      // PCM 형식인 경우 WAV로 변환
      if (mimeType.includes('L16') || mimeType.includes('pcm')) {
        console.log('🔄 PCM 데이터를 WAV 형식으로 변환 중...')
        
        // mimeType에서 샘플레이트 추출 (예: audio/L16;codec=pcm;rate=24000)
        const rateMatch = mimeType.match(/rate=(\d+)/)
        const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000
        
        console.log(`📊 PCM 설정: sampleRate=${sampleRate}Hz, channels=1, bitsPerSample=16`)
        
        // Base64 디코딩하여 Buffer로 변환
        const pcmBuffer = Buffer.from(audioData, 'base64')
        
        // PCM → WAV 변환
        const wavBuffer = convertPcmToWav(pcmBuffer, sampleRate, 1, 16)
        
        // WAV를 Base64로 인코딩
        const wavBase64 = wavBuffer.toString('base64')
        
        console.log(`✅ WAV 변환 완료: ${wavBuffer.length}바이트 (${(wavBuffer.length / 1024 / 1024).toFixed(2)}MB)`)
        
        return NextResponse.json({
          success: true,
          audioContent: wavBase64,
          duration: Math.ceil(text.length / 10),
          text: text.substring(0, 100),
          textLength: text.length,
          mimeType: 'audio/wav',
          processingTime
        })
      }
      
      return NextResponse.json({
        success: true,
        audioContent: audioData,
        duration: Math.ceil(text.length / 10),
        text: text.substring(0, 100),
        textLength: text.length,
        mimeType: mimeType,
        processingTime
      })
    } catch (innerError: any) {
      clearTimeout(timeoutId)
      if (innerError.name === 'AbortError') {
        throw new Error('TTS 생성 타임아웃 (25초 초과)')
      }
      throw innerError
    }

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    console.error('Gemini TTS generation error:', errorMessage, error)
    
    // 에러 타입에 따른 적절한 응답
    if (error.message?.includes('타임아웃')) {
      return NextResponse.json({
        success: false,
        error: 'TIMEOUT',
        message: 'TTS 생성 시간이 초과되었습니다',
        fallback: true
      }, { status: 408 })
    }
    
    if (error.message?.includes('API')) {
      return NextResponse.json({
        success: false,
        error: 'API_ERROR', 
        message: 'TTS API 호출에 실패했습니다',
        fallback: true
      }, { status: 503 })
    }
    
    // 폴백: 무음 WAV 생성 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      const requestBody = await request.json().catch(() => ({}))
      const fallbackText = requestBody.text || '폴백 텍스트'
      const textLength = fallbackText.length
      const duration = Math.max(3, Math.ceil(textLength / 10))
      
      const sampleRate = 44100
      const samples = sampleRate * duration
      
      // 간단한 무음 WAV 생성
      const buffer = new ArrayBuffer(44 + samples * 2)
      const view = new DataView(buffer)
      
      // WAV 헤더
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i))
        }
      }
      
      writeString(0, 'RIFF')
      view.setUint32(4, 36 + samples * 2, true)
      writeString(8, 'WAVE')
      writeString(12, 'fmt ')
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, 1, true)
      view.setUint32(24, sampleRate, true)
      view.setUint32(28, sampleRate * 2, true)
      view.setUint16(32, 2, true)
      view.setUint16(34, 16, true)
      writeString(36, 'data')
      view.setUint32(40, samples * 2, true)
      
      // 무음 데이터
      for (let i = 0; i < samples; i++) {
        view.setInt16(44 + i * 2, 0, true)
      }
      
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64Audio = btoa(binary)
      
      return NextResponse.json({
        success: true,
        audioContent: base64Audio,
        duration: duration,
        text: fallbackText.substring(0, 100) || '',
        textLength: textLength,
        fallback: true,
      })
    }
    
    // 프로덕션 환경에서는 에러 반환
    return NextResponse.json({
      success: false,
      error: 'TTS_GENERATION_FAILED',
      message: errorMessage,
      fallback: false
    }, { status: 500 })
  }
}
