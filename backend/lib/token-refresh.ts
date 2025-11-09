import { prisma } from './prisma'

/**
 * Google OAuth 토큰 갱신
 */
export async function refreshGoogleToken(refreshToken: string): Promise<{
  accessToken: string
  expiresAt: Date
  refreshToken?: string
} | null> {
  try {
    console.log('🔄 Google 토큰 갱신 시작...')
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Google 토큰 갱신 실패:', error)
      return null
    }

    const data = await response.json()
    console.log('✅ Google 토큰 갱신 성공')

    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      refreshToken: data.refresh_token, // 새로운 refresh token이 있으면 반환
    }
  } catch (error) {
    console.error('❌ Google 토큰 갱신 오류:', error)
    return null
  }
}

/**
 * Slack OAuth 토큰 갱신
 * Slack은 refresh token을 지원하지만, User Token은 일반적으로 만료되지 않습니다.
 */
export async function refreshSlackToken(refreshToken: string): Promise<{
  accessToken: string
  expiresAt: Date | null
  refreshToken?: string
} | null> {
  try {
    console.log('🔄 Slack 토큰 갱신 시작...')
    
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('❌ Slack 토큰 갱신 실패:', data.error)
      return null
    }

    console.log('✅ Slack 토큰 갱신 성공')

    return {
      accessToken: data.authed_user?.access_token || data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      refreshToken: data.authed_user?.refresh_token || data.refresh_token,
    }
  } catch (error) {
    console.error('❌ Slack 토큰 갱신 오류:', error)
    return null
  }
}

/**
 * Notion OAuth 토큰 갱신
 * Notion은 현재 refresh token을 지원하지 않으므로 재인증이 필요합니다.
 */
export async function refreshNotionToken(refreshToken: string): Promise<{
  accessToken: string
  expiresAt: Date | null
} | null> {
  // Notion은 refresh token을 지원하지 않으므로 null 반환
  console.log('⚠️ Notion은 토큰 갱신을 지원하지 않습니다. 재인증이 필요합니다.')
  return null
}

/**
 * 연결된 서비스의 토큰을 확인하고 만료된 경우 갱신
 */
export async function refreshConnectedServiceTokens(userEmail: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        connectedServices: true,
      },
    })

    if (!user) {
      console.log('❌ 사용자를 찾을 수 없습니다:', userEmail)
      return
    }

    console.log(`🔍 ${user.connectedServices.length}개 연결된 서비스 확인 중...`)

    for (const service of user.connectedServices) {
      // 토큰 만료 확인
      if (service.expiresAt && new Date(service.expiresAt) > new Date()) {
        console.log(`✅ ${service.serviceName}: 토큰이 유효합니다 (만료: ${service.expiresAt})`)
        continue
      }

      // 만료되었거나 expiresAt이 없는 경우
      if (!service.refreshToken) {
        console.log(`⚠️ ${service.serviceName}: Refresh token이 없습니다. 재인증이 필요합니다.`)
        continue
      }

      console.log(`🔄 ${service.serviceName}: 토큰이 만료되었습니다. 갱신 시도...`)

      let newTokenData: {
        accessToken: string
        expiresAt: Date | null
        refreshToken?: string
      } | null = null

      // 서비스 타입에 따라 적절한 갱신 함수 호출
      if (service.serviceName === 'gmail' || service.serviceName === 'calendar' || service.serviceName === 'youtube') {
        newTokenData = await refreshGoogleToken(service.refreshToken)
      } else if (service.serviceName === 'slack') {
        newTokenData = await refreshSlackToken(service.refreshToken)
      } else if (service.serviceName.startsWith('notion')) {
        newTokenData = await refreshNotionToken(service.refreshToken)
      }

      // 토큰 갱신 성공 시 DB 업데이트
      if (newTokenData) {
        await prisma.connectedService.update({
          where: { id: service.id },
          data: {
            accessToken: newTokenData.accessToken,
            expiresAt: newTokenData.expiresAt,
            refreshToken: newTokenData.refreshToken || service.refreshToken, // 새로운 refresh token이 있으면 업데이트
            enabled: true, // 갱신 성공 시 활성화
            updatedAt: new Date(),
          },
        })

        console.log(`✅ ${service.serviceName}: 토큰 갱신 완료`)
      } else {
        // 토큰 갱신 실패 시 비활성화 (재인증 필요)
        console.log(`❌ ${service.serviceName}: 토큰 갱신 실패. 재인증이 필요합니다.`)
        
        // 서비스를 비활성화하여 브리핑에서 사용하지 않도록 함
        await prisma.connectedService.update({
          where: { id: service.id },
          data: {
            enabled: false,
            updatedAt: new Date(),
          },
        })
      }
    }

    console.log('✅ 토큰 갱신 작업 완료')
  } catch (error) {
    console.error('❌ 토큰 갱신 중 오류 발생:', error)
  }
}

/**
 * 특정 서비스의 토큰만 갱신
 */
export async function refreshServiceToken(
  userEmail: string,
  serviceName: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        connectedServices: {
          where: { serviceName },
        },
      },
    })

    if (!user || user.connectedServices.length === 0) {
      console.log(`❌ ${serviceName} 서비스를 찾을 수 없습니다`)
      return false
    }

    const service = user.connectedServices[0]

    // 토큰이 유효한 경우
    if (service.expiresAt && new Date(service.expiresAt) > new Date()) {
      console.log(`✅ ${serviceName}: 토큰이 유효합니다`)
      return true
    }

    // Refresh token이 없는 경우
    if (!service.refreshToken) {
      console.log(`⚠️ ${serviceName}: Refresh token이 없습니다`)
      return false
    }

    console.log(`🔄 ${serviceName}: 토큰 갱신 시도...`)

    let newTokenData: {
      accessToken: string
      expiresAt: Date | null
      refreshToken?: string
    } | null = null

    // 서비스 타입에 따라 적절한 갱신 함수 호출
    if (serviceName === 'gmail' || serviceName === 'calendar' || serviceName === 'youtube') {
      newTokenData = await refreshGoogleToken(service.refreshToken)
    } else if (serviceName === 'slack') {
      newTokenData = await refreshSlackToken(service.refreshToken)
    } else if (serviceName.startsWith('notion')) {
      newTokenData = await refreshNotionToken(service.refreshToken)
    }

    // 토큰 갱신 성공 시 DB 업데이트
    if (newTokenData) {
      await prisma.connectedService.update({
        where: { id: service.id },
        data: {
          accessToken: newTokenData.accessToken,
          expiresAt: newTokenData.expiresAt,
          refreshToken: newTokenData.refreshToken || service.refreshToken,
          updatedAt: new Date(),
        },
      })

      console.log(`✅ ${serviceName}: 토큰 갱신 완료`)
      return true
    }

    console.log(`❌ ${serviceName}: 토큰 갱신 실패`)
    return false
  } catch (error) {
    console.error(`❌ ${serviceName} 토큰 갱신 중 오류:`, error)
    return false
  }
}

