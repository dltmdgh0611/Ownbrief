'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Mic2 } from 'lucide-react';
import Prism from '@/components/Prism';

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 로그인된 사용자는 홈으로
  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className="h-screen relative flex items-center justify-center">
        {/* Prism 배경 */}
        <div className="absolute inset-0 z-0 prism-background-container">
          <Prism
            animationType="rotate"
            suspendWhenOffscreen={true}
            transparent={true}
            hueShift={0.3}
            glow={0.4}
            bloom={0.6}
            scale={3.2}
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent relative z-10"></div>
      </div>
    );
  }

  if (session) {
    return null; // 리다이렉트 중
  }

  return (
    <div className="h-screen relative flex items-center justify-center px-4 overflow-y-auto">
      {/* Prism 배경 */}
      <div className="absolute inset-0 z-0 prism-background-container">
        <Prism
          animationType="rotate"
          suspendWhenOffscreen={true}
          transparent={true}
          hueShift={0.3}
          glow={1.2}
          scale={3.2}
        />
      </div>

      {/* 콘텐츠 */}
      <div className="text-center fade-in py-8 relative z-10">
        {/* 로고 */}
        <div className="w-28 h-28 bg-gradient-to-br from-brand to-brand-light rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
          <Mic2 className="w-14 h-14 text-white" />
        </div>
        
        {/* 환영 메시지 */}
        <h1 className="text-5xl font-bold text-white mb-4 text-over-prism">
          환영합니다
        </h1>

        <h2 className="text-3xl font-bold text-white mb-12 text-over-prism">
          Ownbrief
        </h2>

        {/* Google 로그인 버튼 - 리퀴드 글래스 스타일 */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="liquid-glass-button py-4 px-8 rounded-xl flex items-center justify-center space-x-3 mx-auto"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-lg">Google로 시작하기</span>
        </button>
      </div>
    </div>
  );
}

