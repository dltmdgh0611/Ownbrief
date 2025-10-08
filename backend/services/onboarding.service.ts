import { prisma } from '../lib/prisma';

export interface OnboardingData {
  interests: string[];
  selectedPlaylists: string[];
}

/**
 * 사용자의 온보딩 상태를 확인합니다
 */
export async function checkOnboardingStatus(userId: string) {
  console.log('🔍 온보딩 상태 확인 - userId:', userId);
  
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      onboardingCompleted: true,
      interests: true,
      selectedPlaylists: true,
    },
  });

  console.log('📊 UserSettings 조회 결과:', settings);

  // UserSettings가 없거나 onboardingCompleted가 false이면 신규 사용자
  if (!settings || !settings.onboardingCompleted) {
    console.log('✨ 신규 사용자 감지 - 온보딩 필요!');
    return {
      isNewUser: true,
      needsOnboarding: true,
      settings: null,
    };
  }

  console.log('✅ 기존 사용자 - 온보딩 완료됨');
  return {
    isNewUser: false,
    needsOnboarding: false,
    settings,
  };
}

/**
 * 온보딩 데이터를 저장하고 온보딩을 완료 처리합니다
 */
export async function completeOnboarding(
  userId: string,
  data: OnboardingData
) {
  const { interests, selectedPlaylists } = data;

  console.log('💾 온보딩 완료 처리 시작 - userId:', userId);
  console.log('📋 데이터:', { interests, selectedPlaylists });

  // 최소한의 검증: 관심사와 플레이리스트가 있어야 함
  if (!interests || interests.length === 0) {
    throw new Error('최소 1개 이상의 관심사를 선택해주세요');
  }

  if (!selectedPlaylists || selectedPlaylists.length === 0) {
    throw new Error('최소 1개 이상의 플레이리스트를 선택해주세요');
  }

  // UserSettings가 없으면 생성, 있으면 업데이트
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      interests,
      selectedPlaylists,
      onboardingCompleted: true,
    },
    update: {
      interests,
      selectedPlaylists,
      onboardingCompleted: true,
    },
  });

  console.log('✅ 온보딩 완료! onboardingCompleted = true');
  return settings;
}

/**
 * 사용자의 관심사를 업데이트합니다
 */
export async function updateInterests(userId: string, interests: string[]) {
  if (!interests || interests.length === 0) {
    throw new Error('최소 1개 이상의 관심사를 선택해주세요');
  }

  const settings = await prisma.userSettings.update({
    where: { userId },
    data: { interests },
  });

  return settings;
}

/**
 * 사용자가 선택한 플레이리스트를 업데이트합니다
 */
export async function updatePlaylists(userId: string, selectedPlaylists: string[]) {
  if (!selectedPlaylists || selectedPlaylists.length === 0) {
    throw new Error('최소 1개 이상의 플레이리스트를 선택해주세요');
  }

  const settings = await prisma.userSettings.update({
    where: { userId },
    data: { selectedPlaylists },
  });

  return settings;
}

