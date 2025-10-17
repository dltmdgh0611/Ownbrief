import { WebClient } from '@slack/web-api'
import { prisma } from './prisma'

export interface SlackMention {
  channel: string
  channelName: string
  user: string
  userName: string
  text: string
  timestamp: string
}

export interface SlackDM {
  user: string
  userName: string
  text: string
  timestamp: string
}

/**
 * Slack API 클라이언트
 */
export class SlackClient {
  /**
   * 사용자를 멘션한 메시지 조회
   */
  static async getMentions(userEmail: string, limit = 10): Promise<SlackMention[]> {
    try {
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        console.log('Slack: No access token found')
        return []
      }

      const client = new WebClient(accessToken)
      
      // 사용자 정보 가져오기
      const authTest = await client.auth.test()
      const userId = authTest.user_id as string

      // 채널 목록 가져오기
      const channelsResponse = await client.conversations.list({
        types: 'public_channel,private_channel',
        limit: 100,
      })

      const channels = channelsResponse.channels || []
      const mentions: SlackMention[] = []

      // 각 채널에서 최근 멘션 검색
      for (const channel of channels.slice(0, 20)) { // 최대 20개 채널만 검색
        try {
          const history = await client.conversations.history({
            channel: channel.id!,
            limit: 50,
          })

          const messages = history.messages || []
          
          for (const message of messages) {
            if (message.text?.includes(`<@${userId}>`)) {
              // 발신자 정보 가져오기
              let userName = 'Unknown'
              try {
                const userInfo = await client.users.info({ user: message.user! })
                userName = userInfo.user?.real_name || userInfo.user?.name || 'Unknown'
              } catch (e) {
                // 사용자 정보 조회 실패시 무시
              }

              mentions.push({
                channel: channel.id!,
                channelName: channel.name || 'Unknown',
                user: message.user!,
                userName,
                text: message.text || '',
                timestamp: message.ts!,
              })

              if (mentions.length >= limit) {
                break
              }
            }
          }

          if (mentions.length >= limit) {
            break
          }
        } catch (error) {
          // 개별 채널 에러는 무시
          console.error(`Error fetching channel ${channel.name}:`, error)
        }
      }

      return mentions.slice(0, limit)
    } catch (error) {
      console.error('Slack API error:', error)
      return []
    }
  }

  /**
   * DM 메시지 조회
   */
  static async getDirectMessages(userEmail: string, limit = 5): Promise<SlackDM[]> {
    try {
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        return []
      }

      const client = new WebClient(accessToken)

      // IM 채널 목록 가져오기
      const imsResponse = await client.conversations.list({
        types: 'im',
        limit: 20,
      })

      const dms: SlackDM[] = []
      const channels = imsResponse.channels || []

      for (const channel of channels) {
        try {
          const history = await client.conversations.history({
            channel: channel.id!,
            limit: 10,
          })

          const messages = history.messages || []
          
          for (const message of messages) {
            if (message.user) {
              // 발신자 정보 가져오기
              let userName = 'Unknown'
              try {
                const userInfo = await client.users.info({ user: message.user })
                userName = userInfo.user?.real_name || userInfo.user?.name || 'Unknown'
              } catch (e) {
                // 사용자 정보 조회 실패시 무시
              }

              dms.push({
                user: message.user,
                userName,
                text: message.text || '',
                timestamp: message.ts!,
              })

              if (dms.length >= limit) {
                break
              }
            }
          }

          if (dms.length >= limit) {
            break
          }
        } catch (error) {
          // 개별 채널 에러는 무시
        }
      }

      return dms.slice(0, limit)
    } catch (error) {
      console.error('Slack DM API error:', error)
      return []
    }
  }

  /**
   * Slack 커뮤니케이션 스타일 분석 (페르소나 생성용)
   */
  static async analyzeCommunicationStyle(userEmail: string): Promise<{
    channelCount: number
    messageFrequency: 'high' | 'medium' | 'low'
    communicationStyle: 'collaborative' | 'independent' | 'hybrid'
    topChannels: string[]
  }> {
    try {
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        return {
          channelCount: 0,
          messageFrequency: 'low',
          communicationStyle: 'hybrid',
          topChannels: [],
        }
      }

      const client = new WebClient(accessToken)

      // 채널 목록 가져오기
      const channelsResponse = await client.conversations.list({
        types: 'public_channel,private_channel',
        limit: 100,
      })

      const channels = channelsResponse.channels || []
      const channelCount = channels.length

      // 상위 5개 채널 이름
      const topChannels = channels
        .slice(0, 5)
        .map(c => c.name || 'Unknown')

      // 간단한 휴리스틱으로 스타일 판단
      let messageFrequency: 'high' | 'medium' | 'low' = 'low'
      if (channelCount > 20) {
        messageFrequency = 'high'
      } else if (channelCount > 10) {
        messageFrequency = 'medium'
      }

      const communicationStyle: 'collaborative' | 'independent' | 'hybrid' = 
        channelCount > 15 ? 'collaborative' : channelCount > 5 ? 'hybrid' : 'independent'

      return {
        channelCount,
        messageFrequency,
        communicationStyle,
        topChannels,
      }
    } catch (error) {
      console.error('Slack analysis error:', error)
      return {
        channelCount: 0,
        messageFrequency: 'low',
        communicationStyle: 'hybrid',
        topChannels: [],
      }
    }
  }

  /**
   * Access Token 조회
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

      const slackService = user.connectedServices.find(s => s.serviceName === 'slack')
      return slackService?.accessToken || null
    } catch (error) {
      console.error('Error getting Slack access token:', error)
      return null
    }
  }
}



