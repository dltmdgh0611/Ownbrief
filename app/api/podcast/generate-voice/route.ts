import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { generateMultiSpeakerSpeech } from '@/backend/lib/gemini'
import { prisma } from '@/backend/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Vercel Hobby plan max: 300s (5 minutes)
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🎤 Voice generation API started...')
  console.log(`⏱️ 시작 시간: ${new Date().toLocaleTimeString()}`)
  
  try {
    console.log('🔐 Checking session...')
    const session = await getServerSession(authOptions)
    
    if (!session) {
      console.error('❌ Authentication failed: No session')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('✅ Authentication successful:', {
      userEmail: session.user?.email
    })

    const { podcastId, script } = await request.json()
    console.log('📝 Request data:', {
      podcastId,
      scriptLength: script?.length || 0,
      scriptPreview: script?.substring(0, 100) + '...'
    })

    if (!podcastId || !script) {
      console.error('❌ Missing required parameters:', { podcastId: !!podcastId, script: !!script })
      return NextResponse.json({ error: 'Podcast ID and script are required' }, { status: 400 })
    }

    // Find user
    console.log('🔍 Finding user...')
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || 'unknown' }
    })

    if (!user) {
      console.error('❌ User not found:', session.user?.email)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify podcast
    console.log('📹 Verifying podcast...')
    const podcast = await prisma.podcast.findFirst({
      where: {
        id: podcastId,
        userId: user.id
      }
    })

    if (!podcast) {
      console.error('❌ Podcast not found:', podcastId)
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 })
    }

    console.log('✅ Podcast verified:', {
      id: podcast.id,
      title: podcast.title,
      status: podcast.status
    })

    // Generate voice
    console.log('🎙️ Starting Gemini multi-speaker voice generation...')
    const audioResult = await generateMultiSpeakerSpeech(script)
    console.log('✅ Voice generation complete:', {
      bufferSize: audioResult.buffer.length,
      mimeType: audioResult.mimeType
    })

    // Save audio file
    console.log('💾 Saving audio file...')
    const audioDir = join(process.cwd(), 'public', 'audio')
    await mkdir(audioDir, { recursive: true })
    
    // Determine file extension based on MIME type
    let fileExtension = 'wav'
    if (audioResult.mimeType.includes('mpeg') || audioResult.mimeType.includes('mp3')) {
      fileExtension = 'mp3'
    } else if (audioResult.mimeType.includes('wav')) {
      fileExtension = 'wav'
    } else if (audioResult.mimeType.includes('ogg')) {
      fileExtension = 'ogg'
    }
    
    const audioFileName = `podcast-${podcastId}.${fileExtension}`
    const audioPath = join(audioDir, audioFileName)
    
    await writeFile(audioPath, audioResult.buffer)
    console.log('✅ Audio file saved:', {
      path: audioPath,
      extension: fileExtension,
      mimeType: audioResult.mimeType
    })

    // Calculate duration based on WAV format
    let duration = 0
    if (fileExtension === 'wav' && audioResult.buffer.length > 44) {
      // WAV 헤더에서 정확한 정보 추출
      const sampleRate = audioResult.buffer.readUInt32LE(24)
      const byteRate = audioResult.buffer.readUInt32LE(28)
      const dataSize = audioResult.buffer.readUInt32LE(40)
      
      duration = Math.floor(dataSize / byteRate)
      
      console.log(`📊 WAV 파일 정보:`, {
        sampleRate,
        byteRate,
        dataSize,
        fileSize: (audioResult.buffer.length / 1024 / 1024).toFixed(2) + 'MB',
        calculatedDuration: duration + '초'
      })
    }

    // Update database
    console.log('📊 Updating database...')
    const audioUrl = `/audio/${audioFileName}`
    const updatedPodcast = await prisma.podcast.update({
      where: { id: podcastId },
      data: {
        audioUrl,
        duration,
        status: 'completed'
      }
    })

    console.log('✅ Database updated:', {
      audioUrl,
      duration: updatedPodcast.duration,
      status: updatedPodcast.status
    })

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`✅ 🎉 음성 생성 완료! 총 소요 시간: ${totalDuration}초 (${(parseFloat(totalDuration) / 60).toFixed(2)}분)`)

    return NextResponse.json({
      success: true,
      audioUrl,
      duration: updatedPodcast.duration,
      processingTime: totalDuration,
      message: 'Voice generation completed successfully'
    })

  } catch (error: any) {
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.error(`❌ 음성 생성 실패! 소요 시간: ${totalDuration}초`)
    console.error('❌ Voice generation error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      status: error.status
    })
    return NextResponse.json(
      { 
        error: 'Error occurred during voice generation',
        processingTime: totalDuration
      },
      { status: 500 }
    )
  }
}