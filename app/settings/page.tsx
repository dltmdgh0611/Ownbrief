'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, Trash2, Loader2, ArrowLeft, RefreshCw, User, Sparkles } from 'lucide-react'

interface UserPersona {
  workStyle: string
  interests: string[]
  meetingFrequency: string
  communicationStyle: string
  primaryProjects: string[]
  preferredTime: string
  confirmed: boolean
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [persona, setPersona] = useState<UserPersona | null>(null)
  const [isLoadingPersona, setIsLoadingPersona] = useState(false)
  const [isRegeneratingPersona, setIsRegeneratingPersona] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/welcome')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      loadPersona()
    }
  }, [session])

  const loadPersona = async () => {
    try {
      setIsLoadingPersona(true)
      const response = await fetch('/api/persona')
      if (response.ok) {
        const data = await response.json()
        setPersona(data.persona)
      }
    } catch (error) {
      console.error('Failed to load persona:', error)
    } finally {
      setIsLoadingPersona(false)
    }
  }

  const handleRegeneratePersona = async () => {
    if (!confirm('페르소나를 다시 생성하시겠습니까? 기존 페르소나는 삭제됩니다.')) {
      return
    }

    try {
      setIsRegeneratingPersona(true)
      setMessage('')

      const response = await fetch('/api/persona/generate', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setPersona(data.persona)
        setMessage('페르소나가 성공적으로 재생성되었습니다.')
        setTimeout(() => setMessage(''), 3000)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to regenerate persona')
      }
    } catch (error: any) {
      console.error('Regenerate persona error:', error)
      alert(`페르소나 재생성 실패: ${error.message}`)
    } finally {
      setIsRegeneratingPersona(false)
    }
  }

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await signOut({ callbackUrl: '/welcome' })
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('⚠️ 정말로 계정을 삭제하시겠습니까?\n\n모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.')) {
      return
    }

    const confirmText = prompt('계정 삭제를 확인하려면 "DELETE"를 입력하세요:')
    if (confirmText !== 'DELETE') {
      alert('계정 삭제가 취소되었습니다.')
      return
    }

    try {
      setIsDeletingAccount(true)
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('계정이 삭제되었습니다.')
        await signOut({ callbackUrl: '/welcome' })
      } else {
        throw new Error('Failed to delete account')
      }
    } catch (error) {
      console.error('Delete account error:', error)
      alert('계정 삭제에 실패했습니다.')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 text-gray-700 hover:text-brand transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">돌아가기</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-brand" />
            <h1 className="text-xl font-bold text-gray-900">설정</h1>
          </div>
          
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 성공 메시지 */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm font-medium">{message}</p>
          </div>
        )}

        {/* 페르소나 섹션 */}
        <div className="app-card p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-brand to-brand-light rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">페르소나</h2>
              <p className="text-sm text-gray-600">AI가 분석한 당신의 프로필</p>
            </div>
          </div>

          {isLoadingPersona ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </div>
          ) : persona ? (
            <div className="space-y-4 mb-6">
              {/* 업무 스타일 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">업무 스타일</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {persona.workStyle === 'morning-person' ? '아침형 인간 🌅' : 
                   persona.workStyle === 'night-owl' ? '저녁형 인간 🌙' : 
                   '유연한 스타일 ⚡'}
                </p>
              </div>

              {/* 관심사 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">관심사</h3>
                <div className="flex flex-wrap gap-2">
                  {persona.interests?.map((interest, index) => (
                    <span
                      key={`${interest}-${index}`}
                      className="px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">페르소나가 생성되지 않았습니다.</p>
              <p className="text-sm text-gray-500">온보딩을 완료하면 자동으로 생성됩니다.</p>
            </div>
          )}

          {/* 페르소나 재생성 버튼 */}
          <button
            onClick={handleRegeneratePersona}
            disabled={isRegeneratingPersona}
            className="w-full py-3 bg-gradient-to-r from-brand to-brand-light text-white rounded-xl font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isRegeneratingPersona ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>페르소나 재생성 중...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                <span>페르소나 다시 생성하기</span>
              </>
            )}
          </button>
        </div>

        {/* 계정 설정 섹션 */}
        <div className="app-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <User className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">계정 설정</h2>
          </div>

          <div className="space-y-3">
            {/* 사용자 정보 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">로그인 계정</p>
              <p className="font-medium text-gray-900">{session?.user?.email}</p>
            </div>

            {/* 로그아웃 버튼 */}
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <LogOut className="w-5 h-5" />
              <span>로그아웃</span>
            </button>

            {/* 계정 삭제 버튼 */}
            <button
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>계정 삭제 중...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  <span>계정 삭제</span>
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-2">
              ⚠️ 계정 삭제 시 모든 데이터가 영구적으로 삭제됩니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
