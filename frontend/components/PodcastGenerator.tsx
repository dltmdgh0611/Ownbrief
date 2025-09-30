'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Play, Loader2, CheckCircle, XCircle, Settings } from 'lucide-react'
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <div className="h-5 w-5 bg-gray-300 rounded-full" />
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '알 수 없음'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">새 팟캐스트 생성</h2>
        <p className="text-gray-600 mb-4">
          선택한 유튜브 플레이리스트에서 최근 동영상들의 자막을 가져와서 
          AI가 팟캐스트 스크립트를 생성하고 음성으로 변환합니다.
        </p>
        
        
        <button
          onClick={generatePodcast}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center space-x-2"
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


      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">내 팟캐스트</h3>
        
        {podcasts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">아직 생성된 팟캐스트가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {podcasts.map((podcast) => (
              <div key={podcast.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">{podcast.title}</h4>
                      {getStatusIcon(podcast.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{podcast.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>생성일: {new Date(podcast.createdAt).toLocaleDateString('ko-KR')}</span>
                      {podcast.duration && (
                        <span>길이: {formatDuration(podcast.duration)}</span>
                      )}
                    </div>
                  </div>
                  
                  {podcast.status === 'completed' && podcast.audioUrl && (
                    <audio controls className="ml-4">
                      <source src={podcast.audioUrl} type="audio/mpeg" />
                      브라우저가 오디오를 지원하지 않습니다.
                    </audio>
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
