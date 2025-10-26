import { Client } from '@notionhq/client'
import { prisma } from './prisma'

export interface NotionPage {
  id: string
  title: string
  lastEditedTime: string
  url: string
  properties?: any
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



