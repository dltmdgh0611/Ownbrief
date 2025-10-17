'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sparkles, ChevronRight, Check, Loader2, Mic2, CheckCircle2, Edit } from 'lucide-react'

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [persona, setPersona] = useState<any>(null)
  const [feedback, setFeedback] = useState({
    workStyle: '',
    interests: [] as string[],
  })
  const [isEditing, setIsEditing] = useState(false)

  // 세션 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/welcome')
    }
  }, [status, router])

  // Step 1: Google 연결 자동 완료 (이미 로그인됨)
  useEffect(() => {
    if (session && step === 1) {
      // 자동으로 Step 2로 이동
      setTimeout(() => setStep(2), 500)
    }
  }, [session, step])

  // Step 2: 페르소나 생성
  const handleGeneratePersona = async () => {
    try {
      setLoading(true)
      setStep(3) // 로딩 화면으로 이동

      const response = await fetch('/api/persona/generate', {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // invalid_grant 오류 감지
        if (errorData.error?.includes('invalid_grant') || 
            errorData.error?.includes('권한') ||
            response.status === 401) {
          // 재인증 필요 - 로그아웃 후 다시 로그인
          alert('새로운 권한 승인이 필요합니다. 다시 로그인해주세요.')
          // 로그아웃 후 로그인 페이지로
          window.location.href = '/api/auth/signout?callbackUrl=/welcome'
          return
        }
        
        throw new Error(errorData.error || 'Failed to generate persona')
      }

      const data = await response.json()
      setPersona(data.persona)
      
      setStep(4) // 페르소나 확인 화면으로
    } catch (error) {
      console.error('Persona generation error:', error)
      alert('페르소나 생성에 실패했습니다. 다시 시도해주세요.')
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  // Step 4: 페르소나 확인 - "정확해요" 클릭
  const handleConfirmPersona = async () => {
    try {
      setLoading(true)

      await fetch('/api/persona/confirm', {
        method: 'POST',
      })

      setStep(5) // 완료 화면
    } catch (error) {
      console.error('Persona confirm error:', error)
      alert('확인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // Step 4: 페르소나 확인 - "수정할게요" 클릭
  const handleEditPersona = () => {
    if (persona) {
      setFeedback({
        workStyle: persona.workStyle || '',
        interests: persona.interests || [],
      })
    }
    setIsEditing(true)
  }

  // 피드백 제출
  const handleSubmitFeedback = async () => {
    try {
      setLoading(true)

      await fetch('/api/persona/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback),
      })

      setStep(5) // 완료 화면
    } catch (error) {
      console.error('Feedback submit error:', error)
      alert('피드백 제출에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // Step 5: 완료 - 메인으로 이동
  const handleComplete = () => {
    router.push('/')
  }

  if (status === 'loading') {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    )
  }

  // Step 1: 환영 + Google 연결
  if (step === 1) {
    return (
      <div className="h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-gradient-to-br from-brand to-brand-light rounded-3xl flex items-center justify-center mb-6 shadow-xl">
          <Mic2 className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-brand-dark mb-4 text-center">
          Hello!
          <br />
          OwnBrief에 오신걸 환영합니다
        </h1>
        
        <p className="text-gray-600 text-center mb-8 max-w-md">
          당신만을 위한 맞춤 브리핑을 만들어드립니다.
          <br />
          데이터를 분석하여 페르소나를 생성하고 있어요...
        </p>

        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    )
  }

  // Step 2: 페르소나 생성 시작
  if (step === 2) {
    return (
      <div className="h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-gradient-to-br from-brand to-brand-light rounded-3xl flex items-center justify-center mb-6 shadow-xl">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-brand-dark mb-4 text-center">
          페르소나 생성
        </h1>
        
        <p className="text-gray-600 text-center mb-8 max-w-md">
          연동된 데이터를 분석하여
          <br />
          당신의 페르소나를 생성합니다
        </p>

        <button
          onClick={handleGeneratePersona}
          disabled={loading}
          className="px-8 py-4 bg-gradient-to-r from-brand to-brand-light text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>생성 중...</span>
            </span>
          ) : (
            '페르소나 생성하기'
          )}
        </button>
      </div>
    )
  }

  // Step 3: 페르소나 생성 중 (로딩)
  if (step === 3) {
    return (
      <div className="h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col items-center justify-center p-6">
        <Loader2 className="w-16 h-16 animate-spin text-brand mb-6" />
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          당신의 데이터를 분석하고 있어요...
        </h2>
        
        <p className="text-gray-600 text-center max-w-md">
          Calendar, Gmail, YouTube 등의 데이터를 바탕으로
          <br />
          AI가 페르소나를 생성하고 있습니다
        </p>

        <div className="mt-8 space-y-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>일정 패턴 분석 중...</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>관심사 추출 중...</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>업무 스타일 파악 중...</span>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: 페르소나 확인
  if (step === 4 && persona) {
    if (isEditing) {
      return (
        <div className="h-screen bg-gradient-to-b from-primary-50 to-white overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              페르소나 수정
            </h1>

            <div className="app-card p-6 space-y-6">
              {/* 업무 스타일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  업무 스타일
                </label>
                <select
                  value={feedback.workStyle}
                  onChange={(e) => setFeedback({ ...feedback, workStyle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                >
                  <option value="morning-person">아침형 인간</option>
                  <option value="night-owl">저녁형 인간</option>
                  <option value="flexible">유연한 스타일</option>
                </select>
              </div>

              {/* 관심사 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  관심사 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={feedback.interests.join(', ')}
                  onChange={(e) => setFeedback({ 
                    ...feedback, 
                    interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                  placeholder="AI, 스타트업, 기술"
                />
              </div>

              <button
                onClick={handleSubmitFeedback}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-brand to-brand-light text-white rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="h-screen bg-gradient-to-b from-primary-50 to-white overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto py-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-brand to-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 분석 결과
            </h1>
            <p className="text-gray-600">
              AI가 생성한 페르소나를 확인해주세요
            </p>
          </div>

          <div className="app-card p-6 space-y-4 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">업무 스타일</h3>
              <p className="text-lg font-semibold text-gray-900">
                {persona.workStyle === 'morning-person' ? '아침형 인간 🌅' : 
                 persona.workStyle === 'night-owl' ? '저녁형 인간 🌙' : 
                 '유연한 스타일 ⚡'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">관심사</h3>
              <div className="flex flex-wrap gap-2">
                {persona.interests?.map((interest: string) => (
                  <span
                    key={interest}
                    className="px-3 py-1 bg-brand/10 text-brand rounded-lg text-sm font-medium"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleEditPersona}
              className="py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors flex items-center justify-center space-x-2"
            >
              <Edit className="w-5 h-5" />
              <span>수정할게요</span>
            </button>
            
            <button
              onClick={handleConfirmPersona}
              disabled={loading}
              className="py-4 bg-gradient-to-r from-brand to-brand-light text-white rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{loading ? '확인 중...' : '정확해요!'}</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 5: 완료
  if (step === 5) {
    return (
      <div className="h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-gradient-to-br from-brand to-brand-light rounded-full flex items-center justify-center mb-6 animate-bounce">
          <Check className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">
          🎉 모든 준비가 완료되었습니다!
        </h1>
        
        <p className="text-gray-600 text-center mb-8 max-w-md">
          이제 당신만을 위한 맞춤 브리핑을 생성할 수 있습니다
        </p>

        <button
          onClick={handleComplete}
          className="px-8 py-4 bg-gradient-to-r from-brand to-brand-light text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center space-x-2"
        >
          <span>시작하기</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return null
}
