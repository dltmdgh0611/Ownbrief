'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Play, Loader2, CheckCircle, XCircle, Clock, Mic2, ListMusic } from 'lucide-react'
import StepByStepModal from './StepByStepModal'
import { apiGet } from '@/backend/lib/api-client'

interface Podcast {
  id: string
  title: string
  description: string
  audioUrl?: string
  duration?: number
  status: string
  createdAt: string
}

export default function PodcastGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchPodcasts()
  }, [])

  const generatePodcast = async () => {
    setIsGenerating(true)
    setShowModal(true)
  }

  const handleModalComplete = (podcastId: string) => {
    setShowModal(false)
    setIsGenerating(false)
    fetchPodcasts()
  }

  const handleModalClose = () => {
    setShowModal(false)
    setIsGenerating(false)
  }

  const fetchPodcasts = async () => {
    try {
      const { data } = await apiGet<Podcast[]>('/api/podcast')
      
      if (data) {
        setPodcasts(data)
      }
    } catch (error) {
      console.error('Error fetching podcasts:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            완료
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            실패
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            처리중
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            대기중
          </span>
        )
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '알 수 없음'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* 생성 버튼 카드 */}
      <div className="app-card p-6 bg-gradient-to-br from-emerald-600 to-teal-600 text-white fade-in">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Mic2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">새 팟캐스트</h2>
            <p className="text-sm text-white/80">AI로 팟캐스트 만들기</p>
          </div>
        </div>
        
        <p className="text-sm text-white/90 mb-5 leading-relaxed">
          선택한 유튜브 플레이리스트에서 최근 동영상들의 자막을 분석하여 
          AI가 자동으로 팟캐스트를 생성합니다.
        </p>
        
        <button
          onClick={generatePodcast}
          disabled={isGenerating}
          className="w-full bg-white text-emerald-600 px-6 py-4 rounded-xl font-bold transition-all app-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>팟캐스트 생성 중...</span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              <span>팟캐스트 생성하기</span>
            </>
          )}
        </button>
      </div>

      {/* 팟캐스트 목록 */}
      <div className="fade-in">
        <div className="flex items-center space-x-2 mb-4 px-2">
          <ListMusic className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-bold text-gray-900">내 팟캐스트</h3>
          <span className="text-sm text-gray-500">({podcasts.length})</span>
        </div>
        
        {podcasts.length === 0 ? (
          <div className="app-card p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mic2 className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">아직 생성된 팟캐스트가 없습니다.</p>
            <p className="text-gray-400 text-xs mt-1">위 버튼을 눌러 첫 팟캐스트를 만들어보세요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {podcasts.map((podcast) => (
              <div key={podcast.id} className="app-card p-4 hover:shadow-md transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 mb-1 truncate">{podcast.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{podcast.description}</p>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      {getStatusBadge(podcast.status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(podcast.createdAt).toLocaleDateString('ko-KR')}</span>
                    </span>
                    {podcast.duration && (
                      <span className="flex items-center space-x-1">
                        <Mic2 className="w-3 h-3" />
                        <span>{formatDuration(podcast.duration)}</span>
                      </span>
                    )}
                  </div>
                  
                  {podcast.status === 'completed' && podcast.audioUrl && (
                    <div className="pt-2">
                      <audio controls className="w-full h-10" style={{borderRadius: '8px'}}>
                        <source src={podcast.audioUrl} type="audio/mpeg" />
                        브라우저가 오디오를 지원하지 않습니다.
                      </audio>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StepByStepModal
        isOpen={showModal}
        onClose={handleModalClose}
        onComplete={handleModalComplete}
      />
    </div>
  )
}
