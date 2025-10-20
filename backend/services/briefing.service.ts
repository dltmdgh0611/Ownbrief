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
  type: 'status' | 'collected' | 'script' | 'audio-chunk' | 'complete' | 'error' | 'intro' | 'background-music' | 'section-start' | 'section-audio'
  data: any
}

/**
 * 브리핑 생성 및 관리 서비스
 */
export class BriefingService {
  /**
   * 실시간 스트리밍 브리핑 생성 (순차적 데이터 수집 + 실시간 음성 합성)
   */
  static async *generateStreamingBriefing(userEmail: string): AsyncGenerator<BriefingStreamEvent> {
    try {
      console.log(`🎙️ Starting real-time briefing generation for: ${userEmail}`)

      // 1. 입장 멘트 및 배경음악 시작
      yield { type: 'intro', data: '브리핑을 시작합니다...' }
      yield { type: 'background-music', data: { action: 'start', volume: 0.3 } }

      // 페르소나 가져오기
      const persona = await PersonaService.getPersona(userEmail)
      const userName = ''

      // 입장 멘트 생성 및 음성 합성
      const introScript = `좋은 아침입니다${userName}! 오늘도 멋진 하루를 시작해볼까요? 잠시만요, 오늘의 브리핑을 준비해드리겠습니다.`
      yield { type: 'section-start', data: { section: 'intro', script: introScript } }
      
      // 입장 멘트 음성 생성 (실제 TTS는 추후 구현)
      yield { type: 'section-audio', data: { section: 'intro', audioUrl: await this.generateTTS(introScript) } }

      // 2. 순차적 데이터 수집 및 브리핑
      const sections = [
        { name: 'calendar', title: '오늘의 일정', client: CalendarClient, method: 'getTodayEvents' },
        { name: 'gmail', title: '중요 메일', client: GmailClient, method: 'analyzeRecentEmails' },
        { name: 'slack', title: '팀 커뮤니케이션', client: SlackClient, method: 'analyzeCommunicationStyle' },
        { name: 'notion', title: '업무 진행 상황', client: NotionClient, method: 'analyzeWorkStyle' },
        { name: 'youtube', title: '관심사 트렌드', client: null, method: 'getYouTubeInterests' },
      ]

      const collectedData: any = {}

      // 첫 번째 섹션만 먼저 처리
      const firstSection = sections[0]
      if (firstSection) {
        try {
          yield { type: 'status', data: `${firstSection.title} 수집 중...` }
          
          // 첫 번째 섹션 데이터 수집
          let data = null
          if (firstSection.name === 'youtube') {
            data = await this.getYouTubeInterests(userEmail, 3)
          } else {
            data = await (firstSection.client as any)[firstSection.method](userEmail)
          }
          
          collectedData[firstSection.name] = data || []
          yield { type: 'collected', data: { section: firstSection.name, data } }

          // 첫 번째 섹션 브리핑 스크립트 생성
          const sectionScript = await this.generateSectionScript(firstSection.name, data, persona)
          
          if (sectionScript) {
            yield { type: 'section-start', data: { section: firstSection.name, script: sectionScript } }
            console.log(`🎵 첫 번째 섹션 준비 완료: ${firstSection.title}`)
          }

        } catch (error) {
          console.error(`Error collecting ${firstSection.name}:`, error)
        }
      }

      // 3. 마무리 멘트
      const outroScript = '오늘 하루도 화이팅하세요! 브리핑을 마치겠습니다.'
      yield { type: 'section-start', data: { section: 'outro', script: outroScript } }
      yield { type: 'section-audio', data: { section: 'outro', audioUrl: await this.generateTTS(outroScript) } }

      // 4. 배경음악 페이드아웃
      yield { type: 'background-music', data: { action: 'fadeout', duration: 2000 } }

      // 5. 브리핑 레코드 생성
      const fullScript = `브리핑이 완료되었습니다. 총 ${sections.length}개 섹션을 처리했습니다.`
      const briefingId = await this.createBriefingRecord(userEmail, fullScript, collectedData)

      yield { 
        type: 'complete', 
        data: { 
          briefingId, 
          duration: 180, // 예상 3분
          sections: Object.keys(collectedData)
        } 
      }

      console.log('✅ Real-time briefing generation complete')
    } catch (error) {
      console.error('❌ Real-time briefing generation error:', error)
      yield { 
        type: 'error', 
        data: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * 다음 섹션 미리 생성 (비동기)
   */
  static async prefetchNextSection(section: any, userEmail: string, persona: Persona | null): Promise<void> {
    try {
      console.log(`🎵 다음 섹션 미리 생성: ${section.title}`)
      
      // 데이터 수집
      let data = null
      if (section.name === 'youtube') {
        data = await this.getYouTubeInterests(userEmail, 3)
      } else {
        data = await (section.client as any)[section.method](userEmail)
      }

      // 스크립트 생성
      const sectionScript = await this.generateSectionScript(section.name, data, persona)
      
      if (sectionScript) {
        console.log(`🎵 다음 섹션 TTS 준비 완료: ${section.title}`)
        // 실제 TTS 생성은 클라이언트에서 처리
      }
    } catch (error) {
      console.error(`다음 섹션 미리 생성 오류 (${section.name}):`, error)
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
  static async getYouTubeInterests(userEmail: string, limit = 3): Promise<any[]> {
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
   * TTS 음성 생성 (Gemini TTS 사용)
   */
  private static async generateTTS(text: string): Promise<string> {
    try {
      // TODO: 실제 Gemini TTS API 호출
      // 현재는 임시로 더미 URL 반환
      console.log(`🎵 Generating TTS for: ${text.substring(0, 50)}...`)
      
      // 실제 구현 시:
      // const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
      // const audioResponse = await model.generateContent({
      //   contents: [{ parts: [{ text } }] },
      //   generationConfig: { audioConfig: { voice: 'korean-female' } }
      // })
      
      return `https://example.com/audio/${Date.now()}.mp3`
    } catch (error) {
      console.error('TTS generation error:', error)
      return ''
    }
  }

  /**
   * 섹션별 브리핑 스크립트 생성
   */
  static async generateSectionScript(sectionName: string, data: any, persona: Persona | null): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
      
      const prompt = this.buildSectionPrompt(sectionName, data, persona)
      const result = await model.generateContent(prompt)
      const script = result.response.text()
      
      return script.trim()
    } catch (error) {
      console.error(`Section script generation error for ${sectionName}:`, error)
      return this.generateFallbackSectionScript(sectionName, data)
    }
  }

  /**
   * 섹션별 프롬프트 생성
   */
  private static buildSectionPrompt(sectionName: string, data: any, persona: Persona | null): string {
    const userName = ''
    
    switch (sectionName) {
      case 'calendar':
        return `지시: 모든 문장은 자연스러운 한국어(존댓말)로만 작성하고, 불필요한 영어 표현을 사용하지 마세요.
오늘의 일정을 브리핑해주세요. 자연스럽고 친근한 대화체로 작성하세요. 이전 인사(인트로)에서 부드럽게 이어지는 연결 문장 1문장을 맨 앞에 넣으세요.

## 일정 데이터
${data && data.length > 0 ? JSON.stringify(data, null, 2) : '일정이 없습니다'}

## 브리핑 형식
- "오늘은 [시간]에 [일정명]이 있습니다" 형식
- 중요한 일정 우선 언급
- 시간 순서대로 정리
- 여러 캘린더의 일정이 있다면 캘린더별로 구분해서 언급
- 마지막에 "메일에도 확인할 게 몇 가지 있네요."와 같이 다음 섹션(메일)로 넘어가는 연결 문장 1문장 포함
- 총 25~35초 분량으로 간결하게

브리핑을 작성하세요:`

      case 'gmail':
        return `지시: 모든 문장은 자연스러운 한국어(존댓말)로만 작성하고, 불필요한 영어 표현을 사용하지 마세요.
중요 메일만 간결하게 브리핑하세요. 광고/알림/뉴스레터는 절대 포함하지 마세요.

## 메일 데이터 (이미 필터됨)
${data && data.length > 0 ? JSON.stringify(data, null, 2) : '새로운 중요 메일이 없습니다'}

## 작성 규칙
- 최대 2건만 소개: 가장 중요한 것부터
- 형식: "[보낸 사람]의 [제목] 관련 메일이 왔습니다. 핵심은 [한 줄 요약]."
- 연결 문장 포함: 이전 섹션에서 부드럽게 넘어오도록 1문장
- 마무리 문장 포함: 다음 섹션(예: 슬랙)으로 자연스럽게 넘기는 1문장
- 총 25~35초 분량, 존대체, 친근하고 간결하게

브리핑을 작성하세요:`

      case 'work':
        return `지시: 모든 문장은 자연스러운 한국어(존댓말)로만 작성하고, 불필요한 영어 표현을 사용하지 마세요.
슬랙과 노션의 업무 업데이트를 **하나의 섹션으로 통합**해 브리핑하세요. 연동이 안 된 서비스 데이터는 스킵하세요.

## 데이터 (예: { slack: [...], notion: [...] })
${data ? JSON.stringify(data, null, 2) : '{ slack: [], notion: [] }'}

## 작성 규칙
- 앞에 연결 문장 1문장(메일에서 자연스럽게 이어짐)
- 슬랙/노션 모두 비어있으면 "오늘은 별도 업데이트가 없었습니다"로 간단히 종료
- 있으면 핵심 2~3개만 요약(담당자/작업명/기한 등)
- 마지막에 다음 섹션(관심사 뉴스)로 넘어가는 연결 문장 1문장
- 25~35초 분량, 간결하고 친근하게

브리핑을 작성하세요:`

      case 'notion':
        return `업무 진행 상황을 브리핑해주세요. 자연스럽고 친근한 대화체로 작성하세요. 이전 섹션에서 자연스럽게 이어지는 연결 문장 1문장을 맨 앞에 넣고, 마지막에는 다음 섹션으로 넘어가는 연결 문장을 1문장 포함하세요.

## Notion 데이터
${data && data.length > 0 ? JSON.stringify(data, null, 2) : '업데이트된 작업이 없습니다'}

## 브리핑 형식
- "업데이트된 작업이 있습니다" 또는 "새로운 업데이트는 없습니다"
- 중요한 작업 내용 요약
- 총 30초 분량으로 간결하게

브리핑을 작성하세요:`

      case 'interests':
        return `지시: 모든 문장은 자연스러운 한국어(존댓말)로만 작성하고, 불필요한 영어 표현을 사용하지 마세요.
"${userName}님의 관심사 트렌드"를 브리핑하세요. 
외부 검색이나 RSS 같은 추가 호출 없이, **모델이 가진 일반 지식**과 "사용자 페르소나의 관심 키워드"를 바탕으로 **비즈니스 관련 최신 경향을 일반화하여** 설명합니다. 
특정 기사/출처/날짜/수치처럼 **검증 불가한 구체 정보는 언급하지 말고**, 확정적 단정 대신 **보수적 표현(최근, 점차, 주목받는 등)**을 사용하세요. 뉴스 인용/헤드라인 나열 금지.

## 데이터 (사용자 관심사 키워드 및 힌트)
${data && data.interests && data.interests.length > 0 ? JSON.stringify(data.interests, null, 2) : '관심사 데이터 없음'}

## 작성 규칙
- 앞에 연결 문장 1문장(업무 섹션에서 자연스럽게 이어짐)
- 2~3개의 관심사 축으로 묶어 흐름 있게 설명 (사례는 **가상의 예시**로 표현)
- 실무에 유용한 **인사이트/시사점**과 **간단한 액션 제안** 포함
- 마지막에 오늘의 하이라이트 1~2문장으로 정리
- **뉴스레터 톤**, **2~3분 분량** 허용(조금 길어도 됨)
- 다음 섹션(마무리)으로 부드럽게 넘어가는 연결 문장을 마지막에 포함하세요.

브리핑을 작성하세요:`

      case 'outro':
        return `지시: 모든 문장은 자연스러운 한국어(존댓말)로만 작성하고, 불필요한 영어 표현을 사용하지 마세요.
관심사 트렌드 브리핑에서 부드럽게 이어지는 마무리 인사를 작성하세요.

## 작성 규칙
- 앞에 연결 문장 1문장(관심사 섹션에서 자연스럽게 이어짐)
- 오늘 하루에 대한 격려와 마무리 인사
- 간단하고 따뜻한 톤으로 작성
- 브리핑 종료를 명확히 알림

마무리 인사를 작성하세요:`

      default:
        return ''
    }
  }

  /**
   * 폴백 섹션 스크립트 생성
   */
  private static generateFallbackSectionScript(sectionName: string, data: any): string {
    switch (sectionName) {
      case 'calendar':
        return data && data.length > 0 
          ? `오늘은 총 ${data.length}개의 일정이 있습니다.`
          : '오늘은 특별한 일정이 없습니다.'
      
      case 'gmail':
        return data && data.length > 0 
          ? `확인하지 않은 중요 메일이 ${data.length}개 있습니다.`
          : '새로운 중요 메일은 없습니다.'
      
      case 'slack':
        return data && data.length > 0 
          ? `새로운 멘션이 ${data.length}개 있습니다.`
          : '새로운 멘션은 없습니다.'
      
      case 'notion':
        return data && data.length > 0 
          ? `업데이트된 작업이 ${data.length}개 있습니다.`
          : '새로운 업데이트는 없습니다.'
      
      case 'youtube':
        return data && data.length > 0 
          ? `관심사 관련 트렌드가 ${data.length}개 있습니다.`
          : '새로운 트렌드는 없습니다.'
      
      default:
        return ''
    }
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
          calendar: data.calendar?.length || 0,
          gmail: data.gmail?.length || 0,
          slack: data.slack?.length || 0,
          notion: data.notion?.length || 0,
          youtube: data.youtube?.length || 0,
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



