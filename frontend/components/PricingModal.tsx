'use client'

import { useState } from 'react'
import { X, Check, Sparkles, Zap, Calendar, Users, Gift } from 'lucide-react'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [showSuccess, setShowSuccess] = useState(false)

  if (!isOpen) return null

  const handleEarlyAccessClick = () => {
    setShowSuccess(true)
  }

  const handleClose = () => {
    setShowSuccess(false)
    onClose()
  }

  // 플랜 혜택 리스트
  const benefits = [
    '매일 자동 팟캐스트 생성',
    '매월 20 크레딧 지급',
    '원하는 시간에 공개',
    '우선 지원 및 피드백',
    '무제한 팟캐스트 생성',
    '모든 음성 모델 사용',
    '고화질 오디오 다운로드'
  ]

  // 얼리버드 추가 혜택
  const earlyBirdBenefits = [
    '향후 1년 간 슈퍼얼리버드 90% 할인권 (₩1,950/월)',
    '정식 출시 1주일 전 우선 알림',
    '베타 테스터로 서비스 개선에 참여 기회',
    '매월 20 크레딧 추가 지급'
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col relative">
        {/* 닫기 버튼 - 모달 내부 오른쪽 상단 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-white shadow-md transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* 헤더 */}
        <div className="bg-gradient-to-r from-brand to-brand-light text-white px-6 py-5 rounded-t-lg flex-shrink-0">
          
          {!showSuccess ? (
            <>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg font-medium text-white">런칭 기념</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                프리미엄 플랜
              </h2>
              <p className="text-white/90 text-sm">슈퍼얼리버드 90% 할인 ~10.31까지</p>
            </>
          ) : (
            <h2 className="text-2xl font-bold text-white">
              감사합니다!
            </h2>
          )}
        </div>

        {/* 컨텐츠 */}
        <div className="px-6 py-6 space-y-6 overflow-y-auto flex-1">
          {!showSuccess ? (
            <>
              {/* 가격 정보 */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="text-center">
                  <p className="text-gray-600 text-sm mb-2">정가</p>
                  <p className="text-gray-400 line-through text-lg mb-2">₩19,500</p>
                  <div className="flex items-baseline justify-center space-x-2 mb-3">
                    <span className="text-4xl font-bold text-gray-900">₩1,950</span>
                    <span className="text-lg text-gray-600">/월</span>
                  </div>
                  <div className="inline-flex items-center px-3 py-1 bg-red-500 text-white rounded text-sm font-medium">
                    90% 할인
                  </div>
                </div>
              </div>

              {/* 플랜 혜택 */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  프리미엄 플랜 혜택
                </h3>
                <ul className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-brand flex-shrink-0" />
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA 버튼 */}
              <button
                onClick={handleEarlyAccessClick}
                className="w-full bg-brand text-white py-4 rounded-lg font-medium text-base hover:bg-brand/90 transition-colors"
              >
                얼리 액세스 신청하기 →
              </button>

              {/* 추가 설명 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 text-center">
                  온브리프는 현재 MVP 단계에서 서비스 품질을 완벽하게 만들고 있습니다.
                  슈퍼얼리버드 가격으로 우선 이용하실 수 있습니다.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* 성공 메시지 */}
              <div className="text-center space-y-6 py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                
                <div className="space-y-3">
                  <p className="text-lg font-bold text-gray-900">
                    온브리프에 관심 가져주셔서 감사합니다!
                  </p>
                  <p className="text-sm text-gray-600">
                    온브리프는 현재 MVP 단계에서 서비스 품질을 완벽하게 만들고 있습니다.
                    슈퍼얼리버드 가격(90% 할인)으로 우선 이용하실 수 있도록
                    얼리 액세스 대기자 명단에 등록해드렸습니다.
                  </p>
                </div>

                {/* 얼리버드 혜택 목록 */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">대기자 명단 혜택</h3>
                  <ul className="space-y-3">
                    {earlyBirdBenefits.map((benefit, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <Check className="w-5 h-5 text-brand flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full bg-gray-900 text-white py-4 rounded-lg font-medium text-base hover:bg-gray-800 transition-colors"
                >
                  확인
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

