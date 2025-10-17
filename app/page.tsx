'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Header from '@/frontend/components/Header'
import BriefingPlayer from '@/frontend/components/BriefingPlayer'
import ConnectedServices from '@/frontend/components/ConnectedServices'
import { useOnboarding } from '@/frontend/hooks/useOnboarding'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { status: onboardingStatus, loading: onboardingLoading } = useOnboarding()

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
      <main className="flex-1 overflow-y-auto">
        <BriefingPlayer userEmail={session.user.email!} />
      </main>

      {/* 하단 연결된 서비스 */}
      <ConnectedServices />
    </div>
  )
}
