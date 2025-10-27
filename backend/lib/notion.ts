import { Client } from '@notionhq/client'
import { prisma } from './prisma'

export interface NotionPage {
  id: string
  title: string
  lastEditedTime: string
  url: string
  properties?: any
  content?: string // 페이지 내용
  isUserMentioned?: boolean // 사용자 멘션 여부
  workspace?: string
}

/**
 * Notion API 클라이언트
 */
export class NotionClient {
  /**
   * 최근 업데이트된 페이지 조회
   */
  static async getRecentUpdates(userEmail: string, limit = 5): Promise<NotionPage[]> {
    try {
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        console.log('Notion: No access token found')
        return []
      }

      const notion = new Client({ auth: accessToken })

      // 최근 수정된 페이지 검색
      const response = await notion.search({
        filter: {
          property: 'object',
          value: 'page',
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
        page_size: limit,
      })

      const pages = response.results as any[]
      
      return pages.map(page => {
        // 페이지 제목 추출
        let title = 'Untitled'
        try {
          const titleProperty = page.properties?.title || page.properties?.Title || page.properties?.Name
          if (titleProperty) {
            if (Array.isArray(titleProperty.title) && titleProperty.title.length > 0) {
              title = titleProperty.title[0].plain_text || title
            } else if (titleProperty.rich_text && titleProperty.rich_text.length > 0) {
              title = titleProperty.rich_text[0].plain_text || title
            }
          }
        } catch (e) {
          // 제목 추출 실패시 기본값 사용
        }

        return {
          id: page.id,
          title,
          lastEditedTime: page.last_edited_time,
          url: page.url,
          properties: page.properties,
        }
      })
    } catch (error) {
      console.error('Notion API error:', error)
      return []
    }
  }

  /**
   * 특정 키워드로 페이지 검색
   */
  static async searchPages(userEmail: string, query: string, limit = 10): Promise<NotionPage[]> {
    try {
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        return []
      }

      const notion = new Client({ auth: accessToken })

      const response = await notion.search({
        query,
        filter: {
          property: 'object',
          value: 'page',
        },
        page_size: limit,
      })

      const pages = response.results as any[]
      
      return pages.map(page => {
        let title = 'Untitled'
        try {
          const titleProperty = page.properties?.title || page.properties?.Title || page.properties?.Name
          if (titleProperty?.title?.[0]?.plain_text) {
            title = titleProperty.title[0].plain_text
          }
        } catch (e) {
          // 제목 추출 실패시 기본값 사용
        }

        return {
          id: page.id,
          title,
          lastEditedTime: page.last_edited_time,
          url: page.url,
          properties: page.properties,
        }
      })
    } catch (error) {
      console.error('Notion search error:', error)
      return []
    }
  }

  /**
   * Notion 작업 관리 스타일 분석 (페르소나 생성용)
   */
  static async analyzeWorkStyle(userEmail: string): Promise<{
    totalPages: number
    recentActivity: 'high' | 'medium' | 'low'
    organizationStyle: 'structured' | 'flexible' | 'mixed'
    topProjects: string[]
  }> {
    try {
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        return {
          totalPages: 0,
          recentActivity: 'low',
          organizationStyle: 'mixed',
          topProjects: [],
        }
      }

      const notion = new Client({ auth: accessToken })

      // 최근 30일간 수정된 페이지 검색
      const response = await notion.search({
        filter: {
          property: 'object',
          value: 'page',
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
        page_size: 50,
      })

      const pages = response.results as any[]
      const totalPages = pages.length

      // 최근 7일 이내 수정된 페이지 수
      const recentPages = pages.filter(page => {
        const lastEdited = new Date(page.last_edited_time)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return lastEdited > sevenDaysAgo
      })

      let recentActivity: 'high' | 'medium' | 'low' = 'low'
      if (recentPages.length > 10) {
        recentActivity = 'high'
      } else if (recentPages.length > 3) {
        recentActivity = 'medium'
      }

      // 프로젝트 이름 추출 (간단한 휴리스틱)
      const topProjects = pages
        .slice(0, 5)
        .map(page => {
          try {
            const titleProperty = page.properties?.title || page.properties?.Title || page.properties?.Name
            if (titleProperty?.title?.[0]?.plain_text) {
              return titleProperty.title[0].plain_text
            }
          } catch (e) {
            // 무시
          }
          return 'Untitled'
        })
        .filter(t => t !== 'Untitled')

      const organizationStyle: 'structured' | 'flexible' | 'mixed' = 
        totalPages > 30 ? 'structured' : totalPages > 10 ? 'mixed' : 'flexible'

      return {
        totalPages,
        recentActivity,
        organizationStyle,
        topProjects,
      }
    } catch (error) {
      console.error('Notion analysis error:', error)
      return {
        totalPages: 0,
        recentActivity: 'low',
        organizationStyle: 'mixed',
        topProjects: [],
      }
    }
  }

  /**
   * Access Token 조회 (단일)
   */
  private static async getAccessToken(userEmail: string): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: {
          connectedServices: true,
        },
      })

      if (!user) {
        return null
      }

      const notionService = user.connectedServices.find(s => s.serviceName.startsWith('notion'))
      return notionService?.accessToken || null
    } catch (error) {
      console.error('Error getting Notion access token:', error)
      return null
    }
  }

  /**
   * 모든 워크스페이스의 Access Token 조회
   */
  private static async getAllAccessTokens(userEmail: string): Promise<Array<{token: string, workspace: string}>> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: {
          connectedServices: {
            where: {
              serviceName: {
                startsWith: 'notion'
              }
            }
          },
        },
      })

      if (!user) {
        return []
      }

      return user.connectedServices.map(s => ({
        token: s.accessToken,
        workspace: (s.metadata as any)?.workspaceName || 'Notion Workspace'
      }))
    } catch (error) {
      console.error('Error getting Notion access tokens:', error)
      return []
    }
  }

  /**
   * 모든 워크스페이스에서 최근 업데이트된 페이지 조회
   */
  static async getAllRecentUpdates(userEmail: string, limit = 5): Promise<Array<NotionPage & {workspace: string}>> {
    try {
      const tokens = await this.getAllAccessTokens(userEmail)
      if (tokens.length === 0) {
        console.log('Notion: No access tokens found')
        return []
      }

      const allPages: Array<NotionPage & {workspace: string}> = []

      for (const {token, workspace} of tokens) {
        const notion = new Client({ auth: token })

        try {
          const response = await notion.search({
            filter: {
              property: 'object',
              value: 'page',
            },
            sort: {
              direction: 'descending',
              timestamp: 'last_edited_time',
            },
            page_size: limit,
          })

          const pages = response.results as any[]
          
          const workspacePages = pages.map(page => {
            let title = 'Untitled'
            try {
              const titleProperty = page.properties?.title || page.properties?.Title || page.properties?.Name
              if (titleProperty) {
                if (Array.isArray(titleProperty.title) && titleProperty.title.length > 0) {
                  title = titleProperty.title[0].plain_text || title
                } else if (titleProperty.rich_text && titleProperty.rich_text.length > 0) {
                  title = titleProperty.rich_text[0].plain_text || title
                }
              }
            } catch (e) {
              // 제목 추출 실패시 기본값 사용
            }

            return {
              id: page.id,
              title,
              lastEditedTime: page.last_edited_time,
              url: page.url,
              properties: page.properties,
              workspace,
            }
          })

          allPages.push(...workspacePages)
        } catch (error) {
          console.error(`Notion API error for workspace ${workspace}:`, error)
        }
      }

      // 최근 수정 시간 기준으로 정렬
      allPages.sort((a, b) => 
        new Date(b.lastEditedTime).getTime() - new Date(a.lastEditedTime).getTime()
      )

      return allPages.slice(0, limit * tokens.length)
    } catch (error) {
      console.error('Notion getAllRecentUpdates error:', error)
      return []
    }
  }

  /**
   * 페이지의 텍스트 내용 추출 (헤딩 우선순위 + 300자 제한 + 5초 타임아웃)
   */
  private static async extractPageContent(notion: Client, pageId: string): Promise<string> {
    const timeout = 5000 // 5초 타임아웃
    
    try {
      const timeoutPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve(''), timeout)
      })

      const contentPromise = (async () => {
        try {
          const blocks = await notion.blocks.children.list({ block_id: pageId })
          let textParts: string[] = []
          let totalLength = 0
          const maxLength = 300

          // 헤딩 블록을 우선순위별로 분류: h1 > h2 > h3 > h4 > h5 > h6 > 기타
          const heading1: string[] = []
          const heading2: string[] = []
          const heading3: string[] = []
          const heading4: string[] = []
          const heading5: string[] = []
          const heading6: string[] = []
          const others: string[] = []

          for (const block of blocks.results) {
            const blockType = (block as any).type
            const content = this.extractBlockText(block as any)
            
            if (content && content.length > 0) {
              if (blockType === 'heading_1') {
                heading1.push(content)
              } else if (blockType === 'heading_2') {
                heading2.push(content)
              } else if (blockType === 'heading_3') {
                heading3.push(content)
              } else if (blockType === 'heading_4') {
                heading4.push(content)
              } else if (blockType === 'heading_5') {
                heading5.push(content)
              } else if (blockType === 'heading_6') {
                heading6.push(content)
              } else {
                others.push(content)
              }
            } else {
              // 텍스트 추출 실패한 경우 디버깅
              console.log(`   ⚠️ 블록 텍스트 추출 실패: 타입=${blockType}`)
            }
          }

          // 우선순위: h1 -> h2 -> h3 -> h4 -> h5 -> h6 -> 기타 순으로 내용 수집
          const priorityContents = [...heading1, ...heading2, ...heading3, ...heading4, ...heading5, ...heading6]
          const allRemaining = others.flatMap(text => this.splitIntoSentences(text))

          for (const content of priorityContents) {
            if (totalLength >= maxLength) break
            
            const remaining = maxLength - totalLength
            const textToAdd = content.substring(0, remaining)
            
            if (textToAdd.length > 0) {
              textParts.push(textToAdd)
              totalLength += textToAdd.length
            }
            
            if (totalLength >= maxLength) break
          }

          // 300자가 안 차면 나머지 텍스트에서 문장 단위로 랜덤하게 채우기
          if (totalLength < maxLength && allRemaining.length > 0) {
            // 배열을 셔플해서 랜덤하게 만듦
            const shuffled = allRemaining.sort(() => Math.random() - 0.5)
            
            for (const sentence of shuffled) {
              if (totalLength >= maxLength) break
              
              const remaining = maxLength - totalLength
              const textToAdd = sentence.substring(0, remaining)
              
              if (textToAdd.length > 0) {
                textParts.push(textToAdd)
                totalLength += textToAdd.length
              }
              
              if (totalLength >= maxLength) break
            }
          }

          return textParts.join('\n').substring(0, maxLength)
        } catch (error) {
          console.log('   ⚠️ 페이지 내용 추출 실패:', error)
          return ''
        }
      })()

      // 5초 타임아웃과 실제 작업을 경쟁시킴
      return await Promise.race([contentPromise, timeoutPromise])
    } catch (error) {
      console.log('   ⚠️ 페이지 내용 추출 오류:', error)
      return ''
    }
  }

  /**
   * 텍스트를 문장 단위로 분할
   */
  private static splitIntoSentences(text: string): string[] {
    // 한국어/영어 문장 단위로 분할 (마침표, 물음표, 느낌표 기준)
    const sentences = text.split(/(?<=[.!?。！？])\s+/).filter(s => s.trim().length > 0)
    return sentences.map(s => s.trim())
  }

  /**
   * 블록에서 텍스트 추출 (모든 텍스트 필드 확인)
   */
  private static extractBlockText(block: any): string {
    try {
      if (!block || typeof block !== 'object') return ''
      
      const blockType = block.type
      const blockData = block[blockType]

      if (!blockData) {
        // blockData가 없는 경우 JSON 전체에서 텍스트 찾기 시도
        const text = JSON.stringify(block).match(/"plain_text":\s*"([^"]+)"/g)
        if (text) {
          return text.map(t => t.match(/"plain_text":\s*"([^"]+)"/)?.[1] || '').join(' ')
        }
        return ''
      }

      // rich_text가 있는 경우 (가장 일반적)
      if (blockData.rich_text && Array.isArray(blockData.rich_text)) {
        const text = blockData.rich_text
          .map((item: any) => {
            if (typeof item === 'string') return item
            if (item && typeof item === 'object') {
              return item.plain_text || item.text || item.content || ''
            }
            return ''
          })
          .filter((text: string) => text.length > 0)
          .join('')
        if (text.length > 0) return text
      }

      // caption이 있는 경우
      if (blockData.caption && Array.isArray(blockData.caption)) {
        const text = blockData.caption
          .map((item: any) => {
            if (typeof item === 'string') return item
            if (item && typeof item === 'object') {
              return item.plain_text || item.text || ''
            }
            return ''
          })
          .filter((text: string) => text.length > 0)
          .join('')
        if (text.length > 0) return text
      }

      // title이 있는 경우
      if (blockData.title && Array.isArray(blockData.title)) {
        const text = blockData.title
          .map((item: any) => {
            if (typeof item === 'string') return item
            if (item && typeof item === 'object') {
              return item.plain_text || item.text || ''
            }
            return ''
          })
          .filter((text: string) => text.length > 0)
          .join('')
        if (text.length > 0) return text
      }

      // 완전히 빈 블록이 아니면 JSON에서 plain_text를 강제로 찾기
      const blockStr = JSON.stringify(block)
      if (blockStr.includes('plain_text')) {
        const matches = blockStr.match(/"plain_text":\s*"([^"]+)"/g)
        if (matches) {
          return matches
            .map(m => m.match(/"plain_text":\s*"([^"]+)"/)?.[1] || '')
            .filter(t => t.length > 0)
            .join(' ')
        }
      }

      return ''
    } catch (error) {
      return ''
    }
  }

  /**
   * 최근 24시간 이내 사용자가 태그되거나 관련된 페이지 조회 (브리핑용)
   */
  static async getRecentPersonalActivity(userEmail: string, limit = 10): Promise<Array<NotionPage & {workspace: string}>> {
    try {
      console.log('🔍 Notion getRecentPersonalActivity 시작:', userEmail)
      
      const tokens = await this.getAllAccessTokens(userEmail)
      if (tokens.length === 0) {
        console.log('❌ Notion: No access tokens found')
        return []
      }

      const notion = new Client({ auth: tokens[0].token })
      
      // 사용자 정보 가져오기 (필요시에만 - 현재는 사용자 관련성 필터링을 위해)
      let currentUserId = ''
      try {
        const currentUser = await notion.users.me({})
        currentUserId = currentUser.id
        console.log('👤 Notion user ID:', currentUserId)
      } catch (e) {
        console.log('⚠️ 사용자 정보 가져오기 실패, 관련성 체크 스킵:', e)
      }

      // 24시간 전 타임스탬프
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      // 최근 24시간 내 수정된 페이지 조회
      const response = await notion.search({
        filter: {
          property: 'object',
          value: 'page',
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
        page_size: limit * 2, // 필터링 전에는 더 많이 가져오기
      })

      const pages = response.results as any[]
      console.log(`📄 총 ${pages.length}개 페이지 조회`)
      
      const allPages: Array<NotionPage & {workspace: string}> = []
      
      console.log(`🔍 각 페이지별 사용자 관련성 분석 시작...`)
      
      for (const page of pages) {
        const lastEdited = new Date(page.last_edited_time)
        const isWithin24Hours = lastEdited >= new Date(twentyFourHoursAgo)
        
        // 페이지 제목 추출 (먼저)
        let title = 'Untitled'
        try {
          const titleProperty = page.properties?.title || page.properties?.Title || page.properties?.Name
          if (titleProperty) {
            if (Array.isArray(titleProperty.title) && titleProperty.title.length > 0) {
              title = titleProperty.title[0].plain_text || title
            } else if (titleProperty.rich_text && titleProperty.rich_text.length > 0) {
              title = titleProperty.rich_text[0].plain_text || title
            }
          }
        } catch (e) {
          // 제목 추출 실패시 기본값 사용
        }
        
        // 사용자 관련성 확인: last_edited_by가 현재 사용자이거나, 속성에 사용자가 태그된 경우
        const isPersonallyEdited = page.last_edited_by?.id === currentUserId
        console.log(`📄 페이지 확인: "${title}"`)
        console.log(`   ⏰ 수정 시간: ${lastEdited.toLocaleString('ko-KR')}`)
        console.log(`   📝 직접 수정: ${isPersonallyEdited ? '✅' : '❌'}`)
        console.log(`   ⏱️ 24시간 이내: ${isWithin24Hours ? '✅' : '❌'}`)
        
        // 24시간 이전 페이지는 스킵
        if (!isWithin24Hours) {
          console.log(`   ⏭️ 스킵: 24시간 이전 페이지`)
          continue
        }
        
        // 페이지 속성에서 Person 타입 속성 확인 (사용자 태그)
        let hasUserMention = false
        try {
          for (const [key, value] of Object.entries(page.properties || {})) {
            if (value && typeof value === 'object' && 'type' in value) {
              const propType = (value as any).type
              if (propType === 'people') {
                const people = (value as any).people || []
                const isUserMentioned = people.some((person: any) => person.id === currentUserId)
                if (isUserMentioned) {
                  hasUserMention = true
                  console.log(`   👤 사용자 태그 발견: ${key} 속성`)
                  break
                }
              }
            }
          }
        } catch (e) {
          console.log('   ❌ 속성 확인 실패:', e)
        }
        
        // 24시간 이내 수정된 모든 페이지 포함 (사용자와 직접 관련된 페이지 우선)
        if (isWithin24Hours) {
          const hoursSinceEdit = Math.round((Date.now() - lastEdited.getTime()) / (1000 * 60 * 60 * 10)) / 100
          const isRelated = isPersonallyEdited || hasUserMention
          
          // 페이지 내용 가져오기 (5초 타임아웃)
          console.log(`   📄 페이지 내용 추출 중...`)
          const startTime = Date.now()
          try {
            const pageContent = await Promise.race([
              this.extractPageContent(notion, page.id),
              new Promise<string>((resolve) => {
                setTimeout(() => {
                  console.log(`   ⏱️ 타임아웃 (5초 초과)`)
                  resolve('')
                }, 5000)
              })
            ])
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
            console.log(`   ✅ 내용 추출 완료: ${pageContent.length}자 (${elapsed}초)`)
            
            allPages.push({
              id: page.id,
              title,
              lastEditedTime: page.last_edited_time,
              url: page.url,
              properties: page.properties,
              workspace: tokens[0].workspace,
              content: pageContent,
              isUserMentioned: hasUserMention,
            })
            
            console.log(`✅ 페이지 발견:${isRelated ? ' (사용자 직접 관련)' : ''}`)
            console.log(`   📄 제목: ${title}`)
            console.log(`   🔗 URL: ${page.url}`)
            console.log(`   📝 직접 수정: ${isPersonallyEdited ? '✅' : '❌'}`)
            console.log(`   👤 태그 여부: ${hasUserMention ? '✅' : '❌'}`)
            console.log(`   ⏰ 마지막 수정: ${hoursSinceEdit}시간 전 (${lastEdited.toLocaleString('ko-KR')})`)
            console.log(`   📌 워크스페이스: ${tokens[0].workspace}`)
          } catch (error) {
            console.log(`   ⚠️ 페이지 처리 실패: ${error}`)
            // 에러가 나도 페이지는 추가 (내용 없이)
            allPages.push({
              id: page.id,
              title,
              lastEditedTime: page.last_edited_time,
              url: page.url,
              properties: page.properties,
              workspace: tokens[0].workspace,
              content: '',
              isUserMentioned: hasUserMention,
            })
          }
          
          if (allPages.length >= limit) {
            console.log(`🛑 제한 도달: ${limit}개 페이지 수집 완료`)
            break
          }
        }
      }

      console.log(`🎉 최종 결과: ${allPages.length}개 최근 업데이트 페이지 발견`)
      if (allPages.length > 0) {
        console.log(`📋 발견된 페이지 목록:`)
        allPages.forEach((page, idx) => {
          const editTime = new Date(page.lastEditedTime)
          const hoursAgo = Math.round((Date.now() - editTime.getTime()) / (1000 * 60 * 60 * 10)) / 100
          
          // 사용자 관련성 확인
          const pageProps = page.properties as any
          let isRelated = false
          try {
            // last_edited_by나 properties에 사용자 정보가 있는지 확인
            for (const [key, value] of Object.entries(pageProps || {})) {
              if (value && typeof value === 'object' && 'type' in value) {
                const propType = (value as any).type
                if (propType === 'people') {
                  const people = (value as any).people || []
                  if (people.some((person: any) => person.id === currentUserId)) {
                    isRelated = true
                    break
                  }
                }
              }
            }
          } catch (e) {
            // 무시
          }
          
          console.log(`   ${idx + 1}. ${page.title}${isRelated ? ' (사용자 관련)' : ''}`)
          console.log(`      ⏰ ${hoursAgo}시간 전 수정 | 🔗 ${page.url}`)
        })
      } else {
        console.log(`⚠️ 24시간 이내 업데이트된 페이지를 찾지 못했습니다.`)
      }
      
      return allPages
    } catch (error) {
      console.error('Notion getRecentPersonalActivity error:', error)
      return []
    }
  }

  /**
   * 모든 워크스페이스의 작업 스타일 분석 (통합)
   */
  static async analyzeAllWorkspaces(userEmail: string): Promise<{
    totalPages: number
    recentActivity: 'high' | 'medium' | 'low'
    organizationStyle: 'structured' | 'flexible' | 'mixed'
    topProjects: string[]
    workspaceCount: number
  }> {
    try {
      const tokens = await this.getAllAccessTokens(userEmail)
      if (tokens.length === 0) {
        return {
          totalPages: 0,
          recentActivity: 'low',
          organizationStyle: 'mixed',
          topProjects: [],
          workspaceCount: 0,
        }
      }

      let totalPages = 0
      let recentPagesCount = 0
      const allProjects: string[] = []

      for (const {token, workspace} of tokens) {
        const notion = new Client({ auth: token })

        try {
          const response = await notion.search({
            filter: {
              property: 'object',
              value: 'page',
            },
            sort: {
              direction: 'descending',
              timestamp: 'last_edited_time',
            },
            page_size: 50,
          })

          const pages = response.results as any[]
          totalPages += pages.length

          // 최근 7일 이내 수정된 페이지 수
          const recentPages = pages.filter(page => {
            const lastEdited = new Date(page.last_edited_time)
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            return lastEdited > sevenDaysAgo
          })
          recentPagesCount += recentPages.length

          // 프로젝트 이름 추출
          const projects = pages
            .slice(0, 5)
            .map(page => {
              try {
                const titleProperty = page.properties?.title || page.properties?.Title || page.properties?.Name
                if (titleProperty?.title?.[0]?.plain_text) {
                  return titleProperty.title[0].plain_text
                }
              } catch (e) {
                // 무시
              }
              return 'Untitled'
            })
            .filter(t => t !== 'Untitled')

          allProjects.push(...projects)
        } catch (error) {
          console.error(`Notion analysis error for workspace ${workspace}:`, error)
        }
      }

      let recentActivity: 'high' | 'medium' | 'low' = 'low'
      if (recentPagesCount > 10) {
        recentActivity = 'high'
      } else if (recentPagesCount > 3) {
        recentActivity = 'medium'
      }

      const organizationStyle: 'structured' | 'flexible' | 'mixed' = 
        totalPages > 30 ? 'structured' : totalPages > 10 ? 'mixed' : 'flexible'

      return {
        totalPages,
        recentActivity,
        organizationStyle,
        topProjects: allProjects.slice(0, 10),
        workspaceCount: tokens.length,
      }
    } catch (error) {
      console.error('Notion analyzeAllWorkspaces error:', error)
      return {
        totalPages: 0,
        recentActivity: 'low',
        organizationStyle: 'mixed',
        topProjects: [],
        workspaceCount: 0,
      }
    }
  }
}



