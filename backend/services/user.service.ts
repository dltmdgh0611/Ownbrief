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
    selectedPlaylists: string[],
    interests?: string[]
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

    // 업데이트할 데이터 준비
    const updateData: any = { selectedPlaylists }
    if (interests !== undefined) {
      updateData.interests = interests
    }

    // Upsert 실행
    return await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        selectedPlaylists,
        interests: interests || []
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

    console.log('🗑️ 계정 삭제 시작 - userId:', user.id);

    // 트랜잭션으로 모든 관련 데이터 삭제
    await prisma.$transaction(async (tx) => {
      // 1. UserSettings 삭제
      const deletedSettings = await tx.userSettings.deleteMany({
        where: { userId: user.id }
      })
      console.log('✅ UserSettings 삭제:', deletedSettings.count);

      // 2. Podcast 삭제 (Cascade로 자동 삭제되지만 명시적으로)
      const deletedPodcasts = await tx.podcast.deleteMany({
        where: { userId: user.id }
      })
      console.log('✅ Podcasts 삭제:', deletedPodcasts.count);

      // 3. Session 삭제 (Cascade로 자동 삭제되지만 명시적으로)
      const deletedSessions = await tx.session.deleteMany({
        where: { userId: user.id }
      })
      console.log('✅ Sessions 삭제:', deletedSessions.count);

      // 4. Account 삭제 (Cascade로 자동 삭제되지만 명시적으로)
      const deletedAccounts = await tx.account.deleteMany({
        where: { userId: user.id }
      })
      console.log('✅ Accounts 삭제:', deletedAccounts.count);

      // 5. 마지막으로 User 삭제
      await tx.user.delete({
        where: { id: user.id }
      })
      console.log('✅ User 삭제 완료');
    })

    console.log('🎉 모든 사용자 데이터 삭제 완료!');
  }
}
