'use client'

import { useState, useEffect } from 'react'
import { X, Mic, MicOff } from 'lucide-react'

interface ScriptViewerProps {
  script: string
  isPlaying: boolean
  onClose?: () => void
}

export default function ScriptViewer({ script, isPlaying, onClose }: ScriptViewerProps) {
  const [currentLine, setCurrentLine] = useState(0)
  const [showScript, setShowScript] = useState(true)

  // 스크립트를 줄 단위로 분리
  const scriptLines = script.split('\n').filter(line => line.trim())

  // 자동 스크롤 (3초마다)
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentLine(prev => {
        if (prev < scriptLines.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [isPlaying, scriptLines.length])

  if (!showScript) {
    return (
      <button
        onClick={() => setShowScript(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-brand to-brand-light text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        스크립트 보기
      </button>
    )
  }

  return (
    <div className="app-card p-6 max-h-[500px] overflow-hidden" style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif' }}>브리핑 스크립트</h3>
        <button
          onClick={() => setShowScript(false)}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* 스크립트 영역 */}
      <div className="overflow-y-auto max-h-[400px] space-y-2 pr-2" style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        {scriptLines.map((line, index) => {
          const isPast = index < currentLine
          const isCurrent = index === currentLine
          const isFuture = index > currentLine

          // 섹션 헤더 감지
          const isSection = line.startsWith('[') && line.endsWith(']')

          return (
            <div
              key={index}
              className={`transition-all duration-500 ${
                isCurrent
                  ? 'text-brand font-bold text-lg'
                  : isPast
                  ? 'text-gray-500 text-base'
                  : 'text-gray-400 text-base'
              } ${
                isSection ? 'mt-4 mb-2 font-bold text-brand text-lg' : ''
              }`}
              style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              {line || '\u00A0'}
            </div>
          )
        })}
      </div>

      {/* 진행률 표시 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {currentLine + 1} / {scriptLines.length}
          </span>
          <span>
            {isPlaying ? '🎵 재생 중' : '⏸️ 일시정지'}
          </span>
        </div>
      </div>
    </div>
  )
}



