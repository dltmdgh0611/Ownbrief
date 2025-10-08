'use client'

import { useState, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, Play, FileText, Mic, CheckCircle, Loader2 } from 'lucide-react'
import { apiPost } from '@/backend/lib/api-client'

interface VideoInfo {
  id: string
  title: string
  thumbnail?: string
}

interface StepByStepModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (podcastId: string) => void
}

const StepByStepModal = memo(function StepByStepModal({ isOpen, onClose, onComplete }: StepByStepModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [videos, setVideos] = useState<VideoInfo[]>([])
  const [script, setScript] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [podcastId, setPodcastId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasAnimated, setHasAnimated] = useState(false) // 애니메이션 실행 여부 추적
  const [subtitleProgress, setSubtitleProgress] = useState<{
    current: number
    total: number
    currentVideo: string
    completedVideos: string[]
  }>({ current: 0, total: 0, currentVideo: '', completedVideos: [] })

  // 모달이 열릴 때 저장된 상태 복구
  useEffect(() => {
    if (isOpen) {
      const savedState = localStorage.getItem('podcast_generation_state')
      if (savedState) {
        try {
          const state = JSON.parse(savedState)
          console.log('🔄 팟캐스트 생성 상태 복구:', state)
          setCurrentStep(state.currentStep || 0)
          setVideos(state.videos || [])
          setScript(state.script || '')
          setAudioUrl(state.audioUrl || '')
          setPodcastId(state.podcastId || '')
          setHasAnimated(true) // 이미 열려있던 모달이므로 애니메이션 건너뛰기
        } catch (e) {
          console.error('❌ 상태 복구 실패:', e)
        }
      } else {
        // 처음 열리는 모달
        setHasAnimated(false)
      }
    } else {
      // 모달이 닫힐 때 애니메이션 상태 초기화
      setHasAnimated(false)
    }
  }, [isOpen])

  // 상태가 변경될 때마다 저장
  useEffect(() => {
    if (isOpen && (currentStep > 0 || videos.length > 0 || script || audioUrl || podcastId)) {
      const state = {
        currentStep,
        videos,
        script,
        audioUrl,
        podcastId,
        timestamp: Date.now()
      }
      localStorage.setItem('podcast_generation_state', JSON.stringify(state))
      console.log('💾 팟캐스트 생성 상태 저장:', { currentStep, videosCount: videos.length })
    }
  }, [isOpen, currentStep, videos, script, audioUrl, podcastId])

  const steps = [
    {
      id: 'videos',
      title: '유튜브 동영상 선택',
      description: '선택된 플레이리스트에서 최근 5개 동영상을 가져옵니다.',
      icon: Play
    },
    {
      id: 'preview',
      title: '동영상 미리보기',
      description: '선택된 동영상들을 확인하고 다음 단계로 진행합니다.',
      icon: Play
    },
    {
      id: 'script',
      title: '자막 추출 및 스크립트 생성',
      description: 'AI가 자막을 분석하여 팟캐스트 스크립트를 생성합니다.',
      icon: FileText
    },
    {
      id: 'voice',
      title: '음성 생성',
      description: 'ElevenLabs를 통해 실제 음성과 같은 팟캐스트를 생성합니다.',
      icon: Mic
    },
    {
      id: 'complete',
      title: '완료',
      description: '팟캐스트 생성이 완료되었습니다.',
      icon: CheckCircle
    }
  ]

  const handleNext = async () => {
    if (currentStep === 0) {
      // 1단계: 동영상 목록 가져오기
      setIsLoading(true)
      setError('')
      
      try {
        const { data, error } = await apiPost<{ videos: VideoInfo[] }>('/api/podcast/videos')

        if (error) {
          throw new Error(error)
        }

        setVideos(data?.videos || [])
        setCurrentStep(1)
        
      } catch (error) {
        console.error('Error fetching videos:', error)
        setError(error instanceof Error ? error.message : '동영상 목록을 가져오는데 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    } else if (currentStep === 1) {
      // 2단계: UI만 2단계로 이동 (자막 추출은 버튼 클릭 시)
      setCurrentStep(2)
    } else if (currentStep === 2) {
      // 3단계: 자막 추출 및 스크립트 생성 (스트리밍)
      if (videos.length > 0) {
        setIsLoading(true)
        setError('')
        setSubtitleProgress({ current: 0, total: videos.length, currentVideo: '', completedVideos: [] })
        
        try {
          const videoIds = videos.map(video => video.id)
          
          const response = await fetch('/api/podcast/script-stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              videoIds,
            }),
          })

          if (!response.ok) {
            throw new Error('스트리밍 연결에 실패했습니다.')
          }

          const reader = response.body?.getReader()
          const decoder = new TextDecoder()

          if (!reader) {
            throw new Error('스트리밍 리더를 초기화할 수 없습니다.')
          }

          while (true) {
            const { done, value } = await reader.read()
            
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  
                  if (data.type === 'progress') {
                    setSubtitleProgress(prev => ({
                      ...prev,
                      current: data.current,
                      currentVideo: data.currentVideo,
                      completedVideos: data.status === 'completed' 
                        ? [...prev.completedVideos, data.currentVideo]
                        : prev.completedVideos
                    }))
                  } else if (data.type === 'script_generation_start') {
                    setSubtitleProgress(prev => ({
                      ...prev,
                      currentVideo: 'AI 스크립트 생성 중...'
                    }))
                  } else if (data.type === 'complete') {
                    setScript(data.script || '')
                    setPodcastId(data.podcastId || '')
                    setCurrentStep(3)
                  } else if (data.type === 'error') {
                    throw new Error(data.error || '스크립트 생성에 실패했습니다.')
                  }
                } catch (parseError) {
                  console.error('JSON 파싱 오류:', parseError)
                }
              }
            }
          }
          
        } catch (error) {
          console.error('Error generating script:', error)
          setError(error instanceof Error ? error.message : '스크립트 생성에 실패했습니다.')
        } finally {
          setIsLoading(false)
        }
      }
    } else if (currentStep === 3) {
      // 4단계: 음성 생성
      setIsLoading(true)
      setError('')
      
      try {
        const { data, error } = await apiPost<{ audioUrl: string }>('/api/podcast/generate-voice', {
          podcastId: podcastId,
          script: script
        })

        if (error) {
          throw new Error(error)
        }

        setAudioUrl(data?.audioUrl || '')
        setCurrentStep(4)
        
      } catch (error) {
        console.error('Error generating voice:', error)
        setError(error instanceof Error ? error.message : '음성 생성에 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    } else if (currentStep === 4) {
      // 5단계: 완료
      // 저장된 상태 제거
      localStorage.removeItem('podcast_generation_state')
      console.log('🎉 팟캐스트 생성 완료 - 저장된 상태 제거')
      onComplete(podcastId)
      onClose()
    }
  }

  const handleClose = () => {
    // 사용자가 직접 닫을 때만 상태 초기화
    if (confirm('팟캐스트 생성을 중단하시겠습니까? 진행 중인 내용이 사라집니다.')) {
      setCurrentStep(0)
      setVideos([])
      setScript('')
      setAudioUrl('')
      setPodcastId('')
      setError('')
      // 저장된 상태 제거
      localStorage.removeItem('podcast_generation_state')
      console.log('❌ 모달 닫기 - 저장된 상태 제거')
      onClose()
    }
  }

  if (!isOpen) return null

  const currentStepData = steps[currentStep]
  const IconComponent = currentStepData.icon

  return (
    <div className={`fixed inset-0 bg-white z-50 ${!hasAnimated ? 'slide-up' : ''}`}>
      <div className="modal-container flex flex-col">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-brand to-brand-light text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <IconComponent className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{currentStepData.title}</h2>
                <p className="text-xs text-white/80">{currentStepData.description}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* 진행 단계 표시 - 간소화 */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                  index <= currentStep 
                    ? 'bg-white text-brand scale-110' 
                    : 'bg-white/20 text-white/60 scale-90'
                }`}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <span className={`text-[10px] text-center leading-tight ${
                  index <= currentStep ? 'text-white font-semibold' : 'text-white/60'
                }`}>
                  {step.title.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          )}

          {currentStep === 0 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-brand to-brand-light rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                <Play className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">유튜브 동영상 가져오기</h3>
              <p className="text-sm text-gray-600 mb-8 px-4">
                나중에 볼 동영상 목록에서 최근 5개 동영상을 가져와서 자막을 추출합니다.
              </p>
              <button
                onClick={handleNext}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brand to-brand-light hover:from-brand-dark hover:to-brand disabled:opacity-50 text-white px-6 py-4 rounded-xl font-bold transition-all app-button flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>동영상 가져오는 중...</span>
                  </>
                ) : (
                  <>
                    <span>동영상 가져오기</span>
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {currentStep === 1 && videos.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">선택된 동영상들</h3>
              <div className="space-y-3 mb-6">
                {videos.map((video, index) => (
                  <div key={video.id} className="app-card p-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-brand">{index + 1}</span>
                      </div>
                      {video.thumbnail && (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{video.title}</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-brand flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-brand to-brand-light hover:from-brand-dark hover:to-brand text-white px-6 py-4 rounded-xl font-bold transition-all app-button flex items-center justify-center space-x-2"
              >
                <span>다음 단계</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">자막 추출 및 스크립트 생성</h3>
              
              {isLoading ? (
                <div className="space-y-4">
                  {/* 진행 상황 표시 */}
                  <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-5 rounded-xl border-2 border-primary-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-brand-dark text-sm">자막 추출 진행중</h4>
                      <span className="text-xs font-bold text-brand bg-white px-3 py-1 rounded-full">
                        {subtitleProgress.current}/{subtitleProgress.total}
                      </span>
                    </div>
                    
                    <div className="w-full bg-primary-200 rounded-full h-3 mb-3">
                      <div 
                        className="bg-gradient-to-r from-brand to-brand-light h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(subtitleProgress.current / subtitleProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    
                    {subtitleProgress.currentVideo && (
                      <p className="text-xs text-brand-dark font-medium">
                        ⚡ {subtitleProgress.currentVideo}
                      </p>
                    )}
                  </div>

                  {/* 동영상별 진행 상황 */}
                  <div className="space-y-2">
                    {videos.map((video, index) => (
                      <div key={video.id} className="app-card p-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            index < subtitleProgress.current 
                              ? 'bg-brand text-white' 
                            : index === subtitleProgress.current - 1
                              ? 'bg-brand-light text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {index < subtitleProgress.current ? '✓' : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 line-clamp-1">{video.title}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {index < subtitleProgress.current ? '✅ 완료' : 
                               index === subtitleProgress.current - 1 ? '⏳ 처리중...' : '⏸️ 대기중'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-brand to-brand-light rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <FileText className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">자막 추출 및 스크립트 생성</h3>
                  <p className="text-sm text-gray-600 mb-8 px-4">
                    선택된 {videos.length}개 동영상의 자막을 추출하고 AI가 팟캐스트 스크립트를 생성합니다.
                  </p>
                  <button
                    onClick={handleNext}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-brand to-brand-light hover:from-brand-dark hover:to-brand disabled:opacity-50 text-white px-6 py-4 rounded-xl font-bold transition-all app-button flex items-center justify-center space-x-2"
                  >
                    <span>자막 추출 시작</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && script && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">생성된 팟캐스트 스크립트</h3>
              <div className="bg-gray-50 p-4 rounded-xl mb-6 max-h-80 overflow-y-auto border-2 border-gray-200">
                <pre className="whitespace-pre-wrap text-xs text-gray-700 font-sans leading-relaxed">
                  {script}
                </pre>
              </div>

              <button
                onClick={handleNext}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brand to-brand-light hover:from-brand-dark hover:to-brand disabled:opacity-50 text-white px-6 py-4 rounded-xl font-bold transition-all app-button flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>음성 생성 중...</span>
                  </>
                ) : (
                  <>
                    <span>음성 생성하기</span>
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {currentStep === 2 && isLoading && !script && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-10 w-10 text-brand animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">스크립트 생성 중...</h3>
              <p className="text-sm text-gray-600 px-4">
                동영상의 자막을 추출하고 AI가 팟캐스트 스크립트를 생성하고 있습니다.
                잠시만 기다려주세요...
              </p>
            </div>
          )}

          {currentStep === 3 && isLoading && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-10 w-10 text-brand-light animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">음성 생성 중...</h3>
              <p className="text-sm text-gray-600 px-4">
                ElevenLabs를 통해 실제 음성과 같은 팟캐스트를 생성하고 있습니다.
                잠시만 기다려주세요...
              </p>
            </div>
          )}

          {currentStep === 4 && audioUrl && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-brand-light to-brand rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                <Mic className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">🎉 음성 생성 완료!</h3>
              <p className="text-sm text-gray-600 mb-6 px-4">
                AI가 생성한 팟캐스트가 준비되었습니다. 아래에서 재생해보세요.
              </p>
              
              <div className="mb-6 app-card p-4">
                <audio controls className="w-full">
                  <source src={audioUrl} type="audio/mpeg" />
                  브라우저가 오디오를 지원하지 않습니다.
                </audio>
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-brand-light to-brand hover:from-brand hover:to-brand-dark text-white px-6 py-4 rounded-xl font-bold transition-all app-button flex items-center justify-center space-x-2"
              >
                <CheckCircle className="h-5 w-5" />
                <span>완료</span>
              </button>
            </div>
          )}

          {currentStep === 3 && !audioUrl && !isLoading && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-brand to-brand-light rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                <Mic className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">음성 생성 준비 완료</h3>
              <p className="text-sm text-gray-600 mb-8 px-4">
                스크립트가 준비되었습니다. 아래 버튼을 클릭하여 음성을 생성하세요.
              </p>
              
              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-brand to-brand-light hover:from-brand-dark hover:to-brand text-white px-6 py-4 rounded-xl font-bold transition-all app-button flex items-center justify-center space-x-2"
              >
                <Mic className="h-5 w-5" />
                <span>음성 생성하기</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default StepByStepModal
