import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('Fetching YouTube playlists...')

    // Fetch playlists from YouTube API
    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { title } = await request.json()
    
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Playlist title is required' }, { status: 400 })
    }

    console.log('Creating YouTube playlist:', title)

    // 먼저 사용자의 YouTube 채널 정보를 확인
    console.log('Checking YouTube channel access...')
    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    console.log('YouTube channel API response status:', channelResponse.status)

    if (!channelResponse.ok) {
      const channelErrorData = await channelResponse.text()
      console.error('YouTube channel API error:', channelErrorData)
      
      if (channelResponse.status === 404) {
        return NextResponse.json({ 
          error: 'YouTube 채널을 찾을 수 없습니다. YouTube에 가입하고 채널을 생성해주세요.',
          errorCode: 'CHANNEL_NOT_FOUND'
        }, { status: 404 })
      }
      
      if (channelResponse.status === 401) {
        return NextResponse.json({ 
          error: 'YouTube 서비스에 접근할 수 없습니다. Google 계정이 YouTube에 가입되어 있는지 확인해주세요.',
          errorCode: 'YOUTUBE_SIGNUP_REQUIRED'
        }, { status: 401 })
      }
    }

    // 채널이 존재하면 플레이리스트 생성 시도
    const playlistResponse = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        snippet: {
          title: title.trim(),
          description: `Ownbrief에서 사용되는 플레이리스트입니다.`
        },
        status: {
          privacyStatus: 'public'
          
        }
      })
    })

    console.log('YouTube playlist creation API response status:', playlistResponse.status, playlistResponse.statusText)

    if (!playlistResponse.ok) {
      const errorData = await playlistResponse.text()
      console.error('YouTube playlist creation API error response:', errorData)
      
      // 에러 메시지를 더 친화적으로 변경
      if (playlistResponse.status === 401) {
        return NextResponse.json({ 
          error: 'YouTube 플레이리스트를 생성할 수 없습니다. YouTube 서비스에 가입되어 있는지 확인해주세요.',
          errorCode: 'YOUTUBE_SIGNUP_REQUIRED'
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: `YouTube API error: ${playlistResponse.status}`,
        errorCode: 'API_ERROR'
      }, { status: playlistResponse.status })
    }

    const data = await playlistResponse.json()
    console.log('YouTube playlist creation API response data:', {
      playlistId: data.id,
      title: data.snippet?.title
    })

    const playlist = {
      id: data.id,
      title: data.snippet?.title || title.trim(),
      description: data.snippet?.description || '',
      itemCount: 0
    }

    return NextResponse.json({ playlist })

  } catch (error: any) {
    console.error('Playlist creation error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { 
        error: '플레이리스트 생성 중 오류가 발생했습니다',
        errorCode: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
}