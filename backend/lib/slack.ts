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
   * 읽지 않은 멘션 메시지 조회 (User Token만 사용)
   */
  static async getUnreadMentions(userEmail: string, limit = 20): Promise<SlackMention[]> {
    try {
      console.log('🔍 Slack getUnreadMentions 시작 (User Token만 사용):', userEmail)
      
      const accessToken = await this.getAccessToken(userEmail)
      if (!accessToken) {
        console.log('❌ Slack: No access token found')
        return []
      }

      console.log('✅ Slack access token found')
      const client = new WebClient(accessToken)
      
      // 사용자 정보 가져오기
      const authTest = await client.auth.test()
      const userId = authTest.user_id as string
      console.log('👤 Slack user ID:', userId)

      // 별도의 API 호출로 각 채널 타입을 분리하여 조회 (안정적인 방법)
      console.log('🔍 방법 1: Public 채널만 조회 (페이지네이션 포함)')
      let publicChannels: any[] = []
      let publicCursor = ''
      
      do {
        const publicResponse = await client.conversations.list({
          types: 'public_channel',
          limit: 200,
          exclude_archived: true,
          cursor: publicCursor || undefined,
        })
        publicChannels = [...publicChannels, ...(publicResponse.channels || [])]
        publicCursor = publicResponse.response_metadata?.next_cursor || ''
        console.log(`📋 Public 채널 누적 수: ${publicChannels.length}`)
      } while (publicCursor)
      
      console.log('📋 Public 채널 최종 수:', publicChannels.length)
      
      console.log('🔍 방법 2: Private 채널만 조회 (페이지네이션 포함)')
      let privateChannels: any[] = []
      let privateCursor = ''
      
      try {
        do {
          const privateResponse = await client.conversations.list({
            types: 'private_channel',
            limit: 200,
            exclude_archived: true,
            cursor: privateCursor || undefined,
          })
          privateChannels = [...privateChannels, ...(privateResponse.channels || [])]
          privateCursor = privateResponse.response_metadata?.next_cursor || ''
          console.log(`📋 Private 채널 누적 수: ${privateChannels.length}`)
        } while (privateCursor)
        
        console.log('📋 Private 채널 최종 수:', privateChannels.length)
        console.log('📋 Private 채널 목록:', privateChannels.map(c => ({ id: c.id, name: c.name })))
      } catch (privateError) {
        console.log('⚠️ Private 채널 조회 실패:', privateError)
      }
      
      console.log('🔍 방법 3: DM 및 그룹 DM 조회 (페이지네이션 포함)')
      let dmChannels: any[] = []
      let dmCursor = ''
      
      do {
        const dmResponse = await client.conversations.list({
          types: 'im,mpim',
          limit: 200,
          exclude_archived: true,
          cursor: dmCursor || undefined,
        })
        dmChannels = [...dmChannels, ...(dmResponse.channels || [])]
        dmCursor = dmResponse.response_metadata?.next_cursor || ''
        console.log(`📋 DM 채널 누적 수: ${dmChannels.length}`)
      } while (dmCursor)
      
      console.log('📋 DM 채널 최종 수:', dmChannels.length)
      
      // 모든 결과 합치기
      const allChannels = [
        ...publicChannels,
        ...privateChannels.map(c => ({ ...c, is_private: true })),
        ...dmChannels
      ]
      
      console.log('📋 총 합쳐진 채널 수:', allChannels.length)
      console.log('📋 Private 채널 최종 수:', allChannels.filter(c => c.is_private).length)
      
      const channelsResponse = { channels: allChannels }

      const channels = channelsResponse.channels || []
      console.log('📋 총 채널 수:', channels.length)
      
      // 모든 채널 상세 정보 로깅
      console.log('📋 전체 채널 상세 정보:')
      channels.forEach(c => {
        console.log(`  - ${c.name} (${c.id}) [${c.is_private ? 'private' : 'public'}] unread: ${c.unread_count || 0}`)
      })
      
      // Private 채널만 따로 확인
      const filteredPrivateChannels = channels.filter(c => c.is_private)
      console.log('🔒 Private 채널 수:', filteredPrivateChannels.length)
      console.log('🔒 Private 채널 목록:', filteredPrivateChannels.map(c => ({ 
        id: c.id, 
        name: c.name, 
        unreadCount: c.unread_count 
      })))
      
      // 사용자가 참여한 채널만 필터링 (is_member가 true인 채널)
      const joinedChannels = channels.filter(channel => channel.is_member === true)
      console.log('👥 사용자가 참여한 채널 수:', joinedChannels.length)
      console.log('📋 참여 채널 목록:', joinedChannels.map(c => ({ 
        id: c.id, 
        name: c.name, 
        type: c.is_private ? 'private' : 'public',
        isMember: c.is_member 
      })))
      
      // 참여한 채널에서만 24시간 이내 멘션 검색
      console.log('🔍 참여 채널에서 24시간 이내 멘션 검색 시작')
      
      const unreadMentions: SlackMention[] = []
      const twentyFourHoursAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000) // Unix timestamp

      // 참여한 채널에서만 멘션 검색
      for (const channel of joinedChannels) {
        try {
          const channelType = channel.is_private ? 'private' : 'public'
          console.log(`🔍 채널 검색: ${channel.name} [${channelType}]`)
          
          // 24시간 이내 메시지 조회
          const history = await client.conversations.history({
            channel: channel.id!,
            limit: 100, // 충분한 메시지 수 조회
            oldest: twentyFourHoursAgo.toString(), // 24시간 전부터
          })

          const messages = history.messages || []
          console.log(`📨 채널 ${channel.name}에서 ${messages.length}개 메시지 조회 (24시간 이내)`)
          
          // 멘션된 메시지만 필터링
          const mentionMessages = messages.filter(msg => msg.text?.includes(`<@${userId}>`))
          console.log(`🎯 채널 ${channel.name}에서 ${mentionMessages.length}개 멘션 발견`)
          
          for (const message of mentionMessages) {
            console.log(`🎯 멘션 발견! 채널: ${channel.name}, 메시지: ${message.text?.substring(0, 100)}...`)
            
            // 24시간 이내 멘션이면 모두 읽지 않은 것으로 처리
            const messageTime = parseFloat(message.ts!)
            const isWithin24Hours = messageTime >= twentyFourHoursAgo
            console.log(`📖 24시간 이내 멘션: ${isWithin24Hours}`)
            
            if (isWithin24Hours) {
              // 발신자 정보 가져오기
              let userName = 'Unknown'
              try {
                const userInfo = await client.users.info({ user: message.user! })
                userName = userInfo.user?.real_name || userInfo.user?.name || 'Unknown'
              } catch (e) {
                console.log('⚠️ 사용자 정보 가져오기 실패:', e)
              }

              const messageDate = new Date(messageTime * 1000)
              const hoursAgo = Math.round((Date.now() - messageDate.getTime()) / (1000 * 60 * 60 * 10)) / 100
              
              const mention = {
                channel: channel.id!,
                channelName: channel.name || 'Unknown',
                user: message.user!,
                userName,
                text: message.text || '',
                timestamp: message.ts!,
              }
              
              console.log('✅ 멘션 추가:')
              console.log(`   👤 발신자: ${userName}`)
              console.log(`   💬 채널: ${channel.name}`)
              console.log(`   📝 내용: ${message.text?.substring(0, 100)}${message.text && message.text.length > 100 ? '...' : ''}`)
              console.log(`   ⏰ 시간: ${hoursAgo}시간 전 (${messageDate.toLocaleString('ko-KR')})`)
              console.log(`   🔗 URL: https://${authTest.team || 'slack'}.slack.com/archives/${channel.id}/p${message.ts?.replace('.', '')}`)
              
              unreadMentions.push(mention)

              if (unreadMentions.length >= limit) {
                console.log(`🛑 제한 도달: ${limit}개 멘션 수집 완료`)
                break
              }
            }
          }

          if (unreadMentions.length >= limit) {
            break
          }
        } catch (error) {
          console.error(`❌ 채널 ${channel.name} 처리 오류:`, error)
        }
      }

      console.log(`🎉 최종 결과: ${unreadMentions.length}개 읽지 않은 멘션 발견`)
      if (unreadMentions.length > 0) {
        console.log('📋 발견된 멘션 목록:')
        unreadMentions.forEach((m, idx) => {
          const msgDate = new Date(parseFloat(m.timestamp) * 1000)
          const hoursAgo = Math.round((Date.now() - msgDate.getTime()) / (1000 * 60 * 60 * 10)) / 100
          console.log(`   ${idx + 1}. ${m.channelName} # ${m.userName}`)
          console.log(`      💬 ${m.text.substring(0, 80)}${m.text.length > 80 ? '...' : ''}`)
          console.log(`      ⏰ ${hoursAgo}시간 전`)
        })
      } else {
        console.log('⚠️ 24시간 이내 멘션을 찾지 못했습니다.')
      }
      
      return unreadMentions.slice(0, limit)
    } catch (error) {
      console.error('Slack unread mentions error:', error)
      return []
    }
  }

  /**
   * 읽지 않은 메시지 판단 로직
   */
  private static async isMessageUnread(message: any, userId: string, client: WebClient): Promise<boolean> {
    try {
      console.log(`🔍 메시지 읽음 상태 확인: ${message.text?.substring(0, 50)}...`)
      
      // 1. 사용자가 해당 메시지에 반응했는지 확인
      if (message.reactions) {
        console.log(`😀 반응 확인: ${message.reactions.length}개 반응`)
        for (const reaction of message.reactions) {
          if (reaction.users?.includes(userId)) {
            console.log('✅ 사용자가 반응함 - 읽음으로 처리')
            return false // 반응이 있으면 읽은 것으로 간주
          }
        }
      }

      // 2. 사용자가 해당 메시지에 답글을 달았는지 확인
      if (message.reply_count && message.reply_count > 0) {
        console.log(`💬 답글 확인: ${message.reply_count}개 답글`)
        const replies = await client.conversations.replies({
          channel: message.channel,
          ts: message.ts,
          limit: 10,
        })
        
        const userReplies = replies.messages?.filter(reply => reply.user === userId)
        if (userReplies && userReplies.length > 0) {
          console.log('✅ 사용자가 답글함 - 읽음으로 처리')
          return false // 답글이 있으면 읽은 것으로 간주
        }
      }

      // 3. 메시지가 너무 오래되었으면 읽은 것으로 간주 (24시간 이상)
      const messageTime = new Date(parseFloat(message.ts) * 1000)
      const sixHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      console.log(`⏰ 메시지 시간: ${messageTime.toISOString()}, 24시간 전: ${sixHoursAgo.toISOString()}`)
      
      if (messageTime < sixHoursAgo) {
        console.log('⏰ 메시지가 24시간 이상 오래됨 - 읽음으로 처리')
        return false
      }

      console.log('📖 읽지 않은 메시지로 판단')
      return true // 위 조건에 해당하지 않으면 읽지 않은 것으로 간주
    } catch (error) {
      console.error('❌ 메시지 읽음 상태 확인 오류:', error)
      return true // 에러 시 읽지 않은 것으로 간주
    }
  }

  /**
   * 사용자를 멘션한 메시지 조회 (기존 메서드)
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



