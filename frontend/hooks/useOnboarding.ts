import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface OnboardingStatus {
  isNewUser: boolean;
  needsOnboarding: boolean;
  settings: {
    onboardingCompleted: boolean;
    interests: string[];
    selectedPlaylists: string[];
  } | null;
}

export function useOnboarding() {
  const { data: session, status: sessionStatus } = useSession();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasChecked = useRef(false); // 이미 체크했는지 추적

  const checkOnboardingStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/onboarding/status');
      
      if (!response.ok) {
        if (response.status === 401) {
          // 인증 에러 - 로그인 필요
          setStatus(null);
          return;
        }
        throw new Error('온보딩 상태를 확인할 수 없습니다');
      }

      const data = await response.json();
      console.log('📋 온보딩 상태:', data);
      setStatus(data);
    } catch (err: any) {
      console.error('온보딩 상태 확인 에러:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 세션 상태가 로딩 중이면 아무것도 하지 않음
    if (sessionStatus === 'loading') {
      return;
    }
    
    // 로그인 안 된 상태면 즉시 로딩 완료 처리하고 상태 초기화
    if (sessionStatus === 'unauthenticated' || !session) {
      console.log('🚫 로그아웃 상태 - 온보딩 체크 중단');
      setLoading(false);
      setStatus(null);
      hasChecked.current = false; // 로그아웃 시 초기화
      return;
    }
    
    // 로그인 직후 한 번만 체크
    if (sessionStatus === 'authenticated' && session && !hasChecked.current) {
      console.log('🔍 온보딩 상태 최초 체크 (1회만)');
      checkOnboardingStatus();
      hasChecked.current = true; // 체크 완료 표시
    }
  }, [sessionStatus, session]); // session도 의존성에 추가

  const completeOnboarding = async (
    interests: string[],
    selectedPlaylists: string[]
  ) => {
    try {
      setLoading(true);
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interests, selectedPlaylists }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '온보딩 완료 처리에 실패했습니다');
      }

      const data = await response.json();
      
      // 상태 업데이트
      await checkOnboardingStatus();
      
      return data.settings;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateInterests = async (interests: string[]) => {
    try {
      setLoading(true);
      const response = await fetch('/api/onboarding/interests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interests }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '관심사 업데이트에 실패했습니다');
      }

      const data = await response.json();
      
      // 상태 업데이트
      await checkOnboardingStatus();
      
      return data.settings;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    status,
    loading,
    error,
    checkOnboardingStatus,
    completeOnboarding,
    updateInterests,
  };
}

