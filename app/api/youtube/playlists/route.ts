import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('Fetching YouTube playlists...')

    // Fetch playlists from YouTube API
    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Accept': 'application/json'
      }
    })

    console.log('YouTube playlist API response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('YouTube playlist API error response:', errorData)
      return NextResponse.json({ error: `YouTube API error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    console.log('YouTube playlist API response data:', {
      totalResults: data.pageInfo?.totalResults,
      itemsCount: data.items?.length || 0
    })

    const playlists = data.items?.map((playlist: any) => ({
      id: playlist.id,
      title: playlist.snippet?.title || 'No title',
      description: playlist.snippet?.description || '',
      itemCount: playlist.contentDetails?.itemCount || 0
    })) || []

    return NextResponse.json({ playlists })

  } catch (error: any) {
    console.error('Playlist fetch error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    )
  }
}