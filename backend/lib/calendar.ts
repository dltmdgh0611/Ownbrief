import { google } from 'googleapis'
import { prisma } from './prisma'

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: string
  end: string
  location?: string
  attendees?: string[]
  calendarName?: string // 캘린더 이름
  calendarId?: string // 캘린더 ID
}

/**
 * Google Calendar API 클라이언트
 */
export class CalendarClient {
  /**
   * 사용자의 오늘 일정 조회 (모든 캘린더 포함)
   */
  static async getTodayEvents(userEmail: string, limit = 10): Promise<CalendarEvent[]> {
    try {
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        console.log('Calendar: No access token found')
        return []
      }

      const calendar = google.calendar({ version: 'v3' })
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // 1. 먼저 사용자가 접근 가능한 모든 캘린더 목록 가져오기
      const calendarListResponse = await calendar.calendarList.list({
        auth,
        minAccessRole: 'reader', // 읽기 권한 이상인 캘린더만
      })

      const calendarList = calendarListResponse.data.items || []
      console.log(`📅 접근 가능한 캘린더 수: ${calendarList.length}`)
      
      // 2. 각 캘린더에서 오늘 일정 가져오기
      const allEvents: CalendarEvent[] = []
      
      for (const cal of calendarList) {
        try {
          const response = await calendar.events.list({
            auth,
            calendarId: cal.id!,
            timeMin: today.toISOString(),
            timeMax: tomorrow.toISOString(),
            maxResults: limit,
            singleEvents: true,
            orderBy: 'startTime',
          })

          const events = response.data.items || []
          
          const calendarEvents = events.map(event => ({
            id: event.id!,
            summary: event.summary || '제목 없음',
            description: event.description || undefined,
            start: event.start?.dateTime || event.start?.date || '',
            end: event.end?.dateTime || event.end?.date || '',
            location: event.location || undefined,
            attendees: event.attendees?.map(a => a.email).filter(Boolean) as string[],
            calendarName: cal.summary || cal.id || undefined, // 캘린더 이름 추가
            calendarId: cal.id || undefined,
          }))
          
          allEvents.push(...calendarEvents)
          console.log(`📅 ${cal.summary || cal.id}: ${events.length}개 일정`)
          
        } catch (calError) {
          console.warn(`⚠️ 캘린더 ${cal.summary || cal.id} 일정 조회 실패:`, calError)
          // 개별 캘린더 오류는 무시하고 계속 진행
        }
      }

      // 3. 시간순으로 정렬하고 제한된 수만 반환
      const sortedEvents = allEvents.sort((a, b) => {
        const timeA = new Date(a.start).getTime()
        const timeB = new Date(b.start).getTime()
        return timeA - timeB
      })

      console.log(`📅 총 ${sortedEvents.length}개 일정 수집 완료`)
      return sortedEvents.slice(0, limit)
      
    } catch (error) {
      console.error('Calendar API error:', error)
      return []
    }
  }

  /**
   * 사용자의 내일 일정 조회
   */
  static async getTomorrowEvents(userEmail: string, limit = 5): Promise<CalendarEvent[]> {
    try {
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        return []
      }

      const calendar = google.calendar({ version: 'v3' })
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const dayAfterTomorrow = new Date(tomorrow)
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

      const response = await calendar.events.list({
        auth,
        calendarId: 'primary',
        timeMin: tomorrow.toISOString(),
        timeMax: dayAfterTomorrow.toISOString(),
        maxResults: limit,
        singleEvents: true,
        orderBy: 'startTime',
      })

      const events = response.data.items || []
      
      return events.map(event => ({
        id: event.id!,
        summary: event.summary || '제목 없음',
        description: event.description || undefined,
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        location: event.location || undefined,
        attendees: event.attendees?.map(a => a.email).filter(Boolean) as string[],
      }))
    } catch (error) {
      console.error('Calendar API error:', error)
      return []
    }
  }

  /**
   * 최근 30일간의 일정 패턴 분석 (페르소나 생성용)
   */
  static async analyzeRecentEvents(userEmail: string): Promise<{
    totalEvents: number
    averageEventsPerDay: number
    meetingFrequency: 'high' | 'medium' | 'low'
    preferredTimeSlots: string[]
  }> {
    try {
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        return {
          totalEvents: 0,
          averageEventsPerDay: 0,
          meetingFrequency: 'low',
          preferredTimeSlots: [],
        }
      }

      const calendar = google.calendar({ version: 'v3' })
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const now = new Date()

      const response = await calendar.events.list({
        auth,
        calendarId: 'primary',
        timeMin: thirtyDaysAgo.toISOString(),
        timeMax: now.toISOString(),
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
      })

      const events = response.data.items || []
      const totalEvents = events.length
      const averageEventsPerDay = totalEvents / 30

      let meetingFrequency: 'high' | 'medium' | 'low' = 'low'
      if (averageEventsPerDay > 3) {
        meetingFrequency = 'high'
      } else if (averageEventsPerDay > 1) {
        meetingFrequency = 'medium'
      }

      // 선호 시간대 분석
      const timeSlotCounts: { [key: string]: number } = {
        morning: 0,
        afternoon: 0,
        evening: 0,
      }

      events.forEach(event => {
        const startTime = event.start?.dateTime
        if (startTime) {
          const hour = new Date(startTime).getHours()
          if (hour >= 6 && hour < 12) {
            timeSlotCounts.morning++
          } else if (hour >= 12 && hour < 18) {
            timeSlotCounts.afternoon++
          } else if (hour >= 18 && hour < 22) {
            timeSlotCounts.evening++
          }
        }
      })

      const preferredTimeSlots = Object.entries(timeSlotCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([slot]) => slot)

      return {
        totalEvents,
        averageEventsPerDay,
        meetingFrequency,
        preferredTimeSlots,
      }
    } catch (error: any) {
      console.error('Calendar analysis error:', error)
      
      // OAuth 에러는 상위로 전파 (페르소나 생성에서 처리)
      if (error.code === 401 || 
          error.message?.includes('invalid_grant') ||
          error.message?.includes('invalid authentication credentials') ||
          error.response?.status === 401) {
        throw new Error('invalid_grant: Google Calendar 권한이 필요합니다.')
      }
      
      return {
        totalEvents: 0,
        averageEventsPerDay: 0,
        meetingFrequency: 'low',
        preferredTimeSlots: [],
      }
    }
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

      // 먼저 ConnectedService에서 Calendar 토큰 찾기
      const calendarService = user.connectedServices.find(s => s.serviceName === 'calendar')
      if (calendarService?.accessToken && calendarService.refreshToken) {
        // 토큰 만료 확인
        if (calendarService.expiresAt && calendarService.expiresAt > new Date()) {
          return calendarService.accessToken
        }

        // 토큰이 만료되었으면 갱신
        console.log('🔄 Calendar: Refreshing expired access token from ConnectedService...')
        try {
          const refreshedToken = await this.refreshAccessToken(calendarService.refreshToken)
          
          // ConnectedService 업데이트
          await prisma.connectedService.update({
            where: { id: calendarService.id },
            data: {
              accessToken: refreshedToken.access_token,
              expiresAt: new Date(Date.now() + refreshedToken.expires_in * 1000),
              refreshToken: refreshedToken.refresh_token || calendarService.refreshToken,
            },
          })
          
          console.log('✅ Calendar: Access token refreshed successfully')
          return refreshedToken.access_token
        } catch (error) {
          console.error('❌ Calendar: Failed to refresh access token:', error)
          return null
        }
      }

      // Account 테이블에서 찾기 (fallback - 주로 초기 로그인 시)
      const googleAccount = user.accounts.find(a => a.provider === 'google')
      if (googleAccount?.access_token) {
        // 토큰 만료 확인
        const now = Math.floor(Date.now() / 1000)
        if (googleAccount.expires_at && googleAccount.expires_at > now) {
          return googleAccount.access_token
        }

        // 토큰이 만료되었고 refresh_token이 있으면 갱신
        if (googleAccount.refresh_token) {
          console.log('🔄 Calendar: Refreshing expired access token from Account...')
          try {
            const refreshedToken = await this.refreshAccessToken(googleAccount.refresh_token)
            
            // Account 업데이트
            await prisma.account.update({
              where: { id: googleAccount.id },
              data: {
                access_token: refreshedToken.access_token,
                expires_at: Math.floor(Date.now() / 1000) + refreshedToken.expires_in,
                refresh_token: refreshedToken.refresh_token || googleAccount.refresh_token,
              },
            })
            
            // ConnectedService도 업데이트
            if (calendarService) {
              await prisma.connectedService.update({
                where: { id: calendarService.id },
                data: {
                  accessToken: refreshedToken.access_token,
                  expiresAt: new Date(Date.now() + refreshedToken.expires_in * 1000),
                  refreshToken: refreshedToken.refresh_token || googleAccount.refresh_token,
                },
              })
            }
            
            console.log('✅ Calendar: Access token refreshed successfully')
            return refreshedToken.access_token
          } catch (error) {
            console.error('❌ Calendar: Failed to refresh access token:', error)
            return null
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error getting Calendar access token:', error)
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


