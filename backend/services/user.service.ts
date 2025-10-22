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
      include: { 
        userSettings: {
          select: {
            id: true,
            userId: true,
            credits: true,
            createdAt: true,
            updatedAt: true,
            // 존재하지 않는 필드들 제외
          }
        }
      }
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
        referralCode
      },
      update: {
        updatedAt: new Date()
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

    // 임시로 항상 false 반환 (isAdmin 필드가 DB에 없음)
    return false
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
    // 레거시 메서드 - 사용되지 않음
    throw new Error('This method is deprecated')
  }
}
