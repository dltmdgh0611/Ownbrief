import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { CalendarClient } from '@/backend/lib/calendar'
import { GmailClient } from '@/backend/lib/gmail'
import { SlackClient } from '@/backend/lib/slack'
import { NotionClient } from '@/backend/lib/notion'
import { BriefingService } from '@/backend/services/briefing.service'
import { PersonaService } from '@/backend/services/persona.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 개발자 모드 API 테스트 엔드포인트
 * GET /api/dev/test?type=calendar - Calendar API 테스트
 * GET /api/dev/test?type=gmail - Gmail API 테스트
 * GET /api/dev/test?type=slack - Slack API 테스트
 * GET /api/dev/test?type=notion - Notion API 테스트
 * GET /api/dev/test?type=work-script - Work 섹션(노션/슬랙) 브리핑 스크립트 테스트
 * GET /api/dev/test?type=session - 세션 정보 확인
 * GET /api/dev/test?type=all - 모든 API 테스트
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
      
      case 'slack':
        return await testSlackAPI(userEmail)
      
      case 'notion':
        return await testNotionAPI(userEmail)
      
      case 'work-script':
        return await testWorkScript(userEmail)
      
      case 'session':
        return await testSession(session)
      
      case 'all':
        return await testAllAPIs(userEmail, session)
      
      default:
        return NextResponse.json({
          success: false,
          error: 'INVALID_TYPE',
          message: '지원하지 않는 테스트 타입입니다. type=calendar|gmail|slack|notion|work-script|session|all'
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

async function testSlackAPI(userEmail: string) {
  const startTime = Date.now()
  
  try {
    console.log('🧪 Dev API에서 Slack 테스트 시작:', userEmail)
    const mentions = await SlackClient.getUnreadMentions(userEmail, 10)
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      service: 'Slack API',
      duration: duration,
      data: {
        mentionCount: mentions.length,
        mentions: mentions.map(mention => ({
          channel: mention.channelName,
          user: mention.userName,
          text: mention.text.substring(0, 100) + (mention.text.length > 100 ? '...' : ''),
          timestamp: mention.timestamp,
          timeAgo: new Date(parseFloat(mention.timestamp) * 1000).toISOString()
        })),
        channels: Array.from(new Set(mentions.map(m => m.channelName))),
        users: Array.from(new Set(mentions.map(m => m.userName)))
      }
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: false,
      service: 'Slack API',
      duration: duration,
      error: error.message || 'Slack API 테스트 실패',
      stack: error.stack
    }, { status: 500 })
  }
}

async function testNotionAPI(userEmail: string) {
  const startTime = Date.now()
  
  try {
    console.log('🧪 Dev API에서 Notion 테스트 시작:', userEmail)
    const pages = await NotionClient.getRecentPersonalActivity(userEmail, 10)
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      service: 'Notion API',
      duration: duration,
      data: {
        pageCount: pages.length,
        pages: pages.map(page => ({
          id: page.id,
          title: page.title,
          url: page.url,
          lastEdited: page.lastEditedTime,
          workspace: page.workspace,
          timeAgo: new Date(page.lastEditedTime).toLocaleString('ko-KR'),
          content: page.content || '', // 추출된 텍스트 내용
          contentLength: (page.content || '').length,
          isUserMentioned: page.isUserMentioned || false
        })),
        workspaces: Array.from(new Set(pages.map(p => p.workspace)))
      }
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: false,
      service: 'Notion API',
      duration: duration,
      error: error.message || 'Notion API 테스트 실패',
      stack: error.stack
    }, { status: 500 })
  }
}

async function testWorkScript(userEmail: string) {
  const startTime = Date.now()
  
  try {
    console.log('🧪 Dev API에서 Work 스크립트 테스트 시작:', userEmail)
    
    // 1. 슬랙과 노션 데이터 가져오기
    const [slackData, notionData, persona] = await Promise.all([
      SlackClient.getUnreadMentions(userEmail, 20).catch(() => []),
      NotionClient.getRecentPersonalActivity(userEmail, 10).catch(() => []),
      PersonaService.getPersona(userEmail).catch(() => null)
    ])
    
    console.log(`✅ 데이터 수집 완료: slack=${slackData.length}, notion=${notionData.length}`)
    
    // 2. work 섹션 데이터 준비
    const workData = {
      slack: slackData,
      notion: notionData
    }
    
    // 3. 브리핑 스크립트 생성
    console.log('📝 브리핑 스크립트 생성 중...')
    const script = await BriefingService.generateSectionScript('work', workData, persona)
    const duration = Date.now() - startTime
    
    console.log(`✅ 브리핑 스크립트 생성 완료: ${script.length}자`)
    
    return NextResponse.json({
      success: true,
      service: 'Work Script',
      duration: duration,
      data: {
        slackCount: slackData.length,
        notionCount: notionData.length,
        notionPagesWithContent: notionData.filter((p: any) => p.content && p.content.length > 0).length,
        script: script,
        scriptLength: script.length,
        workData: {
          slack: slackData.map((m: any) => ({
            channel: m.channelName,
            user: m.userName,
            text: m.text?.substring(0, 100)
          })),
          notion: notionData.map((p: any) => ({
            title: p.title,
            content: p.content,
            contentLength: (p.content || '').length,
            isUserMentioned: p.isUserMentioned,
            workspace: p.workspace
          }))
        }
      }
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: false,
      service: 'Work Script',
      duration: duration,
      error: error.message || 'Work 스크립트 생성 실패',
      stack: error.stack
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
  
  // Slack 테스트
  try {
    const slackResult = await testSlackAPI(userEmail)
    const slackData = await slackResult.json()
    results.push({
      service: 'Slack',
      ...slackData
    })
  } catch (error) {
    results.push({
      service: 'Slack',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
  
  // Notion 테스트
  try {
    const notionResult = await testNotionAPI(userEmail)
    const notionData = await notionResult.json()
    results.push({
      service: 'Notion',
      ...notionData
    })
  } catch (error) {
    results.push({
      service: 'Notion',
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
