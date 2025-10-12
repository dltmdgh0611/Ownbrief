import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { getVideoTranscript, combineTranscripts } from '@/backend/lib/subtitle'
import { generatePodcastScript } from '@/backend/lib/gemini'
import { prisma } from '@/backend/lib/prisma'

// Vercel Pro plan max: 300s (5 minutes) for regular API endpoints
export const maxDuration = 300

export async function POST(request: NextRequest) {
  console.log('📡 Streaming subtitle extraction and script generation API started...')
  
  try {
    console.log('🔐 Checking session...')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.error('❌ Authentication failed: No session or user email')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { videoIds } = await request.json()
    console.log('📹 Requested video IDs:', videoIds)

    if (!videoIds || videoIds.length === 0) {
      console.error('❌ No video IDs provided')
      return NextResponse.json({ error: 'Video IDs are required for script generation' }, { status: 400 })
    }

    // Setup streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Extract subtitles from each video (process sequentially to save memory)
          console.log('📝 Starting subtitle extraction...')
          const transcripts = []
          
          for (let i = 0; i < videoIds.length; i++) {
            const videoId = videoIds[i]
            console.log(`📝 Extracting subtitle (${i + 1}/${videoIds.length}): ${videoId}`)
            
            // Send progress update
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              current: i + 1,
              total: videoIds.length,
              currentVideo: videoId,
              status: 'extracting'
            })}\n\n`))
            
            try {
              const transcript = await getVideoTranscript(videoId!)
              transcripts.push(transcript)
              console.log(`✅ Subtitle extraction complete (${i + 1}/${videoIds.length}): ${transcript.length} segments`)
              
              // Send completion update
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total: videoIds.length,
                currentVideo: videoId,
                status: 'completed',
                segments: transcript.length
              })}\n\n`))
              
              // Wait between videos to free memory
              if (i < videoIds.length - 1) {
                console.log('⏳ Waiting 2 seconds for memory cleanup...')
                await new Promise(resolve => setTimeout(resolve, 2000))
              }
            } catch (error: any) {
              console.error(`❌ Subtitle extraction failed ${videoId}:`, error)
              transcripts.push([])
              
              // Send failure update
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                current: i + 1,
                total: videoIds.length,
                currentVideo: videoId,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Subtitle extraction failed'
              })}\n\n`))
            }
          }

          console.log('📊 Subtitle extraction results:', {
            totalVideos: videoIds.length,
            successfulTranscripts: transcripts.filter((t: any) => t.length > 0).length,
            totalSegments: transcripts.reduce((sum: number, t: any) => sum + t.length, 0)
          })

          // Notify script generation start
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'script_generation_start'
          })}\n\n`))

          // Combine subtitle texts
          const combinedTranscript = combineTranscripts(transcripts.filter((t: any) => t.length > 0))

          let script = ''
          if (!combinedTranscript || combinedTranscript.trim().length === 0) {
            console.error('❌ No subtitles found - using fallback')
            script = 'Could not find subtitles to generate podcast script.'
          } else {
            console.log('✅ Combined transcript:', combinedTranscript.length, 'characters')
            // Generate podcast script
            console.log('🤖 Starting podcast script generation...')
            script = await generatePodcastScript(combinedTranscript)
          }

          // Find or create user
          let user = await prisma.user.findUnique({
            where: { email: session?.user?.email || 'unknown' }
          })
          
          if (!user) {
            user = await prisma.user.create({
              data: {
                email: session?.user?.email || 'unknown',
                name: session?.user?.name || 'Unknown User'
              }
            })
          }

          // Save podcast to database (initial state)
          console.log('💾 Saving podcast to database...')
          const podcast = await prisma.podcast.create({
            data: {
              title: `AI Cast - ${new Date().toLocaleDateString('ko-KR')}`,
              description: `Podcast generated from ${videoIds.length} videos`,
              status: 'script_generated', // Script generation complete status
              script: script,
              userId: user.id
            }
          })

          console.log('✅ Podcast saved to database:', {
            podcastId: podcast.id,
            title: podcast.title,
            status: podcast.status
          })

          // Send final result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            podcastId: podcast.id,
            script: script,
            message: 'Script generation completed successfully'
          })}\n\n`))

          controller.close()

        } catch (error: any) {
          console.error('❌ Streaming processing error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: 'Error occurred during script generation'
          })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error('❌ Streaming API error:', {
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