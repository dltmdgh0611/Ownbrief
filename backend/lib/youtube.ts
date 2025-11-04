import { google } from 'googleapis'
import { prisma } from './prisma'

export interface YoutubePlaylist {
  id: string
  title: string
  description: string
  itemCount: number
}

export interface YoutubeVideo {
  id: string
  title: string
  description: string
  channelTitle: string
  publishedAt: string
  thumbnailUrl?: string
}

/**
 * YouTube API 클라이언트
 */
export class YouTubeClient {
  /**
   * 사용자의 모든 플레이리스트 조회
   */
  static async getUserPlaylists(userEmail: string, maxResults = 50): Promise<YoutubePlaylist[]> {
    try {
      console.log(`📺 [YouTube] 사용자 플레이리스트 조회 시작: userEmail=${userEmail}, maxResults=${maxResults}`)
      
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        console.error(`❌ [YouTube] Access Token 없음: userEmail=${userEmail}`)
        return []
      }
      console.log(`✅ [YouTube] Access Token 획득 성공: userEmail=${userEmail}`)

      const youtube = google.youtube({ version: 'v3' })
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })

      console.log(`🔍 [YouTube] 플레이리스트 목록 API 호출 중...`)
      const response = await youtube.playlists.list({
        auth,
        part: ['snippet', 'contentDetails'],
        mine: true,
        maxResults,
      })

      const playlists = response.data.items || []
      console.log(`📊 [YouTube] 플레이리스트 조회 결과: 총 ${playlists.length}개 플레이리스트 발견`)

      const result = playlists.map(playlist => ({
        id: playlist.id!,
        title: playlist.snippet?.title || '제목 없음',
        description: playlist.snippet?.description || '',
        itemCount: playlist.contentDetails?.itemCount || 0,
      }))

      // 각 플레이리스트 상세 정보 로그
      result.forEach((playlist, idx) => {
        console.log(`  📋 [YouTube] 플레이리스트 ${idx + 1}: id=${playlist.id}, title="${playlist.title}", itemCount=${playlist.itemCount}`)
      })

      return result
    } catch (error: any) {
      console.error(`❌ [YouTube] 플레이리스트 조회 오류: userEmail=${userEmail}`)
      console.error(`   오류 타입: ${error.constructor.name}`)
      console.error(`   오류 메시지: ${error.message}`)
      console.error(`   오류 스택:`, error.stack)
      if (error.response) {
        console.error(`   API 응답 상태: ${error.response.status}`)
        console.error(`   API 응답 데이터:`, JSON.stringify(error.response.data, null, 2))
      }
      return []
    }
  }

  /**
   * 최근 저장한 영상 가져오기 (여러 플레이리스트에서)
   */
  static async getRecentSavedVideos(userEmail: string, maxVideos = 5): Promise<YoutubeVideo[]> {
    try {
      console.log(`📺 [YouTube] 최근 저장 영상 수집 시작: userEmail=${userEmail}, maxVideos=${maxVideos}`)
      
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        console.error(`❌ [YouTube] Access Token 없음: userEmail=${userEmail}`)
        return []
      }

      const youtube = google.youtube({ version: 'v3' })
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })

      const allVideos: YoutubeVideo[] = []
      const playlistStats: Array<{ playlistId: string, playlistTitle: string, fetched: number, valid: number }> = []

      // 1. 사용자의 플레이리스트 가져오기
      console.log(`🔍 [YouTube] 플레이리스트 목록 조회 중...`)
      const playlists = await this.getUserPlaylists(userEmail, 10)
      console.log(`📊 [YouTube] 조회된 플레이리스트 수: ${playlists.length}개`)

      if (playlists.length === 0) {
        console.error(`❌ [YouTube] 플레이리스트가 없음: userEmail=${userEmail}`)
        return []
      }

      // 2. 각 플레이리스트에서 최신 영상 가져오기
      console.log(`🔍 [YouTube] 각 플레이리스트에서 영상 수집 시작...`)
      for (let i = 0; i < playlists.length; i++) {
        const playlist = playlists[i]
        let fetchedCount = 0
        let validCount = 0
        
        try {
          console.log(`  📋 [YouTube] 플레이리스트 ${i + 1}/${playlists.length} 처리 중: id=${playlist.id}, title="${playlist.title}", 총 아이템=${playlist.itemCount}`)
          
          const playlistItems = await youtube.playlistItems.list({
            auth,
            part: ['snippet', 'contentDetails'],
            playlistId: playlist.id,
            maxResults: 3, // 각 플레이리스트에서 최대 3개
          })

          const items = playlistItems.data.items || []
          fetchedCount = items.length
          console.log(`    📥 [YouTube] 플레이리스트 "${playlist.title}"에서 ${fetchedCount}개 아이템 조회됨`)
          
          items.forEach((item, itemIdx) => {
            const snippet = item.snippet
            const videoId = item.contentDetails?.videoId || item.id || ''
            const title = snippet?.title || ''
            
            if (snippet?.title && snippet.title !== 'Private video' && snippet.title !== 'Deleted video') {
              allVideos.push({
                id: videoId,
                title: snippet.title,
                description: snippet.description || '',
                channelTitle: snippet.channelTitle || '',
                publishedAt: snippet.publishedAt || '',
                thumbnailUrl: snippet.thumbnails?.default?.url || undefined,
              })
              validCount++
              console.log(`      ✅ [YouTube] 유효한 영상 ${itemIdx + 1}: id=${videoId}, title="${title.substring(0, 50)}${title.length > 50 ? '...' : ''}"`)
            } else {
              console.log(`      ⚠️ [YouTube] 제외된 아이템 ${itemIdx + 1}: title="${title}" (Private/Deleted 또는 제목 없음)`)
            }
          })

          playlistStats.push({
            playlistId: playlist.id,
            playlistTitle: playlist.title,
            fetched: fetchedCount,
            valid: validCount
          })

          if (allVideos.length >= maxVideos * 2) {
            console.log(`  ⏹️ [YouTube] 충분한 영상 수집됨 (${allVideos.length}개), 수집 중단`)
            break // 충분히 모았으면 중단
          }
        } catch (error: any) {
          console.error(`  ❌ [YouTube] 플레이리스트 "${playlist.title}" (id=${playlist.id}) 처리 오류:`)
          console.error(`     오류 타입: ${error.constructor.name}`)
          console.error(`     오류 메시지: ${error.message}`)
          if (error.response) {
            console.error(`     API 응답 상태: ${error.response.status}`)
            console.error(`     API 응답 데이터:`, JSON.stringify(error.response.data, null, 2))
          }
          playlistStats.push({
            playlistId: playlist.id,
            playlistTitle: playlist.title,
            fetched: 0,
            valid: 0
          })
          continue
        }
      }

      // 수집 통계 로그
      console.log(`📊 [YouTube] 플레이리스트별 수집 통계:`)
      playlistStats.forEach((stat, idx) => {
        console.log(`  ${idx + 1}. "${stat.playlistTitle}" (id=${stat.playlistId}): 조회=${stat.fetched}개, 유효=${stat.valid}개`)
      })
      console.log(`📊 [YouTube] 전체 수집된 영상: ${allVideos.length}개 (중복 포함)`)

      // 3. 게시 날짜 기준으로 정렬 (최신순)
      allVideos.sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )

      // 4. 중복 제거 (동일한 videoId)
      const uniqueVideos = Array.from(
        new Map(allVideos.map(v => [v.id, v])).values()
      )

      console.log(`📊 [YouTube] 중복 제거 후: ${uniqueVideos.length}개 (중복 ${allVideos.length - uniqueVideos.length}개 제거됨)`)
      console.log(`📊 [YouTube] 최종 반환 영상: ${Math.min(uniqueVideos.length, maxVideos)}개 (최대 ${maxVideos}개)`)

      if (uniqueVideos.length === 0) {
        console.error(`❌ [YouTube] 최종 수집된 영상이 0개: userEmail=${userEmail}`)
        console.error(`   플레이리스트 통계:`, JSON.stringify(playlistStats, null, 2))
      } else {
        uniqueVideos.slice(0, maxVideos).forEach((video, idx) => {
          console.log(`  ✅ [YouTube] 최종 영상 ${idx + 1}: id=${video.id}, title="${video.title.substring(0, 50)}${video.title.length > 50 ? '...' : ''}"`)
        })
      }

      return uniqueVideos.slice(0, maxVideos)
    } catch (error: any) {
      console.error(`❌ [YouTube] getRecentSavedVideos 전체 오류: userEmail=${userEmail}`)
      console.error(`   오류 타입: ${error.constructor.name}`)
      console.error(`   오류 메시지: ${error.message}`)
      console.error(`   오류 스택:`, error.stack)
      if (error.response) {
        console.error(`   API 응답 상태: ${error.response.status}`)
        console.error(`   API 응답 데이터:`, JSON.stringify(error.response.data, null, 2))
      }
      return []
    }
  }

  /**
   * 플레이리스트 기반 관심사 분석
   */
  static async analyzeInterestsFromPlaylists(userEmail: string): Promise<{
    playlistCount: number
    interests: string[]
    categories: string[]
  }> {
    try {
      const playlists = await this.getUserPlaylists(userEmail)

      if (playlists.length === 0) {
        return {
          playlistCount: 0,
          interests: [],
          categories: [],
        }
      }

      // 플레이리스트 제목에서 키워드 추출
      const interests = this.extractKeywordsFromTitles(
        playlists.map(p => p.title)
      )

      // 카테고리 분류 (AI, 기술, 음악, 스포츠 등)
      const categories = this.categorizeInterests(interests)

      console.log(`✅ Analyzed ${playlists.length} playlists, found ${interests.length} interests`)

      return {
        playlistCount: playlists.length,
        interests,
        categories,
      }
    } catch (error) {
      console.error('YouTube analysis error:', error)
      return {
        playlistCount: 0,
        interests: [],
        categories: [],
      }
    }
  }

  /**
   * 플레이리스트 제목에서 키워드 추출
   */
  private static extractKeywordsFromTitles(titles: string[]): string[] {
    const keywords = new Set<string>()

    // 공통 불용어
    const stopWords = new Set([
      'playlist', 'video', 'videos', 'music', 'song', 'songs',
      'my', 'the', 'and', 'or', 'to', 'from', 'with',
      '플레이리스트', '동영상', '음악', '노래',
      'watch', 'later', 'liked', 'favorites', '좋아요', '나중에',
    ])

    titles.forEach(title => {
      // 특수문자 제거 및 단어 추출
      const words = title
        .toLowerCase()
        .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2)

      words.forEach(word => {
        if (!stopWords.has(word)) {
          keywords.add(word)
        }
      })

      // 전체 제목도 키워드로 추가 (짧은 경우)
      if (title.length > 2 && title.length < 40) {
        const cleanTitle = title.trim()
        if (!stopWords.has(cleanTitle.toLowerCase())) {
          keywords.add(cleanTitle)
        }
      }
    })

    return Array.from(keywords).slice(0, 30) // 30개로 증가하여 다양성 확보
  }

  /**
   * 관심사 카테고리 분류
   */
  private static categorizeInterests(interests: string[]): string[] {
    const categories = new Set<string>()

    const categoryKeywords: { [key: string]: string[] } = {
      '기술/개발': ['tech', 'code', 'programming', 'developer', 'ai', 'ml', 'data', 'software', '개발', '코딩', '프로그래밍'],
      '음악': ['music', 'kpop', 'jazz', 'rock', 'pop', 'hip-hop', '음악', '노래', 'song'],
      '게임': ['game', 'gaming', 'gameplay', 'playthrough', '게임'],
      '교육': ['tutorial', 'lecture', 'course', 'learn', 'education', '강의', '교육', '배우기'],
      '운동/건강': ['workout', 'fitness', 'health', 'exercise', 'yoga', '운동', '건강', '요가'],
      '요리': ['recipe', 'cooking', 'food', 'chef', '요리', '레시피', '음식'],
      '여행': ['travel', 'tour', 'vlog', 'vacation', '여행', '관광'],
      '영화/드라마': ['movie', 'drama', 'film', 'series', '영화', '드라마'],
      '스포츠': ['sports', 'soccer', 'baseball', 'basketball', '축구', '야구', '농구'],
      '뉴스': ['news', 'current', 'affairs', '뉴스', '시사'],
    }

    interests.forEach(interest => {
      const lowerInterest = interest.toLowerCase()
      
      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        if (keywords.some(keyword => lowerInterest.includes(keyword))) {
          categories.add(category)
        }
      })
    })

    return Array.from(categories).slice(0, 5)
  }

  /**
   * Access Token 조회 및 자동 갱신
   */
  private static async getAccessToken(userEmail: string): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: {
          connectedServices: true,
          accounts: true,
        },
      })

      if (!user) {
        return null
      }

      // 먼저 ConnectedService에서 YouTube 토큰 찾기
      const youtubeService = user.connectedServices.find(s => s.serviceName === 'youtube')
      if (youtubeService?.accessToken && youtubeService.refreshToken) {
        // 토큰 만료 확인
        if (youtubeService.expiresAt && youtubeService.expiresAt > new Date()) {
          return youtubeService.accessToken
        }

        // 토큰이 만료되었으면 갱신
        console.log('🔄 YouTube: Refreshing expired access token...')
        try {
          const refreshedToken = await this.refreshAccessToken(youtubeService.refreshToken)
          
          // ConnectedService 업데이트
          await prisma.connectedService.update({
            where: { id: youtubeService.id },
            data: {
              accessToken: refreshedToken.access_token,
              expiresAt: new Date(Date.now() + refreshedToken.expires_in * 1000),
              refreshToken: refreshedToken.refresh_token || youtubeService.refreshToken,
            },
          })
          
          console.log('✅ YouTube: Access token refreshed successfully')
          return refreshedToken.access_token
        } catch (error) {
          console.error('❌ YouTube: Failed to refresh access token:', error)
          return null
        }
      }

      // Account 테이블에서 Google OAuth 토큰 찾기
      const googleAccount = user.accounts.find(a => a.provider === 'google')
      if (googleAccount?.access_token) {
        // 토큰 만료 확인
        const now = Math.floor(Date.now() / 1000)
        if (googleAccount.expires_at && googleAccount.expires_at > now) {
          return googleAccount.access_token
        }

        // 토큰이 만료되었고 refresh_token이 있으면 갱신
        if (googleAccount.refresh_token) {
          console.log('🔄 YouTube: Refreshing expired access token from Account...')
          try {
            const refreshedToken = await this.refreshAccessToken(googleAccount.refresh_token)
            
            // DB 업데이트
            await prisma.account.update({
              where: { id: googleAccount.id },
              data: {
                access_token: refreshedToken.access_token,
                expires_at: Math.floor(Date.now() / 1000) + refreshedToken.expires_in,
                refresh_token: refreshedToken.refresh_token || googleAccount.refresh_token,
              },
            })
            
            // ConnectedService도 업데이트
            if (youtubeService) {
              await prisma.connectedService.update({
                where: { id: youtubeService.id },
                data: {
                  accessToken: refreshedToken.access_token,
                  expiresAt: new Date(Date.now() + refreshedToken.expires_in * 1000),
                  refreshToken: refreshedToken.refresh_token || googleAccount.refresh_token,
                },
              })
            }
            
            console.log('✅ YouTube: Access token refreshed successfully')
            return refreshedToken.access_token
          } catch (error) {
            console.error('❌ YouTube: Failed to refresh access token:', error)
            return null
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error getting access token:', error)
      return null
    }
  }

  /**
   * Access Token 갱신
   */
  private static async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    expires_in: number
    refresh_token?: string
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to refresh token')
    }

    return await response.json()
  }
}
