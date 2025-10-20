import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { CalendarClient } from '@/backend/lib/calendar'
import { GmailClient } from '@/backend/lib/gmail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 개발자 모드 API 테스트 엔드포인트
 * GET /api/dev/test-calendar - Calendar API 테스트
 * GET /api/dev/test-gmail - Gmail API 테스트
 * GET /api/dev/test-session - 세션 정보 확인
 */

export async function GET(request: NextRequest) {
  // 개발 모드가 아니면 접근 차단
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const url = new URL(request.url)
  const testType = url.searchParams.get('type')

  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '로그인이 필요합니다'
      }, { status: 401 })
    }

    const userEmail = session.user.email

    switch (testType) {
      case 'calendar':
        return await testCalendarAPI(userEmail)
      
      case 'gmail':
        return await testGmailAPI(userEmail)
      
      case 'session':
        return await testSession(session)
      
      case 'all':
        return await testAllAPIs(userEmail, session)
      
      default:
        return NextResponse.json({
          success: false,
          error: 'INVALID_TYPE',
          message: '지원하지 않는 테스트 타입입니다. type=calendar|gmail|session|all'
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Dev API test error:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message || '알 수 없는 오류가 발생했습니다'
    }, { status: 500 })
  }
}

async function testCalendarAPI(userEmail: string) {
  const startTime = Date.now()
  
  try {
    const events = await CalendarClient.getTodayEvents(userEmail, 5)
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      service: 'Calendar API',
      duration: duration,
      data: {
        eventCount: events.length,
        events: events.map(event => ({
          id: event.id,
          summary: event.summary,
          start: event.start,
          end: event.end,
          calendarName: event.calendarName,
          calendarId: event.calendarId
        })),
        calendars: Array.from(new Set(events.map(e => e.calendarName).filter(Boolean)))
      }
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: false,
      service: 'Calendar API',
      duration: duration,
      error: error.message || 'Calendar API 테스트 실패'
    }, { status: 500 })
  }
}

async function testGmailAPI(userEmail: string) {
  const startTime = Date.now()
  
  try {
    const emails = await GmailClient.getUnreadImportant(userEmail, 5)
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      service: 'Gmail API',
      duration: duration,
      data: {
        emailCount: emails.length,
        emails: emails.map(email => ({
          id: email.id,
          subject: email.subject,
          from: email.from,
          date: email.date
        }))
      }
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: false,
      service: 'Gmail API',
      duration: duration,
      error: error.message || 'Gmail API 테스트 실패'
    }, { status: 500 })
  }
}

async function testSession(session: any) {
  return NextResponse.json({
    success: true,
    service: 'Session',
    data: {
      user: {
        id: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
        image: session.user?.image
      },
      hasAccessToken: !!session.accessToken,
      expiresAt: session.expires
    }
  })
}

async function testAllAPIs(userEmail: string, session: any) {
  const results = []
  
  // Calendar 테스트
  try {
    const calendarResult = await testCalendarAPI(userEmail)
    const calendarData = await calendarResult.json()
    results.push({
      service: 'Calendar',
      ...calendarData
    })
  } catch (error) {
    results.push({
      service: 'Calendar',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  // Gmail 테스트
  try {
    const gmailResult = await testGmailAPI(userEmail)
    const gmailData = await gmailResult.json()
    results.push({
      service: 'Gmail',
      ...gmailData
    })
  } catch (error) {
    results.push({
      service: 'Gmail',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  // Session 테스트
  try {
    const sessionResult = await testSession(session)
    const sessionData = await sessionResult.json()
    results.push({
      service: 'Session',
      ...sessionData
    })
  } catch (error) {
    results.push({
      service: 'Session',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  return NextResponse.json({
    success: true,
    service: 'All APIs',
    results: results,
    summary: {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  })
}
