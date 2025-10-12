'use client'

import { useState, useEffect } from 'react'
import { Settings, Users, CreditCard, AlertCircle, X } from 'lucide-react'

interface AdminCreditManagerProps {
  isVisible: boolean
  onClose: () => void
}

export default function AdminCreditManager({ isVisible, onClose }: AdminCreditManagerProps) {
  const [targetEmail, setTargetEmail] = useState('')
  const [credits, setCredits] = useState(15)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!isVisible) return null

  const handleAdjustCredits = async () => {
    if (!targetEmail.trim()) {
      setMessage('이메일을 입력해주세요.')
      return
    }

    if (credits < 0) {
      setMessage('크레딧은 0 이상이어야 합니다.')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/adjust-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetEmail: targetEmail.trim(),
          credits
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ ${targetEmail}의 크레딧을 ${credits}로 조정했습니다.`)
        setTargetEmail('')
        setCredits(15)
      } else {
        setMessage(`❌ ${data.error}`)
      }
    } catch (error) {
      setMessage('❌ 서버 오류가 발생했습니다.')
      console.error('크레딧 조정 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* 헤더 */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">관리자 크레딧 관리</h2>
            <p className="text-sm text-gray-600">사용자의 크레딧을 조정할 수 있습니다</p>
          </div>
        </div>

        {/* 폼 */}
        <div className="space-y-4">
          {/* 대상 이메일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              대상 사용자 이메일
            </label>
            <input
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 크레딧 설정 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              크레딧 수량
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="999"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex space-x-1">
                <button
                  onClick={() => setCredits(Math.max(0, credits - 1))}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <button
                  onClick={() => setCredits(credits + 1)}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 빠른 설정 버튼들 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              빠른 설정
            </label>
            <div className="flex space-x-2">
              {[0, 10, 20, 50, 100].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setCredits(amount)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    credits === amount
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* 메시지 */}
          {message && (
            <div className={`p-3 rounded-xl text-sm ${
              message.includes('✅') 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* 버튼 */}
          <div className="space-y-3 pt-4">
            <button
              onClick={handleAdjustCredits}
              disabled={isLoading || !targetEmail.trim()}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>처리 중...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>크레딧 조정</span>
                </>
              )}
            </button>
            
            <button 
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>

        {/* 경고 메시지 */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-700">
              <p className="font-medium">주의사항</p>
              <p>크레딧 조정은 되돌릴 수 없습니다. 신중하게 조정해주세요.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
