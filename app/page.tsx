'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Header from '@/frontend/components/Header'
import { useOnboarding } from '@/frontend/hooks/useOnboarding'

type ToneOfVoice = 'default' | 'zephyr' | 'charon'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { status: onboardingStatus, loading: onboardingLoading } = useOnboarding()
  const [selectedTone, setSelectedTone] = useState<ToneOfVoice>('default')

  // 로그인 안 된 사용자는 welcome 페이지로
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🚪 로그인 안 됨 → /welcome으로 리다이렉트');
      router.push('/welcome')
    }
  }, [status, router])

  // 로그인한 사용자인데 온보딩이 필요하면 온보딩 페이지로
  useEffect(() => {
    if (session && !onboardingLoading && onboardingStatus?.needsOnboarding) {
      console.log('🎯 온보딩 필요 감지 → /onboarding으로 리다이렉트');
      router.push('/onboarding')
    } else if (session && !onboardingLoading && onboardingStatus && !onboardingStatus.needsOnboarding) {
      console.log('✅ 온보딩 완료 - 홈 화면 표시');
    }
  }, [session, onboardingLoading, onboardingStatus, router])

  // 로딩 중 (세션 또는 온보딩 상태)
  if (status === 'loading' || (session && onboardingLoading)) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent"></div>
        </div>
      </div>
    )
  }

  // 온보딩 필요한 사용자는 리다이렉트 되므로 로딩 표시
  if (session && onboardingStatus?.needsOnboarding) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <div className="flex-shrink-0">
          <Header />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent"></div>
        </div>
      </div>
    )
  }

  // 로그인 안 된 사용자는 welcome 페이지로 리다이렉트
  if (!session) {
    return null
  }

  return (
    <div className="h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* 상단 고정 헤더 */}
      <div className="flex-shrink-0">
        <Header />
      </div>
      
      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="text-center space-y-8 max-w-2xl px-4">
          {/* 말투 선택 UI */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              브리핑 말투 선택
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setSelectedTone('default')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedTone === 'default'
                    ? 'border-brand bg-brand/10 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900 mb-1">기본 말투</div>
                <div className="text-sm text-gray-600">친근하고 전문적인 톤</div>
              </button>
              
              <button
                onClick={() => setSelectedTone('zephyr')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedTone === 'zephyr'
                    ? 'border-brand bg-brand/10 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900 mb-1">Zephyr</div>
                <div className="text-sm text-gray-600">여자친구 같은 따뜻한 말투</div>
              </button>
              
              <button
                onClick={() => setSelectedTone('charon')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedTone === 'charon'
                    ? 'border-brand bg-brand/10 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900 mb-1">Charon</div>
                <div className="text-sm text-gray-600">친구같고 시니컬한 말투</div>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-6">
            <button
              onClick={() => router.push(`/briefing-player?tone=${selectedTone}`)}
              className="w-32 h-32 rounded-full bg-gradient-to-r from-brand to-brand-light shadow-2xl hover:shadow-3xl active:scale-95 transition-all duration-200 flex items-center justify-center group"
            >
              <svg className="w-16 h-16 text-white ml-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                오늘의 브리핑
              </h2>
              <p className="text-gray-600">
                재생 버튼을 눌러 맞춤 브리핑을 시작하세요
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
