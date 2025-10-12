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

    // 기존 사용자가 추천인 코드가 없으면 생성
    if (user.userSettings && !user.userSettings.referralCode) {
      const { generateUniqueReferralCode } = await import('../lib/referral')
      const referralCode = await generateUniqueReferralCode()
      
      await prisma.userSettings.update({
        where: { userId: user.id },
        data: { referralCode }
      })
      
      // 업데이트된 설정 반환
      return await prisma.userSettings.findUnique({
        where: { userId: user.id }
      })
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

    // 신규 사용자의 경우 추천인 코드 생성
    const { generateUniqueReferralCode } = await import('../lib/referral')
    const referralCode = await generateUniqueReferralCode()

    return await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        selectedPlaylists,
        interests: interests || [],
        deliveryTimeHour: deliveryTimeHour ?? 8,
        deliveryTimeMinute: deliveryTimeMinute ?? 0,
        onboardingCompleted: false,
        credits: 15,
        referralCode
      },
      update: {
        selectedPlaylists,
        interests: interests || [],
        deliveryTimeHour: deliveryTimeHour ?? 8,
        deliveryTimeMinute: deliveryTimeMinute ?? 0
      }
    })
  }

  /**
   * 관리자 권한 확인
   */
  static async isAdmin(userEmail: string): Promise<boolean> {
    // 특정 이메일을 관리자로 설정
    if (userEmail === 'dltmdgh0611@gmail.com') {
      return true
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { userSettings: true }
    })

    return user?.userSettings?.isAdmin || false
  }

  /**
   * 크레딧 조정 (관리자만)
   */
  static async adjustCredits(userEmail: string, targetEmail: string, credits: number): Promise<number> {
    const isAdmin = await this.isAdmin(userEmail)
    if (!isAdmin) {
      throw new Error('관리자 권한이 필요합니다.')
    }

    const targetUser = await prisma.user.findUnique({
      where: { email: targetEmail },
      include: { userSettings: true }
    })

    if (!targetUser) {
      throw new Error('대상 사용자를 찾을 수 없습니다.')
    }

    if (!targetUser.userSettings) {
      throw new Error('대상 사용자의 설정을 찾을 수 없습니다.')
    }

    const updated = await prisma.userSettings.update({
      where: { userId: targetUser.id },
      data: { credits }
    })

    return updated.credits
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
   * 배달 시간 업데이트 (하루에 한 번만 가능, 관리자는 무제한)
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
      where: { email: userEmail },
      include: { userSettings: true }
    })

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    // 관리자 권한 확인
    const isAdmin = await this.isAdmin(userEmail)
    
    // 관리자가 아닌 경우 하루에 한 번만 수정 가능
    if (!isAdmin && user.userSettings?.lastDeliveryTimeUpdate) {
      const lastUpdate = new Date(user.userSettings.lastDeliveryTimeUpdate)
      const now = new Date()
      const hoursSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceLastUpdate < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastUpdate)
        throw new Error(`배달 시간은 하루에 한 번만 변경할 수 있습니다. ${hoursRemaining}시간 후에 다시 시도해주세요.`)
      }
    }

    return await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        deliveryTimeHour,
        deliveryTimeMinute,
        lastDeliveryTimeUpdate: new Date()
      }
    })
  }
}
