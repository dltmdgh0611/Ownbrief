'use client'

import { useState } from 'react'
import { X, CheckCircle2, Tag, Gift, Bell, Sparkles } from 'lucide-react'

interface PreRegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onRegister: () => Promise<void>
}

export default function PreRegisterModal({ isOpen, onClose, onRegister }: PreRegisterModalProps) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)

  if (!isOpen) return null

  const handleRegister = async () => {
    setIsRegistering(true)
    try {
      await onRegister()
      setRegistered(true)
      // 2초 후 자동으로 모달 닫기
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('사전등록 실패:', error)
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 콘텐츠 */}
      <div className="relative w-full max-w-md liquid-glass rounded-3xl p-6 shadow-2xl">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {registered ? (
          // 등록 완료 화면
          <div className="text-center py-8">
            <div className="mb-6 flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              사전등록 완료!
            </h2>
            <p className="text-white/70 text-sm">
              출시 알림과 특별 혜택을 받으실 수 있습니다
            </p>
          </div>
        ) : (
          // 등록 전 화면
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                유료 플랜 사전등록
              </h2>
              <div className="mb-2">
                <span className="text-white text-lg font-semibold">월 3,900원</span>
              </div>
              <p className="text-white/70 text-sm">
                출시 전 사전등록하고 특별 혜택을 받아보세요
              </p>
            </div>

            {/* 혜택 목록 */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                <Tag className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">
                    얼리버드 할인
                  </h3>
                  <p className="text-white/60 text-xs">
                    정식 출시 시 최대 30% 할인된 가격으로 이용
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                <Gift className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">
                    추가 크레딧 제공
                  </h3>
                  <p className="text-white/60 text-xs">
                    구독 시작 시 보너스 크레딧 50개 추가 제공
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                <Bell className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">
                    우선 출시 알림
                  </h3>
                  <p className="text-white/60 text-xs">
                    정식 출시 전 가장 먼저 알림을 받고 시작
                  </p>
                </div>
              </div>
            </div>

            {/* 사전등록 버튼 */}
            <button
              onClick={handleRegister}
              disabled={isRegistering}
              className="w-full liquid-glass-button py-4 rounded-2xl text-white font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegistering ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>등록 중...</span>
                </div>
              ) : (
                '지금 사전등록 하기'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
