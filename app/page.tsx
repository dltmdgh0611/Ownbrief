'use client'

import { useSession } from 'next-auth/react'
import Header from '@/frontend/components/Header'
import PodcastGenerator from '@/frontend/components/PodcastGenerator'
import { Mic2, Sparkles, Zap, Headphones } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header />
        <main className="px-4 py-8 pb-24">
          <div className="text-center mb-8 fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Mic2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              OwnBrief에
              <br />
              오신 것을 환영합니다
            </h1>
            <p className="text-base text-gray-600 px-4">
              유튜브 동영상을 AI가 팟캐스트로 변환합니다
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="app-card p-5 fade-in" style={{animationDelay: '0.1s'}}>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">똑똑한 AI 분석</h3>
                  <p className="text-sm text-gray-600">
                    유튜브 동영상의 자막을 분석하여 핵심 내용을 추출합니다
                  </p>
                </div>
              </div>
            </div>

            <div className="app-card p-5 fade-in" style={{animationDelay: '0.2s'}}>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">빠른 생성</h3>
                  <p className="text-sm text-gray-600">
                    단 몇 분만에 자연스러운 팟캐스트 스크립트를 생성합니다
                  </p>
                </div>
              </div>
            </div>

            <div className="app-card p-5 fade-in" style={{animationDelay: '0.3s'}}>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Headphones className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">실제 같은 음성</h3>
                  <p className="text-sm text-gray-600">
                    ElevenLabs를 통해 사람과 같은 자연스러운 음성을 생성합니다
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="app-card p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-100 fade-in" style={{animationDelay: '0.4s'}}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">시작하기</h2>
            <ul className="space-y-2 text-sm text-gray-700 mb-4">
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                <span>구글 계정으로 로그인</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                <span>유튜브 플레이리스트 연동</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                <span>AI가 자동으로 팟캐스트 생성</span>
              </li>
            </ul>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />
      <main className="pb-6">
        <PodcastGenerator />
      </main>
    </div>
  )
}
