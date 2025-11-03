'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Mic2 } from 'lucide-react'
import Header from '@/frontend/components/Header'
import { useOnboarding } from '@/frontend/hooks/useOnboarding'
import Prism from '@/components/Prism'
import PreRegisterBanner from '@/frontend/components/PreRegisterBanner'
import PreRegisterModal from '@/frontend/components/PreRegisterModal'

type ToneOfVoice = 'default' | 'zephyr' | 'charon'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { status: onboardingStatus, loading: onboardingLoading } = useOnboarding()
  const [selectedTone, setSelectedTone] = useState<ToneOfVoice>('default')
  const [showPreRegisterModal, setShowPreRegisterModal] = useState(false)
  const [isPreRegistered, setIsPreRegistered] = useState(false)

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

  // 사전등록 상태 확인
  useEffect(() => {
    if (session) {
      fetch('/api/user/pre-register')
        .then(res => res.json())
        .then(data => {
          setIsPreRegistered(data.preRegistered || false)
        })
        .catch(err => console.error('사전등록 상태 확인 실패:', err))
    }
  }, [session])

  const handlePreRegister = async () => {
    try {
      const response = await fetch('/api/user/pre-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('사전등록 실패')
      }

      const data = await response.json()
      setIsPreRegistered(true)
      console.log('✅ 사전등록 완료:', data)
    } catch (error) {
      console.error('❌ 사전등록 에러:', error)
      throw error
    }
  }

  // 로딩 중 (세션 또는 온보딩 상태)
  if (status === 'loading' || (session && onboardingLoading)) {
    return (
      <div className="h-screen relative flex flex-col">
        <div className="absolute inset-0 z-0">
          <Prism
            animationType="rotate"
            suspendWhenOffscreen={true}
            transparent={true}
            hueShift={0.3}
            glow={1.2}
            scale={3.2}
          />
        </div>
        <div className="flex-shrink-0 relative z-10">
          <Header />
        </div>
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
        </div>
      </div>
    )
  }

  // 온보딩 필요한 사용자는 리다이렉트 되므로 로딩 표시
  if (session && onboardingStatus?.needsOnboarding) {
    return (
      <div className="h-screen relative flex flex-col">
        <div className="absolute inset-0 z-0">
          <Prism
            animationType="rotate"
            suspendWhenOffscreen={true}
            transparent={true}
            hueShift={0.3}
            glow={1.2}
            scale={3.2}
          />
        </div>
        <div className="flex-shrink-0 relative z-10">
          <Header />
        </div>
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
        </div>
      </div>
    )
  }

  // 로그인 안 된 사용자는 welcome 페이지로 리다이렉트
  if (!session) {
    return null
  }

  return (
    <div className="h-screen relative flex flex-col overflow-hidden">
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

      {/* Floating 헤더 */}
      <div className="relative z-10 px-6 pt-6">
        <div className="max-w-[480px] mx-auto liquid-glass rounded-[9999px] px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 liquid-glass rounded-xl flex items-center justify-center">
                <Mic2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Ownbrief</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="text-white/80 hover:text-white transition-colors text-xs font-medium">
                Home
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="text-white/80 hover:text-white transition-colors text-xs font-medium"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 사전등록 배너 - 아직 등록하지 않은 사용자에게만 표시 */}
      {!isPreRegistered && (
        <div className="relative z-10 mt-4">
          <PreRegisterBanner onClick={() => setShowPreRegisterModal(true)} />
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex items-center justify-center relative z-10 px-6 pb-6">
        <div className="w-full max-w-[480px] mx-auto text-center space-y-8">
          {/* 메인 타이틀 */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white leading-tight text-over-prism">
              당신만을 위한
              <br />
              맞춤 브리핑
            </h1>
            <p className="text-base text-white/80 mx-auto text-over-prism">
              AI가 분석한 당신의 일정, 메일, 트렌드를 음성으로 전달합니다
            </p>
          </div>

          {/* CTA 버튼 */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push(`/briefing-player?tone=${selectedTone}`)}
              className="liquid-glass-button px-6 py-3 rounded-full text-base font-semibold text-white flex items-center justify-center gap-2 transition-transform"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              브리핑 시작하기
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="liquid-glass px-4 py-3 rounded-full text-base font-semibold text-white transition-transform"
            >
              설정
            </button>
          </div>

          {/* 말투 선택 */}
          <div className="pt-4">
            <p className="text-xs text-white/60 mb-3">브리핑 스타일 선택</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setSelectedTone('default')}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  selectedTone === 'default'
                    ? 'liquid-glass-toggle active'
                    : 'liquid-glass text-white/70'
                }`}
              >
                기본
              </button>
              <button
                onClick={() => setSelectedTone('zephyr')}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  selectedTone === 'zephyr'
                    ? 'liquid-glass-toggle active'
                    : 'liquid-glass text-white/70'
                }`}
              >
                Zephyr
              </button>
              <button
                onClick={() => setSelectedTone('charon')}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  selectedTone === 'charon'
                    ? 'liquid-glass-toggle active'
                    : 'liquid-glass text-white/70'
                }`}
              >
                Charon
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 사전등록 모달 */}
      <PreRegisterModal
        isOpen={showPreRegisterModal}
        onClose={() => setShowPreRegisterModal(false)}
        onRegister={handlePreRegister}
      />
    </div>
  )
}
