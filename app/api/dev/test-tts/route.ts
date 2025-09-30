import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { generateMultiSpeakerSpeech } from '@/backend/lib/gemini'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Vercel Hobby plan max: 300s (5 minutes)
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🧪 TTS test started...')
  console.log(`⏱️ 시작 시간: ${new Date().toLocaleTimeString()}`)
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { script } = await request.json()
    
    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 })
    }

    console.log(`🎙️ Testing TTS with script length: ${script.length}`)
    
    const startTime = Date.now()
    const audioResult = await generateMultiSpeakerSpeech(script)
    const duration = Date.now() - startTime

    console.log(`✅ TTS test completed in ${duration}ms`)

    // Save test audio file
    const audioDir = join(process.cwd(), 'public', 'audio')
    await mkdir(audioDir, { recursive: true })
    
    const timestamp = Date.now()
    let fileExtension = 'wav'
    if (audioResult.mimeType.includes('mpeg') || audioResult.mimeType.includes('mp3')) {
      fileExtension = 'mp3'
    } else if (audioResult.mimeType.includes('wav')) {
      fileExtension = 'wav'
    } else if (audioResult.mimeType.includes('ogg')) {
      fileExtension = 'ogg'
    }
    
    const audioFileName = `test-tts-${timestamp}.${fileExtension}`
    const audioPath = join(audioDir, audioFileName)
    
    await writeFile(audioPath, audioResult.buffer)
    console.log(`💾 Test audio saved: ${audioPath}`)

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`✅ 🎉 TTS 테스트 완료! 총 소요 시간: ${totalDuration}초 (${(parseFloat(totalDuration) / 60).toFixed(2)}분)`)

    return NextResponse.json({
      success: true,
      duration,
      processingTime: totalDuration,
      mimeType: audioResult.mimeType,
      bufferSize: audioResult.buffer.length,
      fileExtension,
      audioUrl: `/audio/${audioFileName}`,
      bufferHeader: audioResult.buffer.slice(0, 12).toString('hex')
    })

  } catch (error: any) {
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.error(`❌ TTS 테스트 실패! 소요 시간: ${totalDuration}초`)
    console.error('❌ TTS test error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'TTS test failed',
        processingTime: totalDuration,
        details: error.stack
      },
      { status: 500 }
    )
  }
}
