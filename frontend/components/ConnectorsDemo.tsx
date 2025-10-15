'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'

interface Connector {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
}

interface ConnectorsDemoProps {
  isOpen: boolean
  onClose: () => void
}

export default function ConnectorsDemo({ isOpen, onClose }: ConnectorsDemoProps) {
  const [connectors, setConnectors] = useState<Connector[]>([
    {
      id: 'notion',
      name: 'Notion',
      description: '작업 공간과 문서를 연결하여 팟캐스트 콘텐츠를 자동으로 생성',
      icon: '📝',
      connected: false
    },
    {
      id: 'slack',
      name: 'Slack',
      description: '팀 채널의 중요한 대화를 팟캐스트로 변환',
      icon: '💬',
      connected: false
    },
    {
      id: 'figma',
      name: 'Figma',
      description: '디자인 프로젝트와 피드백을 음성 콘텐츠로 공유',
      icon: '🎨',
      connected: true
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      description: '일정과 회의록을 자동으로 팟캐스트 에피소드로 생성',
      icon: '📅',
      connected: false
    }
  ])

  const toggleConnection = (id: string) => {
    setConnectors(connectors.map(conn => 
      conn.id === id ? { ...conn, connected: !conn.connected } : conn
    ))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">연결</h2>
            <p className="text-sm text-gray-400 mt-1">다양한 앱과 연결하여 더 많은 기능을 사용하세요</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 앱 그리드 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectors.map((connector) => (
              <div
                key={connector.id}
                className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors border border-gray-700"
              >
                <div className="flex items-start space-x-4">
                  {/* 아이콘 */}
                  <div className="w-14 h-14 bg-gray-700 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                    {connector.icon}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1">{connector.name}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{connector.description}</p>
                  </div>
                </div>

                {/* 연결 버튼 */}
                <div className="mt-4">
                  <button
                    onClick={() => toggleConnection(connector.id)}
                    className={`w-full px-4 py-2.5 rounded-lg font-semibold transition-all ${
                      connector.connected
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {connector.connected ? (
                      <span className="flex items-center justify-center space-x-2">
                        <Check className="w-4 h-4" />
                        <span>연결됨</span>
                      </span>
                    ) : (
                      '연결하기'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t border-gray-800 bg-gray-850">
          <p className="text-sm text-gray-400 text-center">
            💡 더 많은 연결 옵션이 곧 추가됩니다
          </p>
        </div>
      </div>
    </div>
  )
}

