import { GoogleGenerativeAI } from '@google/generative-ai'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generatePodcastScript(transcriptText: string): Promise<string> {
  console.log('🤖 Gemini 스크립트 생성 시작...')
  console.log(`📝 자막 텍스트 길이: ${transcriptText.length}자`)
  console.log(`📝 자막 텍스트 미리보기: ${transcriptText.substring(0, 200)}...`)
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    
    const prompt = `
다음은 유튜브 동영상들의 자막 텍스트입니다. 이 내용을 바탕으로 2500자 이내의 분량 팟캐스트 스크립트를 작성해주세요.

요구사항:
1. 자연스럽고 대화체로 작성 (한글 기준 2500자 이내 엄수)
2. 흥미로운 도입부와 마무리 포함 (노래 X)
3. 주요 내용을 요약하고 핵심 포인트 강조 
4. 듣기 편한 구조로 구성
5. **정확히 2500자 정도의 분량으로 작성** (한글 기준 2500자 이내 공백 포함)
6. 2명의 화자 대화 형태로 구성 (호스트와 게스트)
7. 호스트와 게스트가 번갈아가며 자연스럽게 대화. 호스트는 주체, 게스트는 주제 소개.

자막 텍스트:
${transcriptText}

팟캐스트 스크립트 (호스트와 게스트의 대화 형태, 2500자 분량):
`

    console.log('📤 Gemini API 요청 중...')
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
    console.error('❌ Gemini API 상세 오류:', {
      message: error.message,
      code: error.code,
      status: error.status,
      response: error.response?.data
    })
    throw new Error('팟캐스트 스크립트 생성에 실패했습니다.')
  }
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
  
  try {
    // Gemini 2.5 Flash Preview TTS 모델 사용
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" })
    
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
    
    throw new Error('Gemini 네이티브 TTS 음성 생성에 실패했습니다.')
  }
}

// Gemini 네이티브 TTS는 다중 화자를 자동으로 처리하므로 별도의 파싱이나 결합이 필요 없습니다.

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
