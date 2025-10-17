import { prisma } from '../lib/prisma'
import { CalendarClient } from '../lib/calendar'
import { GmailClient } from '../lib/gmail'
import { SlackClient } from '../lib/slack'
import { NotionClient } from '../lib/notion'
import { YouTubeClient } from '../lib/youtube'
import { PersonaService, Persona } from './persona.service'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface BriefingData {
  calendar: any
  gmail: any
  slack: any
  notion: any
  youtube: any
  persona: Persona | null
}

export interface BriefingStreamEvent {
  type: 'status' | 'collected' | 'script' | 'audio-chunk' | 'complete' | 'error'
  data: any
}

/**
 * 브리핑 생성 및 관리 서비스
 */
export class BriefingService {
  /**
   * 스트리밍 브리핑 생성 (AsyncGenerator)
   */
  static async *generateStreamingBriefing(userEmail: string): AsyncGenerator<BriefingStreamEvent> {
    try {
      console.log(`🎙️ Starting briefing generation for: ${userEmail}`)

      // 1. 데이터 수집 (병렬)
      yield { type: 'status', data: '데이터 수집 중...' }
      
      const data = await this.collectData(userEmail)
      
      yield { type: 'collected', data }

      // 2. 스크립트 생성
      yield { type: 'status', data: '스크립트 작성 중...' }
      
      const script = await this.generateScript(data, data.persona)
      
      yield { type: 'script', data: script }

      // 3. TTS 스트리밍 생성
      yield { type: 'status', data: '음성 생성 중...' }

      const briefingId = await this.createBriefingRecord(userEmail, script, data)

      // 4. 오디오 스트리밍 (실제 TTS는 추후 구현)
      // for await (const audioChunk of this.generateStreamingAudio(script)) {
      //   yield { type: 'audio-chunk', data: audioChunk }
      // }

      // 임시: 완료 이벤트
      yield { 
        type: 'complete', 
        data: { 
          briefingId, 
          duration: 180 // 예상 3분
        } 
      }

      console.log('✅ Briefing generation complete')
    } catch (error) {
      console.error('❌ Briefing generation error:', error)
      yield { 
        type: 'error', 
        data: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * 모든 서비스에서 데이터 병렬 수집
   */
  static async collectData(userEmail: string): Promise<BriefingData> {
    console.log('📊 Collecting data from all services...')

    // 페르소나 먼저 가져오기
    const persona = await PersonaService.getPersona(userEmail)

    // 모든 서비스에서 병렬 데이터 수집
    const [calendarResult, gmailResult, slackResult, notionResult, youtubeResult] = 
      await Promise.allSettled([
        CalendarClient.getTodayEvents(userEmail, 10),
        GmailClient.analyzeRecentEmails(userEmail),
        SlackClient.analyzeCommunicationStyle(userEmail),
        NotionClient.analyzeWorkStyle(userEmail),
        this.getYouTubeInterests(userEmail, 3),
      ])

    const calendar = calendarResult.status === 'fulfilled' ? calendarResult.value || [] : []
    const gmail = gmailResult.status === 'fulfilled' ? gmailResult.value?.realInterests || [] : []
    const slack = slackResult.status === 'fulfilled' ? slackResult.value || [] : []
    const notion = notionResult.status === 'fulfilled' ? notionResult.value || [] : []
    const youtube = youtubeResult.status === 'fulfilled' ? youtubeResult.value : []

    console.log('📈 Data collection summary:', {
      calendar: Array.isArray(calendar) ? calendar.length : 0,
      gmail: Array.isArray(gmail) ? gmail.length : 0,
      slack: slack ? 1 : 0,
      notion: notion ? 1 : 0,
      youtube: Array.isArray(youtube) ? youtube.length : 0,
    })

    return {
      calendar,
      gmail,
      slack,
      notion,
      youtube,
      persona,
    }
  }

  /**
   * YouTube 관심사 추출
   */
  private static async getYouTubeInterests(userEmail: string, limit = 3): Promise<any[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: {
          accounts: true,
          userPersona: true,
        },
      })

      if (!user) return []

      const googleAccount = user.accounts.find(a => a.provider === 'google')
      if (!googleAccount?.access_token) return []

      // 관심사 기반으로 추천 영상 검색 (간단히 구현)
      const interests = user.userPersona?.interests || []
      if (interests.length === 0) return []

      // 추후 구현: YouTube 추천 영상 가져오기
      return []
    } catch (error) {
      console.error('YouTube interests error:', error)
      return []
    }
  }

  /**
   * 브리핑 스크립트 생성
   */
  static async generateScript(data: BriefingData, persona: Persona | null): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      const prompt = this.buildBriefingPrompt(data, persona)

      const result = await model.generateContent(prompt)
      const script = result.response.text()

      return script
    } catch (error) {
      console.error('Script generation error:', error)
      
      // 폴백 스크립트
      return this.generateFallbackScript(data)
    }
  }

  /**
   * 브리핑 프롬프트 생성
   */
  private static buildBriefingPrompt(data: BriefingData, persona: Persona | null): string {
    const userName = persona ? '님' : ''

    return `
당신은 개인 비서입니다. 사용자의 하루를 준비할 수 있도록 간결하고 친근한 브리핑을 제공하세요.

## 사용자 페르소나
${persona ? JSON.stringify(persona, null, 2) : '페르소나 정보 없음'}

## 수집된 데이터

### 오늘의 일정 (Google Calendar)
${data.calendar.length > 0 ? JSON.stringify(data.calendar, null, 2) : '일정 없음'}

### 중요 메일 (Gmail)
${data.gmail.length > 0 ? JSON.stringify(data.gmail, null, 2) : '새 메일 없음'}

### 팀 커뮤니케이션 (Slack)
${data.slack.length > 0 ? JSON.stringify(data.slack, null, 2) : 'Slack 연동 안 됨'}

### 업무 진행 (Notion)
${data.notion.length > 0 ? JSON.stringify(data.notion, null, 2) : 'Notion 연동 안 됨'}

### 관심사 트렌드 (YouTube)
${data.youtube.length > 0 ? JSON.stringify(data.youtube, null, 2) : '트렌드 정보 없음'}

## 브리핑 형식
다음 형식으로 자연스러운 대화체로 브리핑을 작성하세요:

[ 인사 및 오늘의 개요 ]
좋은 아침입니다${userName}! 오늘도 멋진 하루를 시작해볼까요?

[ 오늘의 일정 ]
(Calendar 데이터 기반으로 오늘 일정 브리핑)

[ 중요 메일 브리핑 ]
(Gmail 데이터 기반으로 미읽은 중요 메일 요약)

[ 팀 커뮤니케이션 ]
(Slack 데이터 기반으로 멘션된 메시지 요약)

[ 업무 진행 상황 ]
(Notion 데이터 기반으로 최근 업데이트된 작업 요약)

[ 관심사 트렌드 ]
(YouTube 데이터 기반으로 관심사 관련 트렌드)

[ 마무리 인사 ]
오늘 하루도 화이팅하세요!

## 주의사항
- 자연스럽고 친근한 대화체 사용
- 각 섹션을 명확히 구분
- 중요한 정보 우선 언급
- 총 길이: 2-3분 분량
- 데이터가 없는 섹션은 자연스럽게 생략

브리핑을 시작하세요:
`.trim()
  }

  /**
   * 폴백 스크립트 생성 (AI 실패 시)
   */
  private static generateFallbackScript(data: BriefingData): string {
    let script = '좋은 아침입니다! 오늘의 브리핑을 시작하겠습니다.\n\n'

    if (data.calendar.length > 0) {
      script += `[ 오늘의 일정 ]\n오늘은 총 ${data.calendar.length}개의 일정이 있습니다.\n`
      data.calendar.slice(0, 3).forEach((event: any) => {
        script += `- ${event.summary}\n`
      })
      script += '\n'
    }

    if (data.gmail.length > 0) {
      script += `[ 중요 메일 ]\n확인하지 않은 중요 메일이 ${data.gmail.length}개 있습니다.\n\n`
    }

    if (data.slack.length > 0) {
      script += `[ 팀 커뮤니케이션 ]\nSlack에서 ${data.slack.length}개의 새 멘션이 있습니다.\n\n`
    }

    if (data.notion.length > 0) {
      script += `[ 업무 진행 ]\nNotion에서 ${data.notion.length}개의 페이지가 업데이트되었습니다.\n\n`
    }

    script += '오늘도 생산적인 하루 보내세요!'

    return script
  }

  /**
   * 스트리밍 TTS 생성 (추후 구현)
   */
  private static async *generateStreamingAudio(script: string): AsyncGenerator<string> {
    // TODO: Gemini TTS 스트리밍 구현
    // 현재는 임시로 빈 generator
    yield ''
  }

  /**
   * 브리핑 레코드 생성
   */
  private static async createBriefingRecord(
    userEmail: string,
    script: string,
    data: BriefingData
  ): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const briefing = await prisma.briefing.create({
      data: {
        userId: user.id,
        script,
        dataSources: {
          calendar: data.calendar.length,
          gmail: data.gmail.length,
          slack: data.slack.length,
          notion: data.notion.length,
          youtube: data.youtube.length,
        },
      },
    })

    return briefing.id
  }

  /**
   * 최근 브리핑 조회
   */
  static async getLatestBriefing(userEmail: string) {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        briefings: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return user?.briefings[0] || null
  }

  /**
   * 재생 횟수 증가
   */
  static async incrementPlayCount(briefingId: string): Promise<void> {
    await prisma.briefing.update({
      where: { id: briefingId },
      data: {
        playCount: {
          increment: 1,
        },
      },
    })
  }
}



