import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { generateMultiSpeakerSpeech } from '@/backend/lib/gemini'
import { prisma } from '@/backend/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  console.log('🎤 Voice generation API started...')
  
  try {
    console.log('🔐 Checking session...')
    const session = await getServerSession(authOptions)
    
    if (!session) {
      console.error('❌ Authentication failed: No session')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('✅ Authentication successful:', {
      userId: session.user?.id,
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
    const audioBuffer = await generateMultiSpeakerSpeech(script)
    console.log('✅ Voice generation complete:', audioBuffer.length, 'bytes')

    // Save audio file
    console.log('💾 Saving audio file...')
    const audioDir = join(process.cwd(), 'public', 'audio')
    await mkdir(audioDir, { recursive: true })
    
    // Gemini TTS returns WAV format, not MP3
    const audioFileName = `podcast-${podcastId}.wav`
    const audioPath = join(audioDir, audioFileName)
    
    await writeFile(audioPath, audioBuffer)
    console.log('✅ Audio file saved:', audioPath)

    // Update database
    console.log('📊 Updating database...')
    const audioUrl = `/audio/${audioFileName}`
    const updatedPodcast = await prisma.podcast.update({
      where: { id: podcastId },
      data: {
        audioUrl,
        duration: Math.floor(audioBuffer.length / 16000), // Approximate calculation
        status: 'completed'
      }
    })

    console.log('✅ Database updated:', {
      audioUrl,
      duration: updatedPodcast.duration,
      status: updatedPodcast.status
    })

    return NextResponse.json({
      success: true,
      audioUrl,
      duration: updatedPodcast.duration,
      message: 'Voice generation completed successfully'
    })

  } catch (error: any) {
    console.error('❌ Voice generation error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      status: error.status
    })
    return NextResponse.json(
      { error: 'Error occurred during voice generation' },
      { status: 500 }
    )
  }
}