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
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        console.log('YouTube: No access token found')
        return []
      }

      const youtube = google.youtube({ version: 'v3' })
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })

      const response = await youtube.playlists.list({
        auth,
        part: ['snippet', 'contentDetails'],
        mine: true,
        maxResults,
      })

      const playlists = response.data.items || []

      return playlists.map(playlist => ({
        id: playlist.id!,
        title: playlist.snippet?.title || '제목 없음',
        description: playlist.snippet?.description || '',
        itemCount: playlist.contentDetails?.itemCount || 0,
      }))
    } catch (error) {
      console.error('YouTube API error:', error)
      return []
    }
  }

  /**
   * 최근 저장한 영상 가져오기 (여러 플레이리스트에서)
   */
  static async getRecentSavedVideos(userEmail: string, maxVideos = 5): Promise<YoutubeVideo[]> {
    try {
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        console.log('YouTube: No access token found')
        return []
      }

      const youtube = google.youtube({ version: 'v3' })
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })

      const allVideos: YoutubeVideo[] = []

      // 1. 사용자의 플레이리스트 가져오기
      const playlists = await this.getUserPlaylists(userEmail, 10)

      // 2. 각 플레이리스트에서 최신 영상 가져오기
      for (const playlist of playlists) {
        try {
          const playlistItems = await youtube.playlistItems.list({
            auth,
            part: ['snippet', 'contentDetails'],
            playlistId: playlist.id,
            maxResults: 3, // 각 플레이리스트에서 최대 3개
          })

          const items = playlistItems.data.items || []
          
          items.forEach(item => {
            const snippet = item.snippet
            if (snippet?.title && snippet.title !== 'Private video' && snippet.title !== 'Deleted video') {
              allVideos.push({
                id: item.contentDetails?.videoId || item.id || '',
                title: snippet.title,
                description: snippet.description || '',
                channelTitle: snippet.channelTitle || '',
                publishedAt: snippet.publishedAt || '',
                thumbnailUrl: snippet.thumbnails?.default?.url || undefined,
              })
            }
          })

          if (allVideos.length >= maxVideos * 2) {
            break // 충분히 모았으면 중단
          }
        } catch (error) {
          console.error(`Error fetching playlist ${playlist.id}:`, error)
          continue
        }
      }

      // 3. 게시 날짜 기준으로 정렬 (최신순)
      allVideos.sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )

      // 4. 중복 제거 (동일한 videoId)
      const uniqueVideos = Array.from(
        new Map(allVideos.map(v => [v.id, v])).values()
      )

      console.log(`✅ Found ${uniqueVideos.length} recent videos from playlists`)

      return uniqueVideos.slice(0, maxVideos)
    } catch (error) {
      console.error('YouTube getRecentSavedVideos error:', error)
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
   * Access Token 조회
   */
  private static async getAccessToken(userEmail: string): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: {
          accounts: true,
        },
      })

      if (!user) {
        return null
      }

      // Account 테이블에서 Google OAuth 토큰 찾기
      const googleAccount = user.accounts.find(a => a.provider === 'google')
      if (googleAccount?.access_token) {
        return googleAccount.access_token
      }

      return null
    } catch (error) {
      console.error('Error getting access token:', error)
      return null
    }
  }
}
