'use client'

import { useState } from 'react'
import { X, Crown } from 'lucide-react'

interface ProPlanTooltipProps {
  isVisible: boolean
  onClose: () => void
  credits: number
}

export default function ProPlanTooltip({ isVisible, onClose, credits }: ProPlanTooltipProps) {
  if (!isVisible || credits > 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* 내용 */}
        <div className="text-center space-y-4">
          {/* 아이콘 */}
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
            <Crown className="w-8 h-8 text-white" />
          </div>

          {/* 제목 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              크레딧이 부족해요! 😢
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              더 많은 팟캐스트를 생성하려면
              <br />
              <span className="font-bold text-purple-600">Pro 플랜</span>을 구독해보세요!
            </p>
          </div>

          {/* 혜택 */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 text-left">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Pro 플랜 혜택</h3>
            <ul className="space-y-2 text-xs text-gray-700">
              <li className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>무제한 팟캐스트 생성</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>프리미엄 음성 모델</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>우선 고객 지원</span>
              </li>
            </ul>
          </div>

          {/* 버튼 */}
          <div className="space-y-3">
            <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all">
              Pro 플랜 구독하기 →
            </button>
            <button 
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-600 py-2 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
            >
              나중에
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
