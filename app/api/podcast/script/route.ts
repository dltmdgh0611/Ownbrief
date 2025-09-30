import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { getVideoTranscript, combineTranscripts } from '@/backend/lib/subtitle'
import { generatePodcastScript } from '@/backend/lib/gemini'
import { prisma } from '@/backend/lib/prisma'

export async function POST(request: NextRequest) {
  console.log('📝 Subtitle extraction and script generation API started...')
  
  try {
    console.log('🔐 Checking session...')
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    
    if (!accessToken) {
      console.error('❌ Authentication failed: No session or access token')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { videoIds } = await request.json()
    console.log('📹 Requested video IDs:', videoIds)

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({ error: 'Video IDs are required' }, { status: 400 })
    }

    // Extract subtitles from each video (process sequentially to save memory)
    console.log('📝 Starting subtitle extraction...')
    const transcripts = []
    
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i]
      console.log(`📝 Extracting subtitle (${i + 1}/${videoIds.length}): ${videoId}`)
      try {
        const transcript = await getVideoTranscript(videoId)
        transcripts.push(transcript)
        console.log(`✅ Subtitle extraction complete (${i + 1}/${videoIds.length}): ${transcript.length} segments`)
        
        // Wait between videos to free memory
        if (i < videoIds.length - 1) {
          console.log('⏳ Waiting 2 seconds for memory cleanup...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error: any) {
        console.error(`❌ Subtitle extraction failed ${videoId}:`, error)
        transcripts.push([])
      }
    }

    console.log('📊 Subtitle extraction results:', {
      totalVideos: videoIds.length,
      successfulTranscripts: transcripts.filter((t: any) => t.length > 0).length,
      totalSegments: transcripts.reduce((sum: number, t: any) => sum + t.length, 0)
    })

    // Combine subtitle texts
    const combinedTranscript = combineTranscripts(transcripts.filter((t: any) => t.length > 0))

    if (!combinedTranscript || combinedTranscript.trim().length === 0) {
      console.error('❌ No subtitles found')
      return NextResponse.json({ 
        error: 'Could not extract subtitles. Please check if the videos have subtitles.' 
      }, { status: 404 })
    }

    console.log('✅ Combined transcript:', combinedTranscript.length, 'characters')

    // Generate podcast script
    console.log('🤖 Starting podcast script generation...')
    const script = await generatePodcastScript(combinedTranscript)

    console.log('📤 Preparing API response...')
    return NextResponse.json({
      success: true,
      script,
      transcriptLength: combinedTranscript.length,
      message: 'Script generated successfully'
    })

  } catch (error: any) {
    console.error('❌ Subtitle extraction and script generation error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      status: error.status
    })
    return NextResponse.json(
      { error: 'Error occurred during script generation' },
      { status: 500 }
    )
  }
}