import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { getVideoTranscriptWithApify } from '@/backend/lib/apify-transcript'

// 타임아웃 설정: 15분
export const maxDuration = 900

export async function POST(request: NextRequest) {
  console.log('🧪 Apify test started...')
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { videoUrl } = await request.json()
    
    if (!videoUrl) {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 })
    }

    // Extract video ID from URL
    let videoId = ''
    try {
      const url = new URL(videoUrl)
      if (url.hostname.includes('youtube.com')) {
        videoId = url.searchParams.get('v') || ''
      } else if (url.hostname.includes('youtu.be')) {
        videoId = url.pathname.slice(1)
      }
    } catch {
      // If it's just a video ID
      videoId = videoUrl
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL or video ID' }, { status: 400 })
    }

    console.log(`🔍 Testing Apify with video ID: ${videoId}`)
    
    const startTime = Date.now()
    const segments = await getVideoTranscriptWithApify(videoId)
    const duration = Date.now() - startTime

    console.log(`✅ Apify test completed: ${segments.length} segments in ${duration}ms`)

    return NextResponse.json({
      success: true,
      videoId,
      segmentCount: segments.length,
      duration,
      preview: segments.slice(0, 5).map(s => ({
        text: s.text.substring(0, 100),
        offset: s.offset,
        duration: s.duration
      })),
      fullText: segments.map(s => s.text).join(' ').substring(0, 500)
    })

  } catch (error: any) {
    console.error('❌ Apify test error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Apify test failed',
        details: error.stack
      },
      { status: 500 }
    )
  }
}
