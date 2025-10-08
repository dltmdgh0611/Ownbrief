'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/frontend/hooks/useOnboarding';

interface OnboardingCheckProps {
  children: React.ReactNode;
}

/**
 * 온보딩 상태를 확인하고 필요시 온보딩 페이지로 리다이렉트하는 래퍼 컴포넌트
 */
export default function OnboardingCheck({ children }: OnboardingCheckProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { status, loading } = useOnboarding();

  useEffect(() => {
    if (session && !loading && status?.needsOnboarding) {
      router.push('/onboarding');
    }
  }, [session, loading, status, router]);

  // 로딩 중이거나 온보딩 필요한 경우 로딩 표시
  if (session && (loading || status?.needsOnboarding)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
}

