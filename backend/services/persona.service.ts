import { prisma } from '../lib/prisma'
import { CalendarClient } from '../lib/calendar'
import { GmailClient } from '../lib/gmail'
import { YouTubeClient } from '../lib/youtube'
import { SlackClient } from '../lib/slack'
import { NotionClient } from '../lib/notion'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface Persona {
  workStyle: 'morning-person' | 'night-owl' | 'flexible'
  interests: string[] // 형식: "대분류(소주제)"
  communicationStyle: 'collaborative' | 'independent' | 'hybrid'
  preferredTime: 'morning' | 'afternoon' | 'evening'
}

export interface PersonaFeedback {
  workStyle?: string
  interests?: string[]
  additionalNotes?: string
}

/**
 * 페르소나 생성 및 관리 서비스
 */
export class PersonaService {
  /**
   * AI 기반 페르소나 자동 생성
   */
  static async generatePersona(userEmail: string): Promise<Persona> {
    try {
      console.log(`🤖 Generating persona for user: ${userEmail}`)

      // 모든 서비스에서 데이터 병렬 수집
      const [calendarAnalysis, gmailAnalysis, youtubeAnalysis, slackAnalysis, notionAnalysis] = await Promise.allSettled([
        CalendarClient.analyzeRecentEvents(userEmail),
        GmailClient.analyzeRecentEmails(userEmail),
        YouTubeClient.analyzeInterestsFromPlaylists(userEmail),
        SlackClient.analyzeCommunicationStyle(userEmail),
        NotionClient.analyzeWorkStyle(userEmail),
      ])

      // 성공한 데이터만 추출
      const calendarData = calendarAnalysis.status === 'fulfilled' ? calendarAnalysis.value : null
      const gmailData = gmailAnalysis.status === 'fulfilled' ? gmailAnalysis.value : null
      const youtubeData = youtubeAnalysis.status === 'fulfilled' ? youtubeAnalysis.value : null
      const slackData = slackAnalysis.status === 'fulfilled' ? slackAnalysis.value : null
      const notionData = notionAnalysis.status === 'fulfilled' ? notionAnalysis.value : null

      console.log('📊 Collected data:', {
        calendar: !!calendarData,
        gmail: !!gmailData,
        youtube: !!youtubeData,
        slack: !!slackData,
        notion: !!notionData,
      })

      // Gemini AI로 페르소나 생성
      const persona = await this.generatePersonaWithAI({
        calendarData,
        gmailData,
        youtubeData,
        slackData,
        notionData,
      })

      // DB에 저장
      await this.savePersona(userEmail, persona)

      console.log('✅ Persona generated successfully')
      return persona
    } catch (error) {
      console.error('❌ Error generating persona:', error)
      
      // 기본 페르소나 반환
      return {
        workStyle: 'flexible',
        interests: [],
        communicationStyle: 'hybrid',
        preferredTime: 'morning',
      }
    }
  }

  /**
   * Gemini AI로 페르소나 생성
   */
  private static async generatePersonaWithAI(data: {
    calendarData: any
    gmailData: any
    youtubeData: any
    slackData: any
    notionData: any
  }): Promise<Persona> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      const prompt = `
당신은 사용자 행동 분석 전문가입니다. 다음 데이터를 바탕으로 사용자의 **다양한 관심사**를 균형있게 분석하세요.

## Calendar 데이터
${JSON.stringify(data.calendarData, null, 2)}

## Gmail 데이터 (광고 제외, 진짜 관심사) - **70% 비중**
${JSON.stringify(data.gmailData, null, 2)}

## YouTube 플레이리스트 분석 - **30% 비중**
${JSON.stringify(data.youtubeData, null, 2)}

## Slack 데이터
${JSON.stringify(data.slackData, null, 2)}

## Notion 데이터
${JSON.stringify(data.notionData, null, 2)}

## 중요: 분석 방법 (다양성 우선!)
1. **다양성 확보**: 한 분야에 집중하지 말고, 여러 카테고리에서 골고루 추출
2. **데이터 비중**: Gmail 70% + YouTube 30% 비중으로 관심사 분석
3. **광고 필터링**: 광고성 키워드, 사람 이름, URL(www, http 등)은 완전히 무시
4. **카테고리 분산**: 같은 카테고리는 최대 2개까지만, 최소 5개 이상의 다른 카테고리 포함

## 관심사 키워드 규칙 (매우 중요!)
- **형식**: 간결한 영문 키워드 (예: "Computer Vision AI", "Growth Hacking", "Stock Market")
- **추출 가능한 모든 카테고리** (비중 작아도 포함):
  - 기술: AI, Machine Learning, Computer Vision, Robotics, Deep Tech
  - 개발: Web Development, Mobile Apps, DevOps, API
  - 데이터: Data Analysis, Big Data, Database
  - 비즈니스: Startup Founders, Entrepreneurship, Strategy
  - 마케팅: Growth Hacking, Content Marketing, SEO
  - 금융: Stock Market, Investment, Fintech, Crypto
  - 산업: Healthcare, E-commerce, SaaS, EdTech
  - 정책: Tech Regulation, Policy, Compliance
  - 뉴스: Tech News, Industry Trends, City News
  - 게임: Gaming, Esports
  - 운동: Fitness, Sports, Yoga
  - 음악: Music, Concerts
  - 여행: Travel, Lifestyle
  - 학습: Online Courses, Education, Language
  - 예술: Design, UX/UI, Creative
  - XR: VR/AR, Metaverse, Virtual Reality
- **개수**: 8-10개
- **우선순위**: 다양성 > 빈도 (한 분야 독점 금지)

## 분석 기준
1. workStyle: Calendar의 선호 시간대 기반 (morning-person, night-owl, flexible)
2. interests: **다양한 카테고리에서 8-10개 추출** (Gmail 70%, YouTube 30%, 카테고리당 최대 2개)
3. communicationStyle: Slack 데이터 기반 (collaborative, independent, hybrid)
4. preferredTime: Calendar 데이터 기반 (morning, afternoon, evening)

## 출력 형식 (반드시 JSON만 출력)
{
  "workStyle": "morning-person | night-owl | flexible",
  "interests": ["Computer Vision AI", "Startup Founders", "Growth Hacking", "Stock Market", "Gaming & Esports", ...],
  "communicationStyle": "collaborative | independent | hybrid",
  "preferredTime": "morning | afternoon | evening"
}

JSON만 출력하세요:
`.trim()

      const result = await model.generateContent(prompt)
      const response = result.response.text()
      
      // JSON 추출 (마크다운 코드 블록 제거)
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response
      
      const persona = JSON.parse(jsonStr)
      
      return {
        workStyle: persona.workStyle || 'flexible',
        interests: persona.interests || [],
        communicationStyle: persona.communicationStyle || 'hybrid',
        preferredTime: persona.preferredTime || 'morning',
      }
    } catch (error) {
      console.error('AI persona generation error:', error)
      
      // 원시 관심사 수집 (Gmail 70%, YouTube 30%) - 더 많은 데이터 수집
      const gmailInterests = data.gmailData?.realInterests?.slice(0, 14) || []
      const youtubeInterests = data.youtubeData?.interests?.slice(0, 6) || []
      const rawInterests = [...gmailInterests, ...youtubeInterests].filter((v, i, a) => a.indexOf(v) === i)
      
      // 데이터 기반 기본 페르소나 생성
      return {
        workStyle: data.calendarData?.preferredTimeSlots?.[0] === 'morning' ? 'morning-person' : 'flexible',
        interests: this.extractDiverseKeywords(rawInterests),
        communicationStyle: data.slackData?.communicationStyle || 'hybrid',
        preferredTime: data.calendarData?.preferredTimeSlots?.[0] || 'morning',
      }
    }
  }

  /**
   * 다양한 카테고리에서 관심사 추출 (균형 있는 분포)
   */
  private static extractDiverseKeywords(rawKeywords: string[]): string[] {
    // 카테고리별 키워드 맵 (모든 카테고리 동등하게 취급)
    const categoryKeywordMap: { [category: string]: string[] } = {
      '기술/AI': ['ai', 'machine', 'learning', 'computer', 'vision', 'deep', 'tech', 'robotics', 'automation', '인공지능', '머신러닝', '로봇', '자동화'],
      '개발/프로그래밍': ['programming', 'coding', 'software', 'web', 'app', 'developer', 'api', 'devops', 'frontend', 'backend', '개발', '프로그래밍', '코딩', '개발자'],
      '데이터/분석': ['data', 'analytics', 'database', 'sql', 'analysis', 'bigdata', '데이터', '분석', '빅데이터'],
      '클라우드/인프라': ['cloud', 'aws', 'azure', 'infrastructure', 'kubernetes', '클라우드', '인프라'],
      '비즈니스/스타트업': ['business', 'startup', 'entrepreneur', 'founder', 'venture', '비즈니스', '스타트업', '창업', '벤처'],
      '마케팅/성장': ['marketing', 'growth', 'seo', 'content', 'branding', 'hacking', '마케팅', '그로스', '브랜딩'],
      '금융/투자': ['finance', 'investment', 'stock', 'market', 'trading', 'crypto', 'blockchain', '금융', '투자', '주식', '블록체인', '암호화폐'],
      '산업/분야': ['fintech', 'healthcare', 'ecommerce', 'saas', 'edtech', '핀테크', '헬스케어', '이커머스', '에듀테크'],
      '정책/규제': ['regulation', 'policy', 'law', 'compliance', 'legal', '규제', '정책', '법률', '컴플라이언스'],
      '뉴스/트렌드': ['news', 'trend', 'update', 'report', 'media', '뉴스', '트렌드', '미디어'],
      '게임/e스포츠': ['game', 'gaming', 'esports', 'steam', 'console', '게임', 'e스포츠', '게이밍'],
      '운동/건강': ['exercise', 'fitness', 'health', 'workout', 'gym', 'sports', 'yoga', 'tennis', '운동', '헬스', '건강', '요가', '테니스'],
      '음악/엔터': ['music', 'song', 'concert', 'entertainment', 'artist', '음악', '노래', '공연', '엔터테인먼트'],
      '요리/푸드': ['cooking', 'recipe', 'food', 'restaurant', 'chef', '요리', '레시피', '음식', '맛집'],
      '여행/라이프': ['travel', 'trip', 'vacation', 'lifestyle', 'city', 'metro', '여행', '휴가', '라이프스타일'],
      '학습/교육': ['learning', 'education', 'course', 'tutorial', 'explained', 'study', '학습', '교육', '강의'],
      '언어': ['english', 'language', 'korean', 'japanese', '영어', '언어', '일본어', '중국어'],
      '예술/디자인': ['art', 'design', 'creative', 'ux', 'ui', 'graphic', '예술', '디자인', '창작'],
      'XR/메타버스': ['vr', 'ar', 'metaverse', 'augmented', 'virtual', 'reality', 'xr', '가상현실', '증강현실', '메타버스'],
    }
    
    // 카테고리별로 매칭된 키워드 저장
    const categoryMatches: { [category: string]: Set<string> } = {}
    
    for (const keyword of rawKeywords) {
      const lowerKeyword = keyword.toLowerCase()
      
      for (const [category, keywords] of Object.entries(categoryKeywordMap)) {
        for (const catKeyword of keywords) {
          if (lowerKeyword.includes(catKeyword) || catKeyword.includes(lowerKeyword)) {
            if (!categoryMatches[category]) {
              categoryMatches[category] = new Set()
            }
            categoryMatches[category].add(keyword)
            break // 하나의 카테고리에만 매칭
          }
        }
      }
    }
    
    // 카테고리별로 최대 2개씩 선택하여 다양성 확보
    const result: string[] = []
    const sortedCategories = Object.entries(categoryMatches)
      .sort((a, b) => b[1].size - a[1].size) // 매칭 개수가 많은 순
    
    for (const [category, keywords] of sortedCategories) {
      const items = Array.from(keywords).slice(0, 2) // 카테고리당 최대 2개
      result.push(...items)
      
      if (result.length >= 10) break // 최대 10개
    }
    
    return result.slice(0, 10)
  }

  /**
   * 페르소나 DB 저장
   */
  private static async savePersona(userEmail: string, persona: Persona): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
      })

      if (!user) {
        throw new Error('User not found')
      }

      await prisma.userPersona.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          persona: persona as any,
          interests: persona.interests,
          workStyle: persona.workStyle,
          confirmed: false,
        },
        update: {
          persona: persona as any,
          interests: persona.interests,
          workStyle: persona.workStyle,
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('Error saving persona:', error)
      throw error
    }
  }

  /**
   * 페르소나 조회
   */
  static async getPersona(userEmail: string): Promise<Persona | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: {
          userPersona: true,
        },
      })

      if (!user || !user.userPersona) {
        return null
      }

      return user.userPersona.persona as unknown as Persona
    } catch (error) {
      console.error('Error getting persona:', error)
      return null
    }
  }

  /**
   * 사용자 피드백 제출
   */
  static async submitFeedback(userEmail: string, feedback: PersonaFeedback): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: {
          userPersona: true,
        },
      })

      if (!user || !user.userPersona) {
        throw new Error('Persona not found')
      }

      const currentPersona = user.userPersona.persona as unknown as Persona

      // 피드백을 반영하여 페르소나 업데이트
      const updatedPersona: Persona = {
        ...currentPersona,
        ...(feedback.workStyle && { workStyle: feedback.workStyle as any }),
        ...(feedback.interests && { interests: feedback.interests }),
      }

      await prisma.userPersona.update({
        where: { userId: user.id },
        data: {
          persona: updatedPersona as any,
          interests: updatedPersona.interests,
          workStyle: updatedPersona.workStyle,
          feedback: feedback as any,
          confirmed: true,
          updatedAt: new Date(),
        },
      })

      console.log('✅ Persona feedback submitted')
    } catch (error) {
      console.error('Error submitting feedback:', error)
      throw error
    }
  }

  /**
   * 페르소나 확인 완료
   */
  static async confirmPersona(userEmail: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
      })

      if (!user) {
        throw new Error('User not found')
      }

      await prisma.userPersona.update({
        where: { userId: user.id },
        data: {
          confirmed: true,
          updatedAt: new Date(),
        },
      })

      console.log('✅ Persona confirmed')
    } catch (error) {
      console.error('Error confirming persona:', error)
      throw error
    }
  }
}



