'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Shuffle, Repeat } from 'lucide-react'

interface MusicPlayerProps {
  isPlaying: boolean
  currentTrack?: {
    title: string
    artist: string
    album: string
    duration: number
    coverUrl?: string
  }
  onPlayPause: () => void
  onNext: () => void
  onPrevious: () => void
  onSeek: (position: number) => void
  currentTime: number
  volume: number
  onVolumeChange: (volume: number) => void
}

export default function MusicPlayer({
  isPlaying,
  currentTrack,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  currentTime,
  volume,
  onVolumeChange,
}: MusicPlayerProps) {
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none')
  const [isMuted, setIsMuted] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !currentTrack) return
    
    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * currentTrack.duration
    
    onSeek(newTime)
  }

  const toggleMute = () => {
    if (isMuted) {
      onVolumeChange(0.7) // 기본 볼륨으로 복원
    } else {
      onVolumeChange(0)
    }
    setIsMuted(!isMuted)
  }

  const progressPercentage = currentTrack ? (currentTime / currentTrack.duration) * 100 : 0

  return (
    <div className="w-full max-w-md mx-auto bg-black rounded-2xl p-6 shadow-2xl">
      {/* 앨범 커버 */}
      <div className="flex justify-center mb-6">
        <div className="w-64 h-64 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg flex items-center justify-center">
          {currentTrack?.coverUrl ? (
            <img 
              src={currentTrack.coverUrl} 
              alt={currentTrack.album}
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <div className="text-white text-6xl">🎵</div>
          )}
        </div>
      </div>

      {/* 트랙 정보 */}
      <div className="text-center mb-8">
        <h2 className="text-white text-xl font-bold mb-1">
          {currentTrack?.title || 'AICast 브리핑'}
        </h2>
        <p className="text-gray-400 text-sm">
          {currentTrack?.artist || '실시간 브리핑'}
        </p>
        <p className="text-gray-500 text-xs mt-1">
          {currentTrack?.album || 'AI 생성 콘텐츠'}
        </p>
      </div>

      {/* 진행률 바 */}
      <div className="mb-6">
        <div 
          ref={progressRef}
          className="w-full h-1 bg-gray-700 rounded-full cursor-pointer"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-white rounded-full transition-all duration-200"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(currentTrack?.duration || 0)}</span>
        </div>
      </div>

      {/* 컨트롤 버튼들 */}
      <div className="flex items-center justify-center space-x-6 mb-6">
        {/* 셔플 */}
        <button
          onClick={() => setIsShuffled(!isShuffled)}
          className={`p-2 rounded-full transition-colors ${
            isShuffled ? 'text-green-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Shuffle size={20} />
        </button>

        {/* 이전 트랙 */}
        <button
          onClick={onPrevious}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <SkipBack size={24} />
        </button>

        {/* 재생/일시정지 */}
        <button
          onClick={onPlayPause}
          className="p-4 bg-white text-black rounded-full hover:scale-105 transition-transform"
        >
          {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
        </button>

        {/* 다음 트랙 */}
        <button
          onClick={onNext}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <SkipForward size={24} />
        </button>

        {/* 반복 */}
        <button
          onClick={() => {
            const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all']
            const currentIndex = modes.indexOf(repeatMode)
            setRepeatMode(modes[(currentIndex + 1) % modes.length])
          }}
          className={`p-2 rounded-full transition-colors ${
            repeatMode !== 'none' ? 'text-green-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Repeat size={20} />
        </button>
      </div>

      {/* 볼륨 컨트롤 */}
      <div className="flex items-center space-x-3">
        <button
          onClick={toggleMute}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        
        <div className="flex-1 h-1 bg-gray-700 rounded-full">
          <div 
            className="h-full bg-white rounded-full transition-all duration-200"
            style={{ width: `${isMuted ? 0 : volume * 100}%` }}
          />
        </div>
        
        <span className="text-gray-400 text-xs w-8">
          {Math.round((isMuted ? 0 : volume) * 100)}
        </span>
      </div>
    </div>
  )
}
