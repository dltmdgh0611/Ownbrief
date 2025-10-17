'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface Service {
  name: string
  displayName: string
  icon: string
  connected: boolean
  required: boolean
}

export default function ConnectedServices() {
  const [services, setServices] = useState<Service[]>([
    { name: 'google', displayName: 'Google', icon: '🔵', connected: false, required: true },
    { name: 'slack', displayName: 'Slack', icon: '💬', connected: false, required: false },
    { name: 'notion', displayName: 'Notion', icon: '📝', connected: false, required: false },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkConnectedServices()
  }, [])

  const checkConnectedServices = async () => {
    try {
      // TODO: API 호출하여 연결된 서비스 확인
      // 현재는 Google만 연결된 것으로 가정
      setServices(prev => 
        prev.map(service => ({
          ...service,
          connected: service.name === 'google',
        }))
      )
    } catch (error) {
      console.error('Failed to check services:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed bottom-6 left-6 app-card p-4 w-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-600">서비스 확인 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 left-6 app-card p-4 w-64">
      <h4 className="text-sm font-bold text-gray-900 mb-3">연동된 서비스</h4>
      <div className="space-y-2">
        {services.map(service => (
          <div
            key={service.name}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center space-x-2">
              <span className="text-xl">{service.icon}</span>
              <span className="text-sm font-medium text-gray-700">
                {service.displayName}
              </span>
              {service.required && (
                <span className="text-xs text-red-500">*</span>
              )}
            </div>
            
            {service.connected ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-gray-300" />
            )}
          </div>
        ))}
      </div>

      {/* 추가 연동 버튼 */}
      {services.some(s => !s.connected && !s.required) && (
        <button
          onClick={() => window.location.href = '/settings'}
          className="mt-3 w-full py-2 text-xs font-medium text-brand hover:bg-brand/5 rounded-lg transition-colors"
        >
          + 서비스 추가
        </button>
      )}
    </div>
  )
}



