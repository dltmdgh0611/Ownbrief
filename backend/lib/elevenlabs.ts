export async function generateSpeech(text: string): Promise<Buffer> {
  console.log('🎤 ElevenLabs 음성 생성 시작...')
  console.log(`📝 텍스트 길이: ${text.length}자`)
  console.log(`📝 텍스트 미리보기: ${text.substring(0, 200)}...`)
  console.log(`🔑 API 키 존재 여부: ${process.env.ELEVENLABS_API_KEY ? '있음' : '없음'}`)
  
  try {
    console.log('📤 ElevenLabs API 요청 중...')
    // ElevenLabs API 직접 호출
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Rachel', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY!
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    })

    console.log(`📊 응답 상태: ${response.status} ${response.statusText}`)
    console.log(`📊 응답 헤더:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ ElevenLabs API 오류 응답:', errorText)
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
    }

    const audioBuffer = await response.arrayBuffer()
    console.log(`✅ 음성 생성 완료: ${audioBuffer.byteLength}바이트`)
    
    return Buffer.from(audioBuffer)
  } catch (error: any) {
    console.error('❌ ElevenLabs API 상세 오류:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    throw new Error('음성 생성에 실패했습니다.')
  }
}

export async function getAvailableVoices() {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!
      }
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`)
    }

    const data = await response.json()
    return data.voices
  } catch (error: any) {
    console.error('ElevenLabs Voices Error:', error)
    throw new Error('음성 목록을 가져오는데 실패했습니다.')
  }
}
