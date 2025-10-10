import { prisma } from '@/backend/lib/prisma'

export class UserService {
  /**
   * 사용자 크레딧 조회
   */
  static async getUserCredits(userEmail: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { userSettings: true }
    })

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    return user.userSettings?.credits ?? 15
  }

  /**
   * 크레딧 차감
   */
  static async deductCredit(userEmail: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    })

    if (!settings) {
      throw new Error('사용자 설정을 찾을 수 없습니다.')
    }

    if (settings.credits <= 0) {
      throw new Error('크레딧이 부족합니다.')
    }

    const updated = await prisma.userSettings.update({
      where: { userId: user.id },
      data: { credits: settings.credits - 1 }
    })

    return updated.credits
  }

  /**
   * 크레딧이 충분한지 확인
   */
  static async checkCredits(userEmail: string): Promise<boolean> {
    const credits = await this.getUserCredits(userEmail)
    return credits > 0
  }

  /**
   * 사용자 설정 조회
   */
  static async getUserSettings(userEmail: string) {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { userSettings: true }
    })

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    return user.userSettings
  }

  /**
   * 사용자 설정 저장
   */
  static async saveUserSettings(
    userEmail: string,
    selectedPlaylists: string[],
    interests?: string[],
    deliveryTimeHour?: number,
    deliveryTimeMinute?: number
  ) {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    const updateData: any = {
      selectedPlaylists
    }

    if (interests !== undefined) {
      updateData.interests = interests
    }

    if (deliveryTimeHour !== undefined) {
      updateData.deliveryTimeHour = deliveryTimeHour
    }

    if (deliveryTimeMinute !== undefined) {
      updateData.deliveryTimeMinute = deliveryTimeMinute
    }

    return await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        selectedPlaylists,
        interests: interests || [],
        deliveryTimeHour: deliveryTimeHour ?? 8,
        deliveryTimeMinute: deliveryTimeMinute ?? 0,
      },
      update: updateData
    })
  }

  /**
   * 사용자 삭제
   */
  static async deleteUser(userEmail: string) {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    await prisma.user.delete({
      where: { id: user.id }
    })
  }

  /**
   * 배달 시간 업데이트
   */
  static async updateDeliveryTime(
    userEmail: string,
    deliveryTimeHour: number,
    deliveryTimeMinute: number
  ) {
    if (deliveryTimeHour < 0 || deliveryTimeHour > 23) {
      throw new Error('시간은 0-23 사이여야 합니다.')
    }

    if (deliveryTimeMinute < 0 || deliveryTimeMinute > 59) {
      throw new Error('분은 0-59 사이여야 합니다.')
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    return await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        deliveryTimeHour,
        deliveryTimeMinute
      }
    })
  }
}
