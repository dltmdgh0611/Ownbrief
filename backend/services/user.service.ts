import { prisma } from '@/backend/lib/prisma'
import type { UserSettings } from '@/backend/types'

export class UserService {
  /**
   * 사용자 설정 가져오기
   */
  static async getUserSettings(userEmail: string): Promise<UserSettings | null> {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    // 사용자 설정 가져오기
    let userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    })

    // 기존 email 기반 데이터 마이그레이션
    if (!userSettings) {
      userSettings = await prisma.userSettings.findUnique({
        where: { userId: userEmail }
      })
      
      if (userSettings) {
        console.log('🔄 기존 사용자 설정을 새로운 ID로 마이그레이션 중...')
        userSettings = await prisma.userSettings.update({
          where: { userId: userEmail },
          data: { userId: user.id }
        })
      }
    }

    // 설정이 없으면 기본값으로 생성
    if (!userSettings) {
      userSettings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          selectedPlaylists: []
        }
      })
    }

    return userSettings
  }

  /**
   * 사용자 설정 저장
   */
  static async saveUserSettings(
    userEmail: string,
    selectedPlaylists: string[]
  ): Promise<UserSettings> {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    // 기존 설정 확인 및 마이그레이션
    let existingSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    })

    if (!existingSettings) {
      existingSettings = await prisma.userSettings.findUnique({
        where: { userId: userEmail }
      })
      
      if (existingSettings) {
        existingSettings = await prisma.userSettings.update({
          where: { userId: userEmail },
          data: { userId: user.id }
        })
      }
    }

    // Upsert 실행
    return await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: { selectedPlaylists },
      create: {
        userId: user.id,
        selectedPlaylists
      }
    })
  }

  /**
   * 사용자 계정 삭제
   */
  static async deleteUser(userEmail: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    // Cascade 설정으로 인해 관련 데이터도 자동 삭제됨
    await prisma.user.delete({
      where: { id: user.id }
    })
  }
}
