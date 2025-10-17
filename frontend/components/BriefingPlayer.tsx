'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Volume2, Loader2 } from 'lucide-react'
import GenerationStatus from './GenerationStatus'
import ScriptViewer from './ScriptViewer'

interface BriefingPlayerProps {
  userEmail: string
}

export default function BriefingPlayer({ userEmail }: BriefingPlayerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStatus, setCurrentStatus] = useState('')
  const [script, setScript] = useState('')
  const [progress, setProgress] = useState(0)
  const [briefingId, setBriefingId] = useState('')
  const [error, setError] = useState('')

  const eventSourceRef = useRef<EventSource | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // 브리핑 생성 시작
  const handleGenerateBriefing = async () => {
    try {
      setIsGenerating(true)
      setError('')
      setProgress(0)
      setScript('')

      // Server-Sent Events 연결
      const eventSource = new EventSource('/api/briefing/generate-stream', {
        withCredentials: true,
      })

      eventSourceRef.current = eventSource

      eventSource.addEventListener('status', (e) => {
        const data = JSON.parse(e.data)
        setCurrentStatus(data)
        
        // 진행률 업데이트
        if (data.includes('데이터 수집')) setProgress(20)
        else if (data.includes('스크립트')) setProgress(60)
        else if (data.includes('음성 생성')) setProgress(80)
      })

      eventSource.addEventListener('collected', (e) => {
        const data = JSON.parse(e.data)
        console.log('Data collected:', data)
      })

      eventSource.addEventListener('script', (e) => {
        const data = JSON.parse(e.data)
        setScript(data)
        setProgress(70)
      })

      eventSource.addEventListener('audio-chunk', (e) => {
        // TODO: Web Audio API로 오디오 스트리밍 재생
        console.log('Audio chunk received')
      })

      eventSource.addEventListener('complete', (e) => {
        const data = JSON.parse(e.data)
        setBriefingId(data.briefingId)
        setProgress(100)
        setIsGenerating(false)
        setIsPlaying(true)
        eventSource.close()
      })

      eventSource.addEventListener('error', (e: any) => {
        const data = JSON.parse(e.data)
        setError(data.message || '브리핑 생성 중 오류가 발생했습니다')
        setIsGenerating(false)
        eventSource.close()
      })

      eventSource.onerror = () => {
        setError('연결이 끊어졌습니다')
        setIsGenerating(false)
        eventSource.close()
      }
    } catch (error) {
      console.error('Briefing generation error:', error)
      setError('브리핑 생성에 실패했습니다')
      setIsGenerating(false)
    }
  }

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center p-6">
      {/* 메인 재생 영역 */}
      <div className="w-full max-w-2xl">
        {!isGenerating && !isPlaying && (
          <div className="text-center space-y-8">
            {/* 큰 재생 버튼 */}
            <div className="flex flex-col items-center space-y-6">
              <button
                onClick={handleGenerateBriefing}
                disabled={isGenerating}
                className="w-32 h-32 rounded-full bg-gradient-to-r from-brand to-brand-light shadow-2xl hover:shadow-3xl active:scale-95 transition-all duration-200 flex items-center justify-center group"
              >
                <Play className="w-16 h-16 text-white ml-2 group-hover:scale-110 transition-transform" />
              </button>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">
                  오늘의 브리핑
                </h2>
                <p className="text-gray-600">
                  재생 버튼을 눌러 맞춤 브리핑을 시작하세요
                </p>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="app-card p-4 bg-red-50 border border-red-200">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* 브리핑 설명 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="app-card p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  📅
                </div>
                <p className="text-sm font-medium text-gray-700">일정</p>
              </div>
              <div className="app-card p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                  📧
                </div>
                <p className="text-sm font-medium text-gray-700">메일</p>
              </div>
              <div className="app-card p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                  💬
                </div>
                <p className="text-sm font-medium text-gray-700">팀 채팅</p>
              </div>
              <div className="app-card p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                  📊
                </div>
                <p className="text-sm font-medium text-gray-700">업무</p>
              </div>
            </div>
          </div>
        )}

        {/* 생성 중 상태 */}
        {isGenerating && (
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-r from-brand to-brand-light shadow-xl flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-white animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                브리핑 준비 중...
              </h2>
            </div>

            <GenerationStatus 
              currentStatus={currentStatus}
              progress={progress}
            />
          </div>
        )}

        {/* 재생 중 상태 */}
        {isPlaying && script && (
          <div className="space-y-6">
            <ScriptViewer 
              script={script}
              isPlaying={isPlaying}
            />

            {/* 재생 컨트롤 */}
            <div className="app-card p-6">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-brand to-brand-light shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </button>

                <button
                  onClick={handleGenerateBriefing}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 transition-colors"
                >
                  새로 생성
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



