import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { getYouTubeVideosFromPlaylists, getVideoDetails } from '@/backend/lib/youtube'
import { getVideoTranscript, combineTranscripts } from '@/backend/lib/subtitle'
import { generatePodcastScript, generateMultiSpeakerSpeech } from '@/backend/lib/gemini'
import { prisma } from '@/backend/lib/prisma'

export async function POST(request: NextRequest) {
  console.log('🎙️ Podcast generation API started...')
  
  try {
    console.log('🔐 Checking session...')
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      console.error('❌ Authentication failed: No session or access token')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('✅ Authentication successful:', {
      userId: session.user?.id,
      userEmail: session.user?.email,
      accessTokenLength: session.accessToken?.length
    })

    // Fetch user settings
    console.log('⚙️ Fetching user settings...')
    
    // Find user first
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || 'unknown' }
    })

    if (!user) {
      console.error('❌ User not found:', session.user?.email)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Fetch user settings directly from database
    let userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    })

    // Fallback to email-based lookup
    if (!userSettings) {
      userSettings = await prisma.userSettings.findUnique({
        where: { userId: user.email || 'unknown' }
      })
      
      // Migrate to new ID
      if (userSettings) {
        console.log('🔄 Migrating user settings to new ID...')
        userSettings = await prisma.userSettings.update({
          where: { userId: user.email || 'unknown' },
          data: { userId: user.id }
        })
      }
    }

    // Create settings with default if not exists
    if (!userSettings) {
      userSettings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          selectedPlaylists: []
        }
      })
    }

    const selectedPlaylists = userSettings.selectedPlaylists || []
    
    console.log('📋 Selected playlists:', selectedPlaylists)
    
    if (selectedPlaylists.length === 0) {
      console.error('❌ No playlists selected')
      return NextResponse.json({ 
        error: 'Please select playlists first. Go to settings page to select playlists.' 
      }, { status: 400 })
    }

    // Fetch videos from selected playlists
    console.log('🎬 Fetching videos from selected playlists...')
    const playlistVideos = await getYouTubeVideosFromPlaylists(session.accessToken, selectedPlaylists)
    
    console.log('📊 Playlist videos result:', {
      videosCount: playlistVideos?.length || 0,
      videos: playlistVideos?.map(v => ({
        id: v.snippet?.resourceId?.videoId,
        title: v.snippet?.title
      }))
    })
    
    if (!playlistVideos || playlistVideos.length === 0) {
      console.error('❌ No videos in selected playlists')
      return NextResponse.json({ error: 'No videos found in selected playlists' }, { status: 404 })
    }

    // Get detailed info for recent 5 videos
    console.log('🔍 Extracting video IDs...')
    const videoIds = playlistVideos.slice(0, 5).map(video => video.snippet?.resourceId?.videoId).filter(Boolean)
    console.log('📝 Extracted video IDs:', videoIds)
    
    console.log('📹 Fetching video details...')
    const videoDetails = await getVideoDetails(videoIds, session.accessToken)

    // Format video info
    const videoInfos = videoDetails.map(video => ({
      id: video.id,
      title: video.snippet?.title || 'No title',
      thumbnail: video.snippet?.thumbnails?.default?.url
    }))

    console.log('✅ Formatted video info:', videoInfos)

    // Extract subtitles from each video (process sequentially to save memory)
    console.log('📝 Starting subtitle extraction...')
    const transcripts = []
    
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i]
      console.log(`📝 Extracting subtitle (${i + 1}/${videoIds.length}): ${videoId}`)
      try {
        const transcript = await getVideoTranscript(videoId!)
        transcripts.push(transcript)
        console.log(`✅ Subtitle extraction complete (${i + 1}/${videoIds.length}): ${transcript.length} segments`)
        
        // Wait between videos to free memory
        if (i < videoIds.length - 1) {
          console.log('⏳ Waiting 2 seconds for memory cleanup...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error(`❌ Subtitle extraction failed ${videoId}:`, error)
        transcripts.push([])
      }
    }

    console.log('📊 Subtitle extraction results:', {
      totalVideos: videoIds.length,
      successfulTranscripts: transcripts.filter(t => t.length > 0).length,
      totalSegments: transcripts.reduce((sum, t) => sum + t.length, 0)
    })

    // Combine subtitle texts
    const combinedTranscript = combineTranscripts(transcripts.filter(t => t.length > 0))

    if (!combinedTranscript || combinedTranscript.trim().length === 0) {
      console.error('❌ No subtitles - using fallback with video titles')
      // Use video titles if no subtitles
      const fallbackText = videoInfos.map(video => video.title).join('. ')
      console.log('📝 Using fallback text:', fallbackText.substring(0, 100) + '...')
      
      // Generate simple podcast script
      const script = `Hello! Today I'll introduce some interesting videos for you.

${videoInfos.map((video, index) => `${index + 1}. ${video.title}`).join('\n')}

Let's explore these topics in detail. Please watch each video directly for more information.

Thank you!`

      // Save podcast to database
      console.log('💾 Saving podcast to database...')
      const podcast = await prisma.podcast.create({
        data: {
          title: `AI Cast - ${new Date().toLocaleDateString('ko-KR')}`,
          description: `Podcast generated from ${videoDetails.length} videos`,
          status: 'processing',
          script: script,
          userId: user.id
        }
      })

      console.log('✅ Podcast saved to database:', {
        podcastId: podcast.id,
        title: podcast.title,
        status: podcast.status
      })

      return NextResponse.json({
        podcastId: podcast.id,
        script,
        videos: videoInfos,
        status: 'processing',
        message: 'Podcast generation started'
      })
    }

    console.log('✅ Combined transcript:', combinedTranscript.length, 'characters')

    // Generate podcast script
    console.log('🤖 Starting podcast script generation...')
    const script = await generatePodcastScript(combinedTranscript)

    // Save podcast to database
    console.log('💾 Saving podcast to database...')
    const podcast = await prisma.podcast.create({
      data: {
        title: `AI Cast - ${new Date().toLocaleDateString('ko-KR')}`,
        description: `Podcast generated from ${videoDetails.length} videos`,
        status: 'processing',
        script: script,
        userId: user.id
      }
    })

    console.log('✅ Podcast saved to database:', {
      podcastId: podcast.id,
      title: podcast.title,
      status: podcast.status
    })

    // Generate voice (process in background)
    console.log('🎙️ Starting background multi-speaker voice generation...')
    generateMultiSpeakerSpeech(script).then(async (audioBuffer) => {
      console.log('✅ Voice generation complete, updating database...')
      // In production, upload to S3 or other storage
      const audioUrl = `/api/podcast/${podcast.id}/audio`
      
      await prisma.podcast.update({
        where: { id: podcast.id },
        data: {
          audioUrl,
          duration: Math.floor(audioBuffer.length / 16000), // Approximate calculation
          status: 'completed'
        }
      })
      console.log('✅ Voice generation and database update complete')
    }).catch(async (error) => {
      console.error('❌ Voice generation failed:', error)
      await prisma.podcast.update({
        where: { id: podcast.id },
        data: { status: 'failed' }
      })
    })

    console.log('📤 Preparing API response...')
    return NextResponse.json({
      podcastId: podcast.id,
      script,
      videos: videoInfos,
      status: 'processing',
      message: 'Podcast generation started'
    })

  } catch (error: any) {
    console.error('❌ Podcast generation error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      status: error.status
    })
    return NextResponse.json(
      { error: 'Error occurred during podcast generation' },
      { status: 500 }
    )
  }
}