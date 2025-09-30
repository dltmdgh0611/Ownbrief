// YouTube API 직접 호출을 위한 유틸리티 함수들

export async function getYouTubeVideosFromPlaylists(accessToken: string, playlistIds: string[]) {
  console.log('🔍 YouTube API 호출 시작...')
  console.log('📝 Access Token:', accessToken ? `${accessToken.substring(0, 20)}...` : '없음')
  console.log('📋 선택된 플레이리스트:', playlistIds)
  
  if (!playlistIds || playlistIds.length === 0) {
    console.error('❌ 선택된 플레이리스트가 없음')
    throw new Error('플레이리스트를 먼저 선택해주세요.')
  }

  try {
    const allVideos: any[] = []
    
    // 각 플레이리스트에서 동영상 가져오기
    for (const playlistId of playlistIds) {
      console.log(`📺 플레이리스트 ${playlistId}에서 동영상 가져오기...`)
      
      const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=10&order=date`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      })

      console.log(`📊 플레이리스트 ${playlistId} API 응답 상태:`, response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.text()
        console.error(`❌ 플레이리스트 ${playlistId} API 오류 응답:`, errorData)
        continue // 오류가 있어도 다른 플레이리스트는 계속 처리
      }

      const data = await response.json()
      console.log(`✅ 플레이리스트 ${playlistId} 응답 데이터:`, {
        totalResults: data.pageInfo?.totalResults,
        itemsCount: data.items?.length || 0
      })

      if (data.items) {
        allVideos.push(...data.items)
      }
    }

    // 최근 동영상 5개만 선택
    const recentVideos = allVideos
      .sort((a: any, b: any) => new Date(b.snippet?.publishedAt || 0).getTime() - new Date(a.snippet?.publishedAt || 0).getTime())
      .slice(0, 5)

    console.log('✅ 최종 선택된 동영상:', {
      totalVideos: allVideos.length,
      selectedVideos: recentVideos.length,
      videos: recentVideos.map((item: any) => ({
        id: item.snippet?.resourceId?.videoId,
        title: item.snippet?.title,
        publishedAt: item.snippet?.publishedAt
      }))
    })

    return recentVideos
  } catch (error: any) {
    console.error('❌ YouTube API 상세 오류:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    throw new Error('유튜브 동영상을 가져오는데 실패했습니다.')
  }
}

export async function getVideoDetails(videoIds: string[], accessToken: string) {
  console.log('🔍 동영상 상세 정보 요청 중...')
  console.log('📝 Video IDs:', videoIds)
  
  try {
    const idsParam = videoIds.join(',')
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${idsParam}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    console.log('📊 동영상 상세 정보 응답 상태:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ 동영상 상세 정보 오류 응답:', errorData)
      throw new Error(`YouTube API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    console.log('✅ 동영상 상세 정보 응답 데이터:', {
      itemsCount: data.items?.length || 0,
      items: data.items?.map((item: any) => ({
        id: item.id,
        title: item.snippet?.title,
        duration: item.contentDetails?.duration,
        thumbnail: item.snippet?.thumbnails?.default?.url
      }))
    })

    return data.items || []
  } catch (error: any) {
    console.error('❌ 동영상 상세 정보 오류:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    throw new Error('동영상 상세 정보를 가져오는데 실패했습니다.')
  }
}
