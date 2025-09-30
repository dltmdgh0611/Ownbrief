'use client'

import { useState, useEffect } from 'react'
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

export default function StepByStepModal({ isOpen, onClose, onComplete }: StepByStepModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [videos, setVideos] = useState<VideoInfo[]>([])
  const [script, setScript] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [podcastId, setPodcastId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [subtitleProgress, setSubtitleProgress] = useState<{
    current: number
    total: number
    currentVideo: string
    completedVideos: string[]
  }>({ current: 0, total: 0, currentVideo: '', completedVideos: [] })

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
      onComplete(podcastId)
      onClose()
    }
  }

  const handleClose = () => {
    setCurrentStep(0)
    setVideos([])
    setScript('')
    setAudioUrl('')
    setPodcastId('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  const currentStepData = steps[currentStep]
  const IconComponent = currentStepData.icon

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <IconComponent className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{currentStepData.title}</h2>
              <p className="text-gray-600">{currentStepData.description}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 진행 단계 표시 */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  index <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <span className={`ml-2 text-sm ${
                  index <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-gray-400 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {currentStep === 0 && (
            <div className="text-center py-12">
              <Play className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">유튜브 동영상 가져오기</h3>
              <p className="text-gray-600 mb-6">
                나중에 볼 동영상 목록에서 최근 5개 동영상을 가져와서 자막을 추출합니다.
              </p>
              <button
                onClick={handleNext}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-md font-medium transition-colors flex items-center space-x-2 mx-auto"
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
              <h3 className="text-xl font-semibold text-gray-900 mb-4">선택된 동영상들</h3>
              <div className="grid gap-4 mb-6">
                {videos.map((video, index) => (
                  <div key={video.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <span className="text-lg font-medium text-gray-500 w-8">{index + 1}</span>
                    {video.thumbnail && (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-20 h-15 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{video.title}</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-medium transition-colors flex items-center space-x-2 mx-auto"
                >
                  <span>다음 단계</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">자막 추출 및 스크립트 생성</h3>
              
              {isLoading ? (
                <div className="space-y-6">
                  {/* 진행 상황 표시 */}
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-blue-900">자막 추출 진행 상황</h4>
                      <span className="text-sm text-blue-700">
                        {subtitleProgress.current}/{subtitleProgress.total}
                      </span>
                    </div>
                    
                    <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(subtitleProgress.current / subtitleProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    
                    {subtitleProgress.currentVideo && (
                      <p className="text-sm text-blue-800">
                        현재 처리 중: {subtitleProgress.currentVideo}
                      </p>
                    )}
                  </div>

                  {/* 동영상별 진행 상황 */}
                  <div className="grid gap-3">
                    {videos.map((video, index) => (
                      <div key={video.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                          index < subtitleProgress.current 
                            ? 'bg-green-500 text-white' 
                            : index === subtitleProgress.current - 1
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {index < subtitleProgress.current ? '✓' : index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{video.title}</p>
                          <p className="text-xs text-gray-500">
                            {index < subtitleProgress.current ? '완료' : 
                             index === subtitleProgress.current - 1 ? '처리 중...' : '대기 중'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">자막 추출 및 스크립트 생성</h3>
                  <p className="text-gray-600 mb-6">
                    선택된 {videos.length}개 동영상의 자막을 추출하고 AI가 팟캐스트 스크립트를 생성합니다.
                  </p>
                  <button
                    onClick={handleNext}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-md font-medium transition-colors flex items-center space-x-2 mx-auto"
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
              <h3 className="text-xl font-semibold text-gray-900 mb-4">생성된 팟캐스트 스크립트</h3>
              <div className="bg-gray-50 p-6 rounded-lg mb-6 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                  {script}
                </pre>
              </div>

              <div className="text-center">
                <button
                  onClick={handleNext}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-md font-medium transition-colors flex items-center space-x-2 mx-auto"
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
            </div>
          )}

          {currentStep === 2 && isLoading && !script && (
            <div className="text-center py-12">
              <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">스크립트 생성 중...</h3>
              <p className="text-gray-600">
                동영상의 자막을 추출하고 AI가 팟캐스트 스크립트를 생성하고 있습니다.
                <br />
                잠시만 기다려주세요...
              </p>
            </div>
          )}

          {currentStep === 3 && isLoading && (
            <div className="text-center py-12">
              <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">음성 생성 중...</h3>
              <p className="text-gray-600">
                ElevenLabs를 통해 실제 음성과 같은 팟캐스트를 생성하고 있습니다.
                <br />
                잠시만 기다려주세요...
              </p>
            </div>
          )}

          {currentStep === 4 && audioUrl && (
            <div className="text-center">
              <Mic className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">음성 생성 완료!</h3>
              <p className="text-gray-600 mb-6">
                AI가 생성한 팟캐스트가 준비되었습니다. 아래에서 재생해보세요.
              </p>
              
              <div className="mb-6">
                <audio controls className="w-full max-w-md mx-auto">
                  <source src={audioUrl} type="audio/mpeg" />
                  브라우저가 오디오를 지원하지 않습니다.
                </audio>
              </div>

              <button
                onClick={handleNext}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-md font-medium transition-colors flex items-center space-x-2 mx-auto"
              >
                <CheckCircle className="h-5 w-5" />
                <span>완료</span>
              </button>
            </div>
          )}

          {currentStep === 3 && !audioUrl && !isLoading && (
            <div className="text-center py-12">
              <Mic className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">음성 생성 준비 완료</h3>
              <p className="text-gray-600 mb-6">
                스크립트가 준비되었습니다. 아래 버튼을 클릭하여 음성을 생성하세요.
              </p>
              
              <button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-medium transition-colors flex items-center space-x-2 mx-auto"
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
}
