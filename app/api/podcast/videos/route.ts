import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { getYouTubeVideosFromPlaylists, getVideoDetails } from '@/backend/lib/youtube'
import { prisma } from '@/backend/lib/prisma'

export async function POST(request: NextRequest) {
  console.log('📹 Fetching video list API started...')
  
  try {
    console.log('🔐 Checking session...')
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    
    if (!accessToken) {
      console.error('❌ Authentication failed: No session or access token')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('✅ Authentication successful:', {
      userEmail: session?.user?.email,
      accessTokenLength: accessToken?.length
    })

    // Fetch user settings
    console.log('⚙️ Fetching user settings...')
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session?.user?.email || 'unknown' }
    })

    if (!user) {
      console.error('❌ User not found:', session?.user?.email)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
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
    const playlistVideos = await getYouTubeVideosFromPlaylists(accessToken, selectedPlaylists)
    
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
    const videoDetails = await getVideoDetails(videoIds, accessToken)

    // Format video info
    const videoInfos = videoDetails.map(video => ({
      id: video.id,
      title: video.snippet?.title || 'No title',
      thumbnail: video.snippet?.thumbnails?.default?.url
    }))

    console.log('✅ Formatted video info:', videoInfos)

    console.log('📤 Preparing API response...')
    return NextResponse.json({
      success: true,
      videos: videoInfos,
      message: 'Video list fetched successfully'
    })

  } catch (error: any) {
    console.error('❌ Video list fetch error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      status: error.status
    })
    return NextResponse.json(
      { error: 'Error occurred while fetching video list' },
      { status: 500 }
    )
  }
}