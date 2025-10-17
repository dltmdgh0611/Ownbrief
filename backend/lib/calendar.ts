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
}

/**
 * Google Calendar API 클라이언트
 */
export class CalendarClient {
  /**
   * 사용자의 오늘 일정 조회
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

      const response = await calendar.events.list({
        auth,
        calendarId: 'primary',
        timeMin: today.toISOString(),
        timeMax: tomorrow.toISOString(),
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
   * Access Token 조회 (ConnectedService 또는 Account 테이블에서)
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

      // 없으면 Account 테이블에서 찾기
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


