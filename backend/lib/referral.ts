import { prisma } from './prisma'

/**
 * 8자 영숫자 랜덤 코드 생성
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * 유니크한 추천인 코드 생성 (중복 체크)
 */
export async function generateUniqueReferralCode(): Promise<string> {
  let code = generateReferralCode()
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const existing = await prisma.userSettings.findUnique({
      where: { referralCode: code }
    })

    if (!existing) {
      return code
    }

    code = generateReferralCode()
    attempts++
  }

  // If still not unique after max attempts, append timestamp
  return `${code}${Date.now().toString().slice(-4)}`
}

/**
 * 추천인 코드 유효성 검증
 * @param code 추천인 코드
 * @param userEmail 사용하려는 사용자의 이메일 (자기 자신 체크용)
 * @returns 유효하면 추천인의 UserSettings, 아니면 null
 */
export async function validateReferralCode(
  code: string,
  userEmail: string
): Promise<{ isValid: boolean; referrerSettings?: any; error?: string }> {
  if (!code || code.length !== 8) {
    return { isValid: false, error: '추천인 코드는 8자여야 합니다.' }
  }

  const referrerSettings = await prisma.userSettings.findUnique({
    where: { referralCode: code },
    include: { user: true }
  })

  if (!referrerSettings) {
    return { isValid: false, error: '존재하지 않는 추천인 코드입니다.' }
  }

  if (referrerSettings.user.email === userEmail) {
    return { isValid: false, error: '자신의 추천인 코드는 사용할 수 없습니다.' }
  }

  return { isValid: true, referrerSettings }
}

