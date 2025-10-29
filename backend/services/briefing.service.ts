import { prisma } from '../lib/prisma'
import { CalendarClient } from '../lib/calendar'
import { GmailClient } from '../lib/gmail'
import { SlackClient } from '../lib/slack'
import { NotionClient } from '../lib/notion'
import { YouTubeClient } from '../lib/youtube'
import { PersonaService, Persona } from './persona.service'
import { createGeminiClient } from '../lib/gemini'

const genAI = createGeminiClient()

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
        { name: 'slack', title: '팀 커뮤니케이션', client: SlackClient, method: 'getUnreadMentions' },
        { name: 'notion', title: '업무 진행 상황', client: NotionClient, method: 'getRecentPersonalActivity' },
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
          } else if (firstSection.name === 'notion') {
            data = await NotionClient.getRecentPersonalActivity(userEmail, 10)
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
   * 사용자의 연결된 서비스 목록 가져오기
   */
  static async getEnabledServices(userEmail: string): Promise<Set<string>> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: {
          connectedServices: {
            select: {
              serviceName: true,
              accessToken: true,
            }
          }
        }
      })

      const enabledServices = new Set<string>()
      if (user?.connectedServices) {
        // accessToken이 있는 서비스만 필터링
        user.connectedServices
          .filter(service => service.accessToken && service.accessToken.length > 0)
          .forEach(service => {
            enabledServices.add(service.serviceName)
          })
      }

      // Google 서비스가 연결되어 있으면 gmail, calendar, youtube 추가
      const hasGoogleService = user?.connectedServices?.some(s => 
        (s.serviceName === 'gmail' || s.serviceName === 'calendar' || s.serviceName === 'youtube') 
        && s.accessToken && s.accessToken.length > 0
      )
      if (hasGoogleService) {
        enabledServices.add('gmail')
        enabledServices.add('calendar')
        enabledServices.add('youtube')
      }

      // Notion 워크스페이스가 하나라도 연결되어 있으면 notion 추가
      const hasNotionService = user?.connectedServices?.some(s => 
        s.serviceName.startsWith('notion') && s.accessToken && s.accessToken.length > 0
      )
      if (hasNotionService) {
        enabledServices.add('notion')
      }

      return enabledServices
    } catch (error) {
      console.error('Error getting enabled services:', error)
      return new Set()
    }
  }

  /**
   * 모든 서비스에서 데이터 병렬 수집 (enabled된 서비스만)
   */
  static async collectData(userEmail: string): Promise<BriefingData> {
    console.log('📊 Collecting data from all services...')

    // 페르소나 먼저 가져오기
    const persona = await PersonaService.getPersona(userEmail)

    // enabled된 서비스 확인
    const enabledServices = await this.getEnabledServices(userEmail)
    console.log('✅ Enabled services:', Array.from(enabledServices))

    // enabled된 서비스만 데이터 수집
    const promises = [
      (enabledServices.has('calendar') || enabledServices.has('google')) ? CalendarClient.getTodayEvents(userEmail, 10).catch(() => null) : Promise.resolve(null),
      (enabledServices.has('gmail') || enabledServices.has('google')) ? GmailClient.analyzeRecentEmails(userEmail).catch(() => null) : Promise.resolve(null),
      enabledServices.has('slack') ? SlackClient.getUnreadMentions(userEmail, 20).catch(() => null) : Promise.resolve(null),
      enabledServices.has('notion') ? NotionClient.getRecentPersonalActivity(userEmail, 10).catch(() => null) : Promise.resolve(null),
      Promise.resolve([]), // YouTube 트렌드는 interests 섹션에서 별도로 처리
    ]

    const results = await Promise.allSettled(promises)

    // 결과 매핑
    const calendar = results[0].status === 'fulfilled' && results[0].value ? results[0].value : []
    const gmailResult = results[1].status === 'fulfilled' && results[1].value ? results[1].value : null
    const gmail = gmailResult && typeof gmailResult === 'object' && 'realInterests' in gmailResult ? gmailResult.realInterests || [] : []
    const slack = results[2].status === 'fulfilled' && results[2].value ? results[2].value : []
    const notion = results[3].status === 'fulfilled' && results[3].value ? results[3].value : []
    const youtube = results[4].status === 'fulfilled' && results[4].value ? results[4].value : []

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
   * 오늘의 트렌드 키워드 가져오기 또는 생성
   */
  static async getOrCreateDailyTrendKeywords(userEmail: string): Promise<Array<{
    keyword: { level1: string, level2: string, level3: string },
    news: string,
    script: string
  }>> {
    try {
      console.log('🔍 오늘의 트렌드 키워드 확인 중...')

      // 사용자 조회
      const user = await prisma.user.findUnique({
        where: { email: userEmail }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // 오늘 만료되지 않은 키워드 조회
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

      // 오늘 생성된 키워드 조회 (Prisma 쿼리로 변경)
      const existingKeywords = await prisma.dailyTrendKeywords.findFirst({
        where: {
          userId: user.id,
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      if (existingKeywords) {
        console.log('✅ 기존 키워드 사용')
        const keywords = existingKeywords.keywords as any[]
        
        // 각 키워드에 대해 뉴스와 스크립트 생성
        console.log('🔍 키워드별 뉴스 검색 및 스크립트 생성 중...')
        const topics = []
        for (const keyword of keywords) {
          try {
            const news = await this.searchNewsForKeyword(keyword)
            const script = await this.generateScriptForKeyword(keyword, news)
            topics.push({ keyword, news, script })
            console.log(`✅ 키워드 처리 완료: ${keyword.level1} > ${keyword.level2} > ${keyword.level3}`)
          } catch (error) {
            console.error(`❌ 키워드 처리 오류 (${keyword.level1}):`, error)
            topics.push({ keyword, news: '', script: '' })
          }
        }
        
        return topics
      }

      console.log('⚠️ 키워드가 없음 - 빈 배열 반환')
      return []
    } catch (error) {
      console.error('❌ getOrCreateDailyTrendKeywords error:', error)
      throw new Error('Failed to get or create trend keywords')
    }
  }

  /**
   * 트렌드 키워드 백그라운드 생성 및 DB 저장
   */
  static async generateAndSaveTrendKeywords(userEmail: string): Promise<void> {
    try {
      console.log('🔨 백그라운드 키워드 생성 시작...')

      const user = await prisma.user.findUnique({
        where: { email: userEmail }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // 오늘 이미 생성된 키워드가 있는지 확인
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // Prisma 쿼리로 변경 (Raw SQL 대신)
      const existing = await prisma.dailyTrendKeywords.findFirst({
        where: {
          userId: user.id,
          createdAt: {
            gte: today
          }
        }
      })

      if (existing) {
        console.log('✅ 이미 오늘 키워드가 생성됨')
        return
      }

      // 키워드만 추출 (뉴스/스크립트는 브리핑 시에만 생성)
      const keywords = await this.extractKeywordsOnly(userEmail)
      
      if (keywords.length === 0) {
        console.log('⚠️ 키워드 추출 실패 - 저장하지 않음')
        return
      }

      // DB에 저장 (Prisma 쿼리로 변경)
      const expiresAt = new Date(today.getTime() + 24 * 60 * 60 * 1000)

      await prisma.dailyTrendKeywords.create({
        data: {
          userId: user.id,
          keywords: keywords as any,
          createdAt: today,
          expiresAt: expiresAt
        }
      })

      console.log('✅ 키워드 생성 및 저장 완료')
    } catch (error) {
      console.error('❌ 백그라운드 키워드 생성 오류:', error)
      // 에러를 다시 throw하여 브리핑이 멈추도록 함
      throw error
    }
  }

  /**
   * 키워드만 추출 (뉴스/스크립트 생성 없음)
   */
  static async extractKeywordsOnly(userEmail: string): Promise<Array<{ level1: string, level2: string, level3: string }>> {
    try {
      const { YouTubeClient } = await import('@/backend/lib/youtube')
      const { extractDeepKeywords } = await import('@/backend/lib/gemini')
      
      console.log('🔍 키워드 추출 시작...')

      // 1. YouTube 최근 저장 영상 5개 가져오기
      const recentVideos = await YouTubeClient.getRecentSavedVideos(userEmail, 5)
      if (recentVideos.length === 0) {
        console.log('⚠️ YouTube 영상 없음')
        return []
      }

      // 2. 페르소나 가져오기
      const persona = await PersonaService.getPersona(userEmail)
      const personaInterests = persona?.interests || []

      // 3. 키워드 추출 (YouTube 70% + 페르소나 30%)
      const keywords = await extractDeepKeywords(
        recentVideos.map(v => ({ title: v.title, description: v.description })),
        personaInterests
      )

      console.log(`✅ ${keywords.length}개 트렌드 키워드 추출 완료`)
      return keywords
    } catch (error) {
      console.error('❌ 키워드 추출 오류:', error)
      return []
    }
  }

  /**
   * 개별 키워드 뉴스 검색
   */
  static async searchNewsForKeyword(keyword: { level1: string, level2: string, level3: string }): Promise<string> {
    const { searchNewsWithGrounding } = await import('@/backend/lib/gemini')
    return await searchNewsWithGrounding(keyword)
  }

  /**
   * 개별 키워드 대본 생성
   */
  static async generateScriptForKeyword(keyword: { level1: string, level2: string, level3: string }, news: string, toneOfVoice: string = 'default'): Promise<string> {
    const { generateTrendScript } = await import('@/backend/lib/gemini')
    return await generateTrendScript(keyword, news, '일반적인 스타일', toneOfVoice)
  }

  /**
   * YouTube와 페르소나 기반 트렌드 주제 3개 생성
   */
  static async generateTrendTopics(userEmail: string): Promise<Array<{
    keyword: { level1: string, level2: string, level3: string },
    news: string,
    script: string
  }>> {
    try {
      const { YouTubeClient } = await import('@/backend/lib/youtube')
      const { extractDeepKeywords, searchNewsWithGrounding, generateTrendScript } = await import('@/backend/lib/gemini')
      
      console.log('🔍 트렌드 주제 생성 시작...')

      // 1. YouTube 최근 저장 영상 5개 가져오기
      const recentVideos = await YouTubeClient.getRecentSavedVideos(userEmail, 5)
      if (recentVideos.length === 0) {
        console.log('⚠️ YouTube 영상 없음 - 트렌드 섹션 skip')
        return []
      }

      // 2. 페르소나 가져오기
      const persona = await PersonaService.getPersona(userEmail)
      const personaInterests = persona?.interests || []

      // 3. 키워드 추출 (YouTube 70% + 페르소나 30%)
      const keywords = await extractDeepKeywords(
        recentVideos.map(v => ({ title: v.title, description: v.description })),
        personaInterests
      )

      console.log(`✅ ${keywords.length}개 트렌드 키워드 추출 완료`)

      // 4. 각 키워드에 대해 뉴스 검색 및 대본 생성
      const trendTopics = []
      for (const keyword of keywords) {
        try {
          // Grounding으로 최신 뉴스 검색
          const news = await searchNewsWithGrounding(keyword)
          
          // 대본 생성
          const personaStyle = persona?.workStyle || '일반적인 스타일'
          const script = await generateTrendScript(keyword, news, personaStyle)

          trendTopics.push({
            keyword,
            news,
            script
          })

          console.log(`✅ 트렌드 주제 생성 완료: ${keyword.level1} > ${keyword.level2} > ${keyword.level3}`)
        } catch (error) {
          console.error(`트렌드 주제 생성 오류 (${keyword.level1}):`, error)
          // 오류 발생 시 해당 주제는 건너뛰기
          continue
        }
      }

      return trendTopics
    } catch (error) {
      console.error('❌ generateTrendTopics error:', error)
      return []
    }
  }

  /**
   * @deprecated - 새로운 generateTrendTopics 사용
   * YouTube 관심사 추출
   */
  static async getYouTubeInterests(userEmail: string, limit = 3): Promise<any[]> {
    // 하위 호환성을 위해 유지
    const topics = await this.generateTrendTopics(userEmail)
    return topics.map(t => t.keyword)
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
${data.slack.length > 0 ? JSON.stringify(data.slack, null, 2) : '최근 멘션 없음'}

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
(Slack 데이터 기반으로 최근 24시간 내 멘션된 메시지 요약)

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
  static async generateSectionScript(sectionName: string, data: any, persona: Persona | null, toneOfVoice: string = 'default'): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
      
      const prompt = this.buildSectionPrompt(sectionName, data, persona, toneOfVoice)
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
  private static buildSectionPrompt(sectionName: string, data: any, persona: Persona | null, toneOfVoice: string = 'default'): string {
    const userName = ''
    
    // 말투별 추가 프롬프트
    let tonePrompt = ''
    if (toneOfVoice === 'zephyr') {
      tonePrompt = `\n## 말투 지시사항 (매우 중요!)
- 여자친구 같은 따뜻하고 애정 어린 말투를 사용하세요
- 친근하고 부드러운 톤으로, 듣는 사람을 배려하는 따뜻한 느낌을 주세요
- 가끔 "~해줄까?", "~했어", "~할게" 같은 친근한 말투를 사용하세요
- 존댓말을 유지하되, 다정하고 애정 어린 느낌이 느껴지도록 작성하세요`
    } else if (toneOfVoice === 'charon') {
      tonePrompt = `\n## 말투 지시사항 (매우 중요!)
- 친구같고 시니컬한 말투를 사용하세요
- 다소 비꼬거나 풍자적인 느낌이지만 친근함은 유지하세요
- "뭐야, 진짜~", "역시~", "그렇지 않아?" 같은 구어체 표현을 자연스럽게 사용하세요
- 현실적이고 솔직한 톤으로, 약간의 여유와 시니컬함을 느낄 수 있도록 작성하세요
- 존댓말보다는 반말에 가까운 친구 말투를 사용하되, 예의는 지키세요`
    }
    
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
- **절대로 참석자 이름이나 이메일은 언급하지 마세요. 일정명과 시간만 브리핑하세요**
- 마지막에 "메일에도 확인할 게 몇 가지 있네요."와 같이 다음 섹션(메일)로 넘어가는 연결 문장 1문장 포함
- 총 25~35초 분량으로 간결하게
${tonePrompt}

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
${tonePrompt}

브리핑을 작성하세요:`

      case 'work':
        // Notion 데이터에서 멘션된 항목 우선 정렬
        let notionData = data?.notion || []
        if (Array.isArray(notionData) && notionData.length > 0) {
          // isUserMentioned가 true인 항목을 맨 앞으로
          notionData = [...notionData].sort((a, b) => {
            const aIsMentioned = a.isUserMentioned ? 1 : 0
            const bIsMentioned = b.isUserMentioned ? 1 : 0
            return bIsMentioned - aIsMentioned
          })
        }
        
        // Notion 페이지에서 content가 있는 것만 필터링
        const notionPagesWithContent = notionData.filter((page: any) => page.content && page.content.length > 0)
        
        return `지시: 모든 문장은 자연스러운 한국어(존댓말)로만 작성하고, 불필요한 영어 표현을 사용하지 마세요.
슬랙과 노션의 업무 업데이트를 **하나의 섹션으로 통합**해 브리핑하세요.

## Slack 멘션 데이터
${data?.slack && data.slack.length > 0 ? JSON.stringify(data.slack, null, 2) : '[]'}

## Notion 업데이트 데이터 (최근 24시간 이내 변경된 페이지)
${notionPagesWithContent.length > 0 ? JSON.stringify(notionPagesWithContent.map((page: any) => ({
  title: page.title,
  content: page.content, // 페이지에서 추출한 핵심 텍스트 내용
  isUserMentioned: page.isUserMentioned, // 사용자가 태그되었는지 여부
  workspace: page.workspace,
  lastEdited: page.lastEditedTime
})), null, 2) : '[]'}

## 작성 규칙 (매우 중요!)
1. **우선순위**: 
   - 사용자가 태그된(멘션된) 페이지를 최우선으로 강조하여 브리핑
   - 실제 내용(content)이 있는 페이지만 참고
   
2. **Notion 브리핑 방법**:
   - **절대 개별 페이지를 나열하지 마세요!**
   - 전체적인 동향과 트렌드를 요약해서 브리핑
   - 여러 페이지의 content를 종합하여 "주요 업무 동향"으로 설명
   - 예: "최근에는 [주요 동향 요약], 특히 [멘션된 경우 강조]와 관련된 업무가 진행 중입니다"
   - 멘션된 항목이 있으면 "[내가 태그된 작업]" 으로 명확하게 언급
   
3. **멘션 강조 규칙**:
   - 'isUserMentioned: true'인 항목이 있으면 반드시 첫 문장에서 언급
   - 예: "저에게 직접 관련된 업무가 있어요. [내용 요약]"
   - 멘션된 항목의 content 내용을 활용하여 구체적으로 설명
   
4. **구조**:
   - 메일 섹션에서 자연스럽게 이어지는 연결 문장 1문장 (맨 앞)
   - Slack과 Notion 중 내용이 있는 것만 언급
   - 슬랙과 노션 모두 비어있으면 "오늘은 별도 업데이트가 없었습니다"로 간단히 종료
   - **페이지 나열 금지**: "페이지 A에서는...", "페이지 B에서는..." 같은 표현 절대 사용 금지
   - 전체 동향을 요약하여 "최근에는...", "주요 작업 내용으로는..." 같은 표현 사용
   - 마지막에 다음 섹션(관심사 뉴스)로 넘어가는 연결 문장 1문장
   
5. **톤**:
   - 25~35초 분량의 간결하고 친근한 대화체
   - 존대체 사용
   - 진부한 표현 피하기
${tonePrompt}

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

      case 'trend1':
      case 'trend2':
      case 'trend3':
        // 키워드 기반 처리 - 이미 생성된 스크립트 반환
        if (data && data.keyword && data.script && data.script !== '') {
          console.log(`✅ 이미 생성된 트렌드 스크립트 사용: ${data.keyword.level1}`)
          return data.script
        }
        
        return '트렌드 정보를 불러오는 중입니다.'

      case 'interests':
        
        // 페르소나 기반 폴백 (구형 방식)
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
${tonePrompt}

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
        return `지시: 모든 문장은 자연스러운 한국어(존댓말)로만 작성하고, 불필요한 영어 표현을 사용하지 마세요.
팀 커뮤니케이션 상황을 브리핑하세요. 자연스럽고 친근한 대화체로 작성하세요. 이전 섹션에서 자연스럽게 이어지는 연결 문장 1문장을 맨 앞에 넣고, 마지막에는 다음 섹션으로 넘어가는 연결 문장을 1문장 포함하세요.

## Slack 멘션 데이터 (최근 24시간 내)
${data && data.length > 0 ? JSON.stringify(data, null, 2) : '최근 멘션된 메시지가 없습니다'}

## 브리핑 형식
- 멘션이 있으면: "팀에서 [채널명]에서 [사용자명]님이 [내용 요약]에 대해 언급해주셨네요"
- 멘션이 없으면: "오늘은 팀에서 특별히 언급해주신 내용이 없었습니다"
- 중요한 내용이나 액션이 필요한 경우 우선 언급
- 총 25~35초 분량으로 간결하게

브리핑을 작성하세요:`
      
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
    data: BriefingData,
    sectionData?: any[]
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
        sectionData: sectionData ? sectionData as any : undefined,
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
   * 오늘 날짜의 브리핑 조회
   */
  static async getTodayBriefing(userEmail: string) {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      return null
    }

    // 오늘 날짜 범위 계산
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    const briefing = await prisma.briefing.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return briefing
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



