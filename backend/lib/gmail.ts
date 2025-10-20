import { google } from 'googleapis'
import { prisma } from './prisma'

export interface GmailMessage {
  id: string
  threadId: string
  from: string
  subject: string
  snippet: string
  date: string
  isUnread: boolean
  labels: string[]
}

/**
 * Gmail API 클라이언트
 */
export class GmailClient {
  /**
   * 미읽음 중요 메일 조회
   */
  static async getUnreadImportant(userEmail: string, limit = 5): Promise<GmailMessage[]> {
    try {
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        console.log('Gmail: No access token found')
        return []
      }

      const gmail = google.gmail({ version: 'v1' })
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })

      // 미읽음 + (중요 또는 받은편지함) 메시지 검색
      const response = await gmail.users.messages.list({
        auth,
        userId: 'me',
        q: 'is:unread (is:important OR in:inbox)',
        maxResults: limit,
      })

      const messages = response.data.messages || []
      
      // 각 메시지의 상세 정보 가져오기
      const detailedMessages = await Promise.all(
        messages.map(async (msg) => {
          try {
            const detail = await gmail.users.messages.get({
              auth,
              userId: 'me',
              id: msg.id!,
              format: 'metadata',
              metadataHeaders: ['From', 'Subject', 'Date'],
            })

            const headers = detail.data.payload?.headers || []
            const from = headers.find(h => h.name === 'From')?.value || '알 수 없음'
            const subject = headers.find(h => h.name === 'Subject')?.value || '제목 없음'
            const date = headers.find(h => h.name === 'Date')?.value || ''
            
            return {
              id: msg.id!,
              threadId: msg.threadId!,
              from,
              subject,
              snippet: detail.data.snippet || '',
              date,
              isUnread: true,
              labels: detail.data.labelIds || [],
            }
          } catch (error) {
            console.error('Error fetching message details:', error)
            return null
          }
        })
      )

      const emails = (detailedMessages.filter(Boolean) as GmailMessage[])
        .map(m => ({
          ...m,
          from: m.from.replace(/\"/g, ''),
          subject: m.subject.trim(),
        }))

      // 광고/알림/뉴스레터 등 제거
      const blockedSenderPatterns = [
        /no-?reply/i,
        /mailer-daemon/i,
        /notification/i,
        /noreply/i,
      ]
      const blockedSubjectPatterns = [
        /광고/i,
        /프로모션/i,
        /promotion/i,
        /newsletter/i,
        /뉴스레터/i,
        /알림/i,
        /공지/i,
        /업데이트/i,
      ]

      const filtered = emails.filter((email) => {
        // 라벨 기반 필터 (프로모션/소셜 제외)
        const labels = email.labels || []
        const hasPromo = labels.includes('CATEGORY_PROMOTIONS')
        const hasSocial = labels.includes('CATEGORY_SOCIAL')
        if (hasPromo || hasSocial) return false

        // 발신자 키워드 필터
        if (blockedSenderPatterns.some((re) => re.test(email.from))) return false
        // 제목 키워드 필터
        if (blockedSubjectPatterns.some((re) => re.test(email.subject))) return false

        return true
      })

      // 중요도 휴리스틱: 제목에 액션성 키워드가 있는 것 우선, 최신순
      const actionKeywords = [/확인/i, /승인/i, /서명/i, /결제/i, /응답/i, /마감/i, /회의/i]
      const scored = filtered.map(e => {
        const score = (actionKeywords.some(re => re.test(e.subject)) ? 2 : 0) + (e.labels.includes('IMPORTANT') ? 1 : 0)
        return { email: e, score }
      })
      .sort((a,b) => b.score - a.score || new Date(b.email.date).getTime() - new Date(a.email.date).getTime())
      .slice(0, Math.min(2, limit)) // 상위 1~2개만 선택
      .map(s => s.email)

      return scored
    } catch (error) {
      console.error('Gmail API error:', error)
      return []
    }
  }

  /**
   * 메일 요약 생성 (Gemini AI 사용)
   */
  static async summarizeEmail(email: GmailMessage): Promise<string> {
    try {
      // 간단한 요약 로직
      const fromName = email.from.split('<')[0].trim()
      const summary = email.snippet.substring(0, 100)
      
      return `${fromName}님의 "${email.subject}" - ${summary}...`
    } catch (error) {
      console.error('Error summarizing email:', error)
      return `${email.subject}`
    }
  }

  /**
   * 최근 100개 메일 분석 (페르소나 생성용) - 광고 필터링 강화
   */
  static async analyzeRecentEmails(userEmail: string): Promise<{
    totalEmails: number
    topSenders: string[]
    realInterests: string[]
    projectKeywords: string[]
    communicationStyle: 'formal' | 'casual' | 'mixed'
  }> {
    try {
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        console.log('Gmail access token not found for user:', userEmail)
        return {
          totalEmails: 0,
          topSenders: [],
          realInterests: [],
          projectKeywords: [],
          communicationStyle: 'mixed',
        }
      }

      const gmail = google.gmail({ version: 'v1' })
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })

      // 최근 100개 메일 가져오기 (광고 제외)
      let response
      try {
        response = await gmail.users.messages.list({
          auth,
          userId: 'me',
          q: '-category:promotions -category:social -is:spam', // 광고, SNS, 스팸 제외
          maxResults: 100,
        })
      } catch (apiError: any) {
        console.error('Gmail API 호출 오류:', apiError.message)
        if (apiError.message?.includes('invalid_grant') || apiError.message?.includes('Invalid Credentials')) {
          throw new Error('invalid_grant: Gmail 권한이 필요합니다.')
        }
        throw apiError
      }

      const messages = response.data.messages || []
      
      const senderCounts: { [key: string]: number } = {}
      const nonAdSubjects: string[] = []
      const emailBodies: string[] = []

      await Promise.all(
        messages.map(async (msg) => {
          try {
            const detail = await gmail.users.messages.get({
              auth,
              userId: 'me',
              id: msg.id!,
              format: 'full',
            })

            const headers = detail.data.payload?.headers || []
            const from = headers.find(h => h.name === 'From')?.value || ''
            const subject = headers.find(h => h.name === 'Subject')?.value || ''
            
            // 광고성 발신자 필터링 (no-reply, noreply, marketing, promo 등)
            const isAdEmail = /no-?reply|marketing|promo|newsletter|notification|info@|support@/i.test(from)
            
            if (!isAdEmail && from) {
              const email = from.match(/<(.+)>/)?.[1] || from
              senderCounts[email] = (senderCounts[email] || 0) + 1
            }
            
            // 광고성 제목 필터링
            const isAdSubject = /unsubscribe|구독|광고|홍보|프로모션|할인|세일|event|특가/i.test(subject)
            
            if (!isAdSubject && subject && !isAdEmail) {
              nonAdSubjects.push(subject)
              
              // 본문 일부 추출 (첫 200자)
              const body = this.extractEmailBody(detail.data.payload)
              if (body) {
                emailBodies.push(body.substring(0, 200))
              }
            }
          } catch (error) {
            // 개별 메시지 에러는 무시
          }
        })
      )

      // Top 5 발신자 (광고 제외)
      const topSenders = Object.entries(senderCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([email]) => email)

      // 진짜 관심사 추출 (AI 기반)
      const realInterests = await this.extractRealInterests(nonAdSubjects, emailBodies)

      // 프로젝트 키워드 추출 (개선된 휴리스틱)
      const projectKeywords = this.extractProjectKeywords(nonAdSubjects)

      return {
        totalEmails: messages.length,
        topSenders,
        realInterests,
        projectKeywords,
        communicationStyle: 'mixed',
      }
    } catch (error: any) {
      console.error('Gmail analysis error:', error)
      
      // OAuth 에러는 상위로 전파
      if (error.code === 401 || 
          error.message?.includes('invalid_grant') ||
          error.message?.includes('invalid authentication credentials') ||
          error.response?.status === 401) {
        throw new Error('invalid_grant: Gmail 권한이 필요합니다.')
      }
      
      return {
        totalEmails: 0,
        topSenders: [],
        realInterests: [],
        projectKeywords: [],
        communicationStyle: 'mixed',
      }
    }
  }

  /**
   * 이메일 본문 추출 (HTML/텍스트)
   */
  private static extractEmailBody(payload: any): string {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8')
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
      }
    }

    return ''
  }

  /**
   * 진짜 관심사 추출 (제목과 본문 기반) - 강력한 필터링
   */
  private static async extractRealInterests(subjects: string[], bodies: string[]): Promise<string[]> {
    try {
      // 빈도 기반 키워드 추출
      const allText = [...subjects, ...bodies].join(' ')
      const words = allText
        .toLowerCase()
        .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2)
      
      // 강력한 불용어 및 쓸데없는 키워드 제거
      const stopWords = new Set([
        // 기본 불용어
        'the', 'and', 'for', 'with', 'from', 'about', 'this', 'that',
        'have', 'been', 'were', 'was', 'are', 'will', 'can', 'you', 'your',
        'our', 'their', 'them', 'they', 'his', 'her', 'its', 'all',
        // 한글 불용어
        '있습니다', '입니다', '합니다', '하는', '되는', '것입니다', '있는', '없는',
        // 이메일 관련
        'email', 'mail', 'message', 'reply', 'sent', 'received', 'inbox',
        // URL 관련
        'http', 'https', 'www', 'com', 'net', 'org', 'html', 'htm', 'url',
        // 일반적인 단어
        'image', 'click', 'here', 'link', 'view', 'see', 'more', 'read',
        'hello', 'dear', 'regards', 'thanks', 'best', 'sincerely',
        // 숫자나 날짜
        'today', 'yesterday', 'tomorrow', '오늘', '어제', '내일',
      ])
      
      // 사람 이름 패턴 (대문자로 시작하는 단독 단어) 제거
      const isLikelyName = (word: string) => {
        return /^[A-Z][a-z]+$/.test(word) && word.length < 12
      }
      
      const wordCounts: { [key: string]: number } = {}
      words.forEach(word => {
        // 필터링 조건
        if (
          !stopWords.has(word) && 
          word.length > 2 && 
          word.length < 20 && // 너무 긴 단어 제외
          !isLikelyName(word) && // 이름 제외
          !/^\d+$/.test(word) && // 순수 숫자 제외
          !/^[a-z]{1,2}$/.test(word) // 1-2글자 영문 제외
        ) {
          wordCounts[word] = (wordCounts[word] || 0) + 1
        }
      })

      // 빈도 높은 키워드 추출 (2회 이상으로 완화) - 다양성 극대화
      const interests = Object.entries(wordCounts)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30) // 30개로 증가하여 다양한 카테고리 포착
        .map(([word]) => word)

      return interests
    } catch (error) {
      console.error('Error extracting real interests:', error)
      return []
    }
  }

  /**
   * 프로젝트 키워드 추출 (개선된 휴리스틱)
   */
  private static extractProjectKeywords(subjects: string[]): string[] {
    const projectPatterns = [
      /프로젝트\s*[:\-]?\s*(\w+)/gi,
      /project\s*[:\-]?\s*(\w+)/gi,
      /\[([^\]]+)\]/g, // [프로젝트명]
      /\(([^)]+)\)/g,  // (프로젝트명)
      /re:\s*([^:]+)/gi, // Re: 프로젝트명
    ]

    const projects = new Set<string>()
    
    subjects.forEach(subject => {
      projectPatterns.forEach(pattern => {
        const matches = Array.from(subject.matchAll(pattern))
        for (const match of matches) {
          const keyword = match[1]?.trim()
          if (keyword && keyword.length > 2 && keyword.length < 30) {
            projects.add(keyword)
          }
        }
      })
    })

    return Array.from(projects).slice(0, 5)
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

      // 먼저 ConnectedService에서 찾기
      const googleService = user.connectedServices.find(s => s.serviceName === 'google')
      if (googleService?.accessToken) {
        return googleService.accessToken
      }

      // Account 테이블에서 찾기
      const googleAccount = user.accounts.find(a => a.provider === 'google')
      if (googleAccount?.access_token) {
        // 토큰 만료 확인
        const now = Math.floor(Date.now() / 1000)
        if (googleAccount.expires_at && googleAccount.expires_at > now) {
          return googleAccount.access_token
        }

        // 토큰이 만료되었고 refresh_token이 있으면 갱신
        if (googleAccount.refresh_token) {
          console.log('🔄 Gmail: Refreshing expired access token...')
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
            
            console.log('✅ Gmail: Access token refreshed successfully')
            return refreshedToken.access_token
          } catch (error) {
            console.error('❌ Gmail: Failed to refresh access token:', error)
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


