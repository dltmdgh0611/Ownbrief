'use client'

import { useState, useEffect } from 'react'
import { X, Mic, MicOff } from 'lucide-react'

interface LyricsPlayerDemoProps {
  isOpen: boolean
  onClose: () => void
}

export default function LyricsPlayerDemo({ isOpen, onClose }: LyricsPlayerDemoProps) {
  const [currentLine, setCurrentLine] = useState(0)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)

  // 더미 스크립트 라인들 (타임스탬프 시뮬레이션용)
  const scriptLines = [
    "안녕하세요, 오늘의 팟캐스트를 시작하겠습니다.",
    "오늘은 AI 기술의 최신 동향에 대해 이야기해볼까 합니다.",
    "최근 인공지능 분야에서 가장 주목받는 기술은 무엇일까요?",
    "바로 대규모 언어 모델, LLM입니다.",
    "ChatGPT의 등장으로 많은 사람들이 AI의 가능성을 체감했죠.",
    "이제는 단순히 텍스트 생성을 넘어서",
    "이미지, 음성, 영상까지 생성할 수 있게 되었습니다.",
    "이러한 기술들이 우리 일상에 어떤 변화를 가져올까요?",
    "업무 자동화는 물론이고",
    "창작 활동에서도 AI가 큰 도움을 주고 있습니다.",
    "하지만 우려의 목소리도 있습니다.",
    "일자리 감소와 저작권 문제 등이 대두되고 있죠.",
    "결국 중요한 것은 AI를 어떻게 활용하느냐입니다.",
    "기술의 발전과 함께 우리도 성장해야 할 것입니다.",
    "오늘 팟캐스트는 여기서 마치겠습니다. 감사합니다."
  ]

  // 오디오 재생 시뮬레이션 (3초마다 다음 라인으로)
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentLine(prev => {
        if (prev < scriptLines.length - 1) {
          return prev + 1
        } else {
          setIsPlaying(false)
          return prev
        }
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [isPlaying, scriptLines.length])

  const handlePlayPause = () => {
    if (currentLine >= scriptLines.length - 1) {
      setCurrentLine(0)
    }
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setCurrentLine(0)
    setIsPlaying(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <h3 className="text-lg font-bold text-white">가사 보기</h3>
        <button
          onClick={() => setIsMicOn(!isMicOn)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isMicOn 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          {isMicOn ? (
            <Mic className="w-5 h-5 text-white" />
          ) : (
            <MicOff className="w-5 h-5 text-gray-400" />
          )}
        </button>
      </div>

      {/* 가사 영역 */}
      <div className="flex-1 overflow-y-auto px-6 py-12 flex items-center justify-center">
        <div className="w-full max-w-2xl space-y-6">
          {scriptLines.map((line, index) => {
            const isPast = index < currentLine
            const isCurrent = index === currentLine
            const isFuture = index > currentLine

            return (
              <div
                key={index}
                className={`text-center transition-all duration-500 ${
                  isCurrent
                    ? 'text-white text-2xl font-bold scale-105'
                    : isPast
                    ? 'text-gray-500 text-lg'
                    : 'text-gray-600 text-lg'
                }`}
              >
                {line}
              </div>
            )
          })}
        </div>
      </div>

      {/* 컨트롤 영역 */}
      <div className="p-6 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 프로그레스 바 */}
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentLine / (scriptLines.length - 1)) * 100}%` }}
            />
          </div>

          {/* 재생 컨트롤 */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              처음부터
            </button>
            <button
              onClick={handlePlayPause}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-colors"
            >
              {isPlaying ? '일시정지' : currentLine >= scriptLines.length - 1 ? '다시 재생' : '재생'}
            </button>
            <div className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg">
              {currentLine + 1} / {scriptLines.length}
            </div>
          </div>

          {/* 안내 메시지 */}
          <p className="text-center text-sm text-gray-500">
            {isPlaying ? '🎵 재생 중 (3초마다 자동 진행)' : '💡 재생 버튼을 눌러 데모를 시작하세요'}
          </p>
        </div>
      </div>
    </div>
  )
}

