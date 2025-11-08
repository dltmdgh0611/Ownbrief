'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronRight, Mail, Calendar, Newspaper, Sparkles, Check, Youtube, Plus, X } from 'lucide-react'
import Prism from '@/components/Prism'

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [step, setStep] = useState(2)
  const [loading, setLoading] = useState(false)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [availableKeywords, setAvailableKeywords] = useState<any[]>([])
  const [connectedServices, setConnectedServices] = useState<Set<string>>(new Set())
  const [isYoutubeAnalyzed, setIsYoutubeAnalyzed] = useState(false)
  const [newInterestInput, setNewInterestInput] = useState('')
  const [showAddInput, setShowAddInput] = useState(false)

  // 세션 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/welcome')
    }
  }, [status, router])


  // 키워드 직접 선택으로 이동
  const handleSkipToKeywords = async () => {
    // 유튜브가 연결되었으면 분석, 아니면 일반 키워드 로드
    if (connectedServices.has('youtube')) {
      try {
        setLoading(true)
        const response = await fetch('/api/persona/analyze-youtube', {
          method: 'POST',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.interests && data.interests.length > 0) {
            // 유튜브 분석 결과를 키워드로 변환
            const youtubeKeywords = data.interests.map((interest: string, index: number) => ({
              id: `youtube-${index}`,
              label: interest,
            }))
            setAvailableKeywords(youtubeKeywords)
            setIsYoutubeAnalyzed(true)
          } else {
            // 분석 결과가 없으면 일반 키워드 로드
            await loadSuggestedKeywords()
          }
        } else {
          // 분석 실패 시 일반 키워드 로드
          await loadSuggestedKeywords()
        }
      } catch (error) {
        console.error('YouTube analysis error:', error)
        await loadSuggestedKeywords()
      } finally {
        setLoading(false)
      }
    } else {
      await loadSuggestedKeywords()
    }
    
    setStep(6)
  }

  // 서비스 연결 핸들러
  const handleConnectService = async (service: 'gmail' | 'calendar' | 'youtube') => {
    try {
      setLoading(true)
      const response = await fetch(`/api/auth/connect-service?service=${service}`)
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      if (data.authUrl) {
        // 디버깅: 실제 사용되는 리다이렉트 URI 확인
        console.log('🔗 Redirect URI:', data.redirectUri)
        console.log('🔗 OAuth URL:', data.authUrl.substring(0, 150) + '...')
        
        // 새 창에서 OAuth 연결
        const width = 500
        const height = 600
        const left = window.screen.width / 2 - width / 2
        const top = window.screen.height / 2 - height / 2
        
        const popup = window.open(
          data.authUrl,
          'Connect Service',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        )

        if (!popup) {
          alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.')
          setLoading(false)
          return
        }

        // 팝업이 닫히면 확인
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed)
            setLoading(false)
            // URL 파라미터 확인
            const urlParams = new URLSearchParams(window.location.search)
            const connectedService = urlParams.get('connected')
            if (connectedService) {
              // 연결 완료 상태 업데이트
              setConnectedServices(prev => new Set(prev).add(connectedService))
              // URL 정리
              window.history.replaceState({}, '', '/onboarding')
            } else if (urlParams.get('error')) {
              alert('연결에 실패했습니다. 다시 시도해주세요.')
              window.history.replaceState({}, '', '/onboarding')
            }
          }
        }, 500)

        // 메시지 리스너로 팝업에서 메시지 받기
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return
          
          if (event.data.type === 'SERVICE_CONNECTED') {
            clearInterval(checkClosed)
            setLoading(false)
            // 연결 완료 상태 업데이트
            setConnectedServices(prev => new Set(prev).add(service))
            popup?.close()
            window.removeEventListener('message', messageHandler)
          }
        }
        
        window.addEventListener('message', messageHandler)
      } else {
        throw new Error('Failed to get auth URL')
      }
    } catch (error) {
      console.error('Service connection error:', error)
      alert(`서비스 연결에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      setLoading(false)
    }
  }

  // URL 파라미터 확인 (콜백 후)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const connected = urlParams.get('connected')
    const error = urlParams.get('error')
    
    if (connected) {
      // 연결 완료 상태 업데이트
      setConnectedServices(prev => new Set(prev).add(connected))
      window.history.replaceState({}, '', '/onboarding')
    } else if (error) {
      alert('연결에 실패했습니다. 다시 시도해주세요.')
      window.history.replaceState({}, '', '/onboarding')
    }
  }, [])

  // 키워드 목록 불러오기
  const loadSuggestedKeywords = async () => {
    try {
      const response = await fetch('/api/keywords/suggested')
      const data = await response.json()
      setAvailableKeywords(data.keywords || [])
    } catch (error) {
      console.error('Failed to load keywords:', error)
    }
  }

  // 키워드 토글
  const toggleInterest = (keyword: string) => {
    if (selectedInterests.includes(keyword)) {
      setSelectedInterests(selectedInterests.filter(k => k !== keyword))
    } else {
      if (selectedInterests.length < 10) {
        setSelectedInterests([...selectedInterests, keyword])
      }
    }
  }

  // 새 관심사 추가
  const handleAddInterest = () => {
    const trimmed = newInterestInput.trim()
    if (trimmed && !selectedInterests.includes(trimmed) && selectedInterests.length < 10) {
      setSelectedInterests([...selectedInterests, trimmed])
      setNewInterestInput('')
      setShowAddInput(false)
    }
  }

  // 관심사 제거
  const handleRemoveInterest = (interest: string) => {
    setSelectedInterests(selectedInterests.filter(k => k !== interest))
  }

  // 온보딩 완료
  const handleComplete = async () => {
    try {
      setLoading(true)

      // 관심사 저장
      await fetch('/api/persona/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: selectedInterests }),
      })

      // 온보딩 완료 표시
      await fetch('/api/persona/confirm', {
        method: 'POST',
      })

      router.push('/')
    } catch (error) {
      console.error('Complete onboarding error:', error)
      alert('완료 처리에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="h-screen relative flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Prism
            animationType="rotate"
            suspendWhenOffscreen={true}
            transparent={true}
            hueShift={0.3}
            glow={1.2}
            bloom={0.6}
            scale={3.2}
          />
        </div>
        <Loader2 className="w-8 h-8 animate-spin text-white relative z-10" />
      </div>
    )
  }

  // Step 2: 친필 서명 & 안내 화면
  if (step === 2) {
    return (
      <div className="h-screen relative flex flex-col items-center justify-center p-6">
        <div className="absolute inset-0 z-0">
          <Prism
            animationType="rotate"
            suspendWhenOffscreen={true}
            transparent={true}
            hueShift={0.3}
            glow={1.2}
            bloom={0.6}
            scale={3.2}
          />
        </div>
        <div className="w-full max-w-[480px] mx-auto text-center relative z-10">
          <p className="text-white/90 text-lg mb-4 text-over-prism">
            우리는 창업가들을 위한 서비스를 만들고 있습니다.<br />
            당신의 컨텍스트를 효율적으로 전달하기 위해<br />
            노력하고 있습니다.
          </p>

          <p className="text-white/90 text-lg mb-4 text-over-prism">
            이것은 시작에 불과하며,<br />
            당신의 경험이 다음을 형성하는 데 도움이 됩니다.<br />
            우리는 빠르게 반복하므로, 무엇이 당신을 즐겁게 하고,<br />
            혼란스럽게 하며, 영감을 주는지 알려주세요.
          </p>

          <div className="my-8">
            <p className="text-sm text-white/60 mb-4 text-over-prism">
              보안적으로 우리는 데이터베이스에 당신의 정보를<br />
              저장하지 않고 분석 후 바로 폐기한다
            </p>

            <p className="text-white/90 text-lg mb-6 text-over-prism">
              감사하는 마음으로,
            </p>

            <p className="text-3xl font-signature text-white italic text-over-prism">
              박영민
            </p>
            
            <p className="text-white/70 text-sm mt-2 text-over-prism">
              Ownbrief team 😊
            </p>
          </div>

          <button
            onClick={() => setStep(3)}
            className="liquid-glass-button px-8 py-3 rounded-xl font-semibold"
          >
            다음
          </button>
        </div>
      </div>
    )
  }

  // Step 3: 온브리프 구동 예시 화면
  if (step === 3) {
    return (
      <div className="h-screen relative flex flex-col items-center justify-center p-6">
        <div className="absolute inset-0 z-0">
          <Prism
            animationType="rotate"
            suspendWhenOffscreen={true}
            transparent={true}
            hueShift={0.3}
            glow={1.2}
            bloom={0.6}
            scale={3.2}
          />
        </div>
        <div className="w-full max-w-[480px] mx-auto relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 text-over-prism">
              Stay on top of it
            </h2>
            <p className="text-white/80 text-over-prism">
              캘린더, 이메일, 최신 뉴스에서<br />
              개인화된 브리핑으로 하루를 시작하세요.<br />
              질문하고, 피드백을 공유하고,<br />
              실시간으로 소통하세요.
            </p>
          </div>

          {/* Daily Briefing Card */}
          <div className="liquid-glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                2025년 9월 27일<br />
                {session?.user?.name?.split(' ')[0] || '영민'}의 Daily Briefing
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 liquid-glass p-3 rounded-lg">
                <Mail className="w-5 h-5 text-blue-400" />
                <span className="text-white">Email</span>
              </div>

              <div className="flex items-center space-x-3 liquid-glass p-3 rounded-lg">
                <Newspaper className="w-5 h-5 text-green-400" />
                <span className="text-white">News</span>
              </div>

              <div className="flex items-center space-x-3 liquid-glass p-3 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span className="text-white">Calendar</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(4)}
            className="w-full liquid-glass-button px-8 py-4 rounded-xl font-bold"
          >
            다음
          </button>
        </div>
      </div>
    )
  }

  // Step 4: 서비스 연결 페이지
  if (step === 4) {
    return (
      <div className="h-screen relative flex flex-col items-center justify-center p-6">
        <div className="absolute inset-0 z-0">
          <Prism
            animationType="rotate"
            suspendWhenOffscreen={true}
            transparent={true}
            hueShift={0.3}
            glow={1.2}
            bloom={0.6}
            scale={3.2}
          />
        </div>
        <div className="w-full max-w-[480px] mx-auto relative z-10">
          <div className="text-right mb-4">
            <button
              onClick={handleSkipToKeywords}
              className="text-white/70 hover:text-white text-sm transition-colors text-over-prism"
            >
              나중에 설정
            </button>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 text-over-prism">
              일일 브리핑을 개인화하세요
            </h2>
            <p className="text-white/80 mb-4 text-over-prism">
              캘린더와 받은편지함을 추가하세요—<br />
              Ownbrief가 이를 항상 최신 상태의<br />
              일일 브리핑으로 변환합니다.
            </p>
            <p className="text-sm text-white/70 mb-4 text-over-prism">
              💡 <strong>Gmail</strong>과 <strong>유튜브</strong>를 연결하시면<br />
              더 정확한 관심사 추천을 받을 수 있습니다
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <button
              onClick={() => handleConnectService('calendar')}
              disabled={loading || connectedServices.has('calendar')}
              className={`w-full liquid-glass px-6 py-4 rounded-xl flex items-center space-x-3 ${
                connectedServices.has('calendar') ? 'opacity-60 cursor-not-allowed' : ''
              } disabled:opacity-50`}
            >
              <Calendar className="w-6 h-6" />
              <div className="flex-1 text-left">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span>구글 캘린더 연결</span>
                  {connectedServices.has('calendar') && (
                    <span className="text-xs text-green-400 flex items-center space-x-1">
                      <Check className="w-4 h-4" />
                      <span>연결 완료됨</span>
                    </span>
                  )}
                </div>
                <div className="text-sm text-white/60">다가오는 일정을 검토합니다</div>
              </div>
            </button>

            <button
              onClick={() => handleConnectService('gmail')}
              disabled={loading || connectedServices.has('gmail')}
              className={`w-full liquid-glass px-6 py-4 rounded-xl flex items-center space-x-3 ${
                connectedServices.has('gmail') ? 'opacity-60 cursor-not-allowed' : ''
              } disabled:opacity-50`}
            >
              <Mail className="w-6 h-6" />
              <div className="flex-1 text-left">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span>Gmail 연결</span>
                  {connectedServices.has('gmail') && (
                    <span className="text-xs text-green-400 flex items-center space-x-1">
                      <Check className="w-4 h-4" />
                      <span>연결 완료됨</span>
                    </span>
                  )}
                </div>
                <div className="text-sm text-white/60">중요한 이메일과 작업을 요약합니다</div>
              </div>
            </button>

            <button
              onClick={() => handleConnectService('youtube')}
              disabled={loading || connectedServices.has('youtube')}
              className={`w-full liquid-glass px-6 py-4 rounded-xl flex items-center space-x-3 ${
                connectedServices.has('youtube') ? 'opacity-60 cursor-not-allowed' : ''
              } disabled:opacity-50`}
            >
              <Youtube className="w-6 h-6" />
              <div className="flex-1 text-left">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span>유튜브 연결</span>
                  {connectedServices.has('youtube') && (
                    <span className="text-xs text-green-400 flex items-center space-x-1">
                      <Check className="w-4 h-4" />
                      <span>연결 완료됨</span>
                    </span>
                  )}
                </div>
                <div className="text-sm text-white/60">관심사를 자동으로 분석합니다</div>
              </div>
            </button>
          </div>

          <p className="text-center text-white/60 text-sm mb-6 text-over-prism">
            나중에 설정에서 이 서비스들을 연결할 수 있습니다
          </p>

          <button
            onClick={handleSkipToKeywords}
            disabled={connectedServices.size === 0}
            className="w-full liquid-glass-button px-8 py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            계속하기
          </button>
        </div>
      </div>
    )
  }

  // Step 6: 키워드 선택
  if (step === 6) {
    return (
      <div className="h-screen relative flex flex-col overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Prism
            animationType="rotate"
            suspendWhenOffscreen={true}
            transparent={true}
            hueShift={0.3}
            glow={1.2}
            bloom={0.6}
            scale={3.2}
          />
        </div>

        <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
          {/* 헤더 */}
          <div className="flex-shrink-0 px-6 pt-12 pb-4">
            <div className="w-full max-w-[480px] mx-auto">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2 text-over-prism">
                  당신의 개인화된 관심사
                </h2>
                {isYoutubeAnalyzed ? (
                  <p className="text-white/80 mb-2 text-over-prism">
                    유튜브 데이터를 기반으로 추천된 관심사입니다.<br />
                    수정하거나 추가하세요
                  </p>
                ) : (
                  <p className="text-white/80 mb-2 text-over-prism">
                    수정하거나 추가하세요
                  </p>
                )}
                <p className="text-sm text-white/60 text-over-prism">
                  선택됨: {selectedInterests.length} / 10
                </p>
              </div>
            </div>
          </div>

          {/* 스크롤 가능한 키워드 리스트 */}
          <div className="flex-1 overflow-y-auto px-6">
            <div className="w-full max-w-[480px] mx-auto pb-4">
              {/* 선택된 관심사 표시 */}
              {selectedInterests.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-white/60 mb-2 text-over-prism">선택된 관심사</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedInterests.map((interest) => (
                      <div
                        key={interest}
                        className="liquid-glass-toggle active px-4 py-2 rounded-lg flex items-center space-x-2"
                      >
                        <span className="text-white text-sm">{interest}</span>
                        <button
                          onClick={() => handleRemoveInterest(interest)}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 새 관심사 추가 입력 */}
              {showAddInput ? (
                <div className="mb-4 flex items-center space-x-2">
                  <input
                    type="text"
                    value={newInterestInput}
                    onChange={(e) => setNewInterestInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddInterest()
                      }
                    }}
                    placeholder="관심사 입력..."
                    className="flex-1 liquid-glass px-4 py-3 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                    autoFocus
                  />
                  <button
                    onClick={handleAddInterest}
                    disabled={!newInterestInput.trim() || selectedInterests.length >= 10}
                    className="liquid-glass-button px-4 py-3 rounded-xl disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setShowAddInput(false)
                      setNewInterestInput('')
                    }}
                    className="liquid-glass px-4 py-3 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddInput(true)}
                  disabled={selectedInterests.length >= 10}
                  className="w-full liquid-glass px-6 py-4 rounded-xl flex items-center justify-center space-x-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-white/80">관심사 추가</span>
                </button>
              )}

              {/* 키워드 리스트 */}
              <div className="space-y-3">
                {
                  availableKeywords.map((keyword) => {
                    return (
                      <button
                        key={keyword.id}
                        onClick={() => toggleInterest(keyword.label)}
                        className={`w-full px-6 py-4 rounded-xl text-left font-medium flex items-center space-x-3 ${
                          selectedInterests.includes(keyword.label)
                            ? 'liquid-glass-toggle active'
                            : 'liquid-glass text-white/80'
                        }`}
                      >
                        <span className={selectedInterests.includes(keyword.label) ? 'text-white' : ''}>{keyword.label}</span>
                      </button>
                    )
                  })
                }
              </div>
            </div>
          </div>

          {/* 고정된 하단 버튼 */}
          <div className="flex-shrink-0 px-6 pb-6 pt-4 bg-gradient-to-t from-gray-950/80 via-gray-950/40 to-transparent">
            <div className="w-full max-w-[480px] mx-auto">
              <button
                onClick={handleComplete}
                disabled={loading || selectedInterests.length < 3}
                className="w-full liquid-glass-button px-8 py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>저장 중...</span>
                  </span>
                ) : (
                  '완료'
                )}
              </button>

              {selectedInterests.length < 3 && (
                <p className="text-center text-white/60 text-sm mt-2 text-over-prism">
                  최소 3개 이상의 관심사를 선택해주세요
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
