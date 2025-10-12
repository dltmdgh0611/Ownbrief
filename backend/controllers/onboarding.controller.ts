import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/auth';
import * as onboardingService from '../services/onboarding.service';

/**
 * 온보딩 상태 확인
 * GET /api/onboarding/status
 */
export async function getOnboardingStatus(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const status = await onboardingService.checkOnboardingStatus(session.user.email);
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('온보딩 상태 확인 실패:', error);
    return NextResponse.json(
      { error: '온보딩 상태를 확인할 수 없습니다' },
      { status: 500 }
    );
  }
}

/**
 * 온보딩 완료 처리
 * POST /api/onboarding/complete
 */
export async function completeOnboarding(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { interests, selectedPlaylists, deliveryTimeHour, deliveryTimeMinute, referralCode } = body;

    const settings = await onboardingService.completeOnboarding(
      session.user.email,
      { interests, selectedPlaylists, deliveryTimeHour, deliveryTimeMinute, referralCode }
    );

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('온보딩 완료 처리 실패:', error);
    return NextResponse.json(
      { error: error.message || '온보딩 완료 처리에 실패했습니다' },
      { status: 400 }
    );
  }
}

/**
 * 관심사 업데이트
 * PUT /api/onboarding/interests
 */
export async function updateInterests(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { interests } = body;

    const settings = await onboardingService.updateInterests(
      session.user.email,
      interests
    );

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('관심사 업데이트 실패:', error);
    return NextResponse.json(
      { error: error.message || '관심사 업데이트에 실패했습니다' },
      { status: 400 }
    );
  }
}

