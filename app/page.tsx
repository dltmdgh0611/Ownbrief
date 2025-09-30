'use client'

import { useSession } from 'next-auth/react'
import Header from '@/frontend/components/Header'
import PodcastGenerator from '@/frontend/components/PodcastGenerator'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              AI Cast에 오신 것을 환영합니다
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              유튜브 나중에 볼 동영상을 바탕으로 AI가 팟캐스트를 생성합니다
            </p>
            <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">시작하기</h2>
              <p className="text-gray-600 mb-6">
                구글 계정으로 로그인하여 유튜브 나중에 볼 동영상 목록에 접근하고 
                AI가 생성한 팟캐스트를 들어보세요.
              </p>
              <ul className="text-left text-gray-600 space-y-2 mb-6">
                <li>• 유튜브 나중에 볼 동영상에서 최근 5개 동영상 선택</li>
                <li>• 자막 정보를 추출하여 텍스트로 변환</li>
                <li>• OpenAI를 통해 자연스러운 팟캐스트 스크립트 생성</li>
                <li>• ElevenLabs를 통해 실제 음성과 같은 팟캐스트 생성</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-8">
        <PodcastGenerator />
      </main>
    </div>
  )
}
