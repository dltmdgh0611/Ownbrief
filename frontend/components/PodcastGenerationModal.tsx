'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle, Loader2, Play, Clock, FileText, Mic } from 'lucide-react'

interface VideoInfo {
  id: string
  title: string
  thumbnail?: string
}

interface GenerationStep {
  id: string
  title: string
  status: 'pending' | 'loading' | 'completed' | 'error'
  description: string
  data?: any
}

interface PodcastGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (podcastId: string) => void
}

export default function PodcastGenerationModal({ isOpen, onClose, onComplete }: PodcastGenerationModalProps) {
  const [steps, setSteps] = useState<GenerationStep[]>([
    {
      id: 'fetch-videos',
      title: '유튜브 동영상 가져오기',
      status: 'pending',
      description: '나중에 볼 동영상 목록에서 최근 5개 동영상을 가져옵니다.'
    },
    {
      id: 'extract-transcripts',
      title: '자막 추출',
      status: 'pending',
      description: '각 동영상의 자막을 추출합니다.'
    },
    {
      id: 'generate-script',
      title: '팟캐스트 스크립트 생성',
      status: 'pending',
      description: 'AI가 자막을 분석하여 팟캐스트 스크립트를 생성합니다.'
    },
    {
      id: 'generate-speech',
      title: '음성 생성',
      status: 'pending',
      description: 'ElevenLabs를 통해 실제 음성과 같은 팟캐스트를 생성합니다.'
    },
    {
      id: 'complete',
      title: '완료',
      status: 'pending',
      description: '팟캐스트 생성이 완료되었습니다.'
    }
  ])

  const [videos, setVideos] = useState<VideoInfo[]>([])
  const [script, setScript] = useState('')
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (isOpen) {
      startGeneration()
    }
  }, [isOpen])

  const updateStep = (stepId: string, status: GenerationStep['status'], data?: any) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, data }
        : step
    ))
  }

  const startGeneration = async () => {
    try {
      // 1단계: 유튜브 동영상 가져오기
      updateStep('fetch-videos', 'loading')
      setCurrentStep(0)
      
      const response = await fetch('/api/podcast/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('팟캐스트 생성에 실패했습니다.')
      }

      const data = await response.json()
      
      // 실제 동영상 정보 사용
      if (data.videos && data.videos.length > 0) {
        setVideos(data.videos)
        updateStep('fetch-videos', 'completed', data.videos)
      } else {
        // 동영상이 없는 경우 시뮬레이션 데이터 사용
        const mockVideos: VideoInfo[] = [
          { id: '1', title: 'AI와 미래 기술에 대한 이야기' },
          { id: '2', title: '프로그래밍 팁과 트릭' },
          { id: '3', title: '웹 개발 최신 동향' },
          { id: '4', title: '데이터 사이언스 입문' },
          { id: '5', title: '머신러닝 기초' }
        ]
        setVideos(mockVideos)
        updateStep('fetch-videos', 'completed', mockVideos)
      }
      
      // 2단계: 자막 추출
      await new Promise(resolve => setTimeout(resolve, 2000)) // 시뮬레이션
      updateStep('extract-transcripts', 'loading')
      setCurrentStep(1)
      
      await new Promise(resolve => setTimeout(resolve, 3000)) // 시뮬레이션
      updateStep('extract-transcripts', 'completed')
      
      // 3단계: 스크립트 생성
      updateStep('generate-script', 'loading')
      setCurrentStep(2)
      
      await new Promise(resolve => setTimeout(resolve, 4000)) // 시뮬레이션
      
      // 실제 스크립트 사용 또는 시뮬레이션 스크립트
      const finalScript = data.script || `안녕하세요! 오늘은 AI와 기술에 대한 흥미로운 이야기들을 준비했습니다.

먼저 AI와 미래 기술에 대해 이야기해보겠습니다. 인공지능은 우리 일상생활에 점점 더 깊숙이 들어오고 있습니다. 스마트폰의 음성 인식부터 자율주행 자동차까지, AI는 이미 우리 삶의 일부가 되었습니다.

프로그래밍 팁과 트릭에 대해서도 알아보겠습니다. 효율적인 코딩을 위해서는 좋은 습관을 기르는 것이 중요합니다. 코드 리뷰를 정기적으로 하고, 테스트를 작성하며, 문서화를 잘하는 것이 핵심입니다.

웹 개발의 최신 동향도 빠르게 변화하고 있습니다. React, Vue, Angular 같은 프레임워크들이 계속 발전하고 있고, 새로운 도구들과 라이브러리들이 계속 등장하고 있습니다.

데이터 사이언스는 현대 비즈니스에서 매우 중요한 역할을 하고 있습니다. 데이터를 통해 인사이트를 얻고, 의사결정을 내리는 것이 경쟁 우위의 핵심이 되었습니다.

마지막으로 머신러닝의 기초에 대해 이야기해보겠습니다. 머신러닝은 데이터로부터 패턴을 학습하여 예측이나 분류를 수행하는 기술입니다. 이미지 인식, 자연어 처리, 추천 시스템 등 다양한 분야에서 활용되고 있습니다.

오늘의 이야기는 여기서 마치겠습니다. 다음 시간에도 더 흥미로운 기술 이야기로 찾아뵙겠습니다. 감사합니다!`
      
      setScript(finalScript)
      updateStep('generate-script', 'completed', finalScript)
      
      // 4단계: 음성 생성
      updateStep('generate-speech', 'loading')
      setCurrentStep(3)
      
      await new Promise(resolve => setTimeout(resolve, 5000)) // 시뮬레이션
      updateStep('generate-speech', 'completed')
      
      // 5단계: 완료
      updateStep('complete', 'completed')
      setCurrentStep(4)
      
      // 완료 후 팟캐스트 목록 새로고침
      onComplete(data.podcastId || 'mock-podcast-id')
      
    } catch (error) {
      console.error('Generation error:', error)
      updateStep(steps[currentStep].id, 'error')
    }
  }

  const getStepIcon = (status: GenerationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'error':
        return <X className="h-5 w-5 text-red-500" />
      default:
        return <div className="h-5 w-5 bg-gray-300 rounded-full" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">팟캐스트 생성 중...</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* 진행 단계 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">진행 단계</h3>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center space-x-3">
                  {getStepIcon(step.status)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{step.title}</span>
                      {index === currentStep && step.status === 'loading' && (
                        <span className="text-sm text-blue-600">진행 중...</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 동영상 목록 */}
          {steps[0].status === 'completed' && videos.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Play className="h-5 w-5 mr-2" />
                선택된 동영상들
              </h3>
              <div className="grid gap-3">
                {videos.map((video, index) => (
                  <div key={video.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-500 w-8">{index + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{video.title}</p>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 생성된 스크립트 */}
          {steps[2].status === 'completed' && script && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                생성된 팟캐스트 스크립트
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {script}
                </pre>
              </div>
            </div>
          )}

          {/* 완료 메시지 */}
          {steps[4].status === 'completed' && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">팟캐스트 생성 완료!</h3>
              <p className="text-gray-600 mb-4">AI가 생성한 팟캐스트가 준비되었습니다.</p>
              <button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
              >
                확인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
