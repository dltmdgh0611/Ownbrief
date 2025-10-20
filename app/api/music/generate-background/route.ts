import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Suno AI API를 사용한 배경음악 생성
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt, duration } = await request.json()

    // Suno AI API 호출
    const sunoResponse = await fetch('https://api.suno.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        duration: duration || 180,
        style: 'instrumental',
        mood: 'calm',
        tempo: 'medium',
        key: 'C major',
      }),
    })

    if (!sunoResponse.ok) {
      throw new Error(`Suno API error: ${sunoResponse.status}`)
    }

    const sunoData = await sunoResponse.json()
    
    // 생성된 음악의 URL 반환
    return NextResponse.json({
      success: true,
      audioUrl: sunoData.audio_url,
      duration: sunoData.duration,
      id: sunoData.id,
    })

  } catch (error) {
    console.error('Background music generation error:', error)
    
    // 폴백: 기본 배경음악 URL 반환
    return NextResponse.json({
      success: false,
      audioUrl: '/audio/default-background.mp3', // 기본 배경음악 파일
      duration: 180,
      fallback: true,
    })
  }
}
