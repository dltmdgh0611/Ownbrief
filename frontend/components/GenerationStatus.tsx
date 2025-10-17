'use client'

import { CheckCircle2, Loader2, Circle } from 'lucide-react'

interface GenerationStatusProps {
  currentStatus: string
  progress: number
}

export default function GenerationStatus({ currentStatus, progress }: GenerationStatusProps) {
  const steps = [
    { label: '데이터 수집', progress: 20 },
    { label: '스크립트 작성', progress: 60 },
    { label: '음성 생성', progress: 80 },
    { label: '완료', progress: 100 },
  ]

  const getStepStatus = (stepProgress: number) => {
    if (progress >= stepProgress) return 'completed'
    if (progress >= stepProgress - 20) return 'active'
    return 'pending'
  }

  return (
    <div className="app-card p-6 space-y-6">
      {/* 현재 상태 텍스트 */}
      <div className="text-center">
        <p className="text-lg font-medium text-gray-900">
          {currentStatus || '준비 중...'}
        </p>
      </div>

      {/* 프로그레스 바 */}
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-brand to-brand-light h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-center mt-2">
          <span className="text-sm text-gray-600">{progress}%</span>
        </div>
      </div>

      {/* 단계별 상태 */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const status = getStepStatus(step.progress)
          
          return (
            <div
              key={step.label}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                status === 'active' ? 'bg-blue-50' : ''
              }`}
            >
              {status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : status === 'active' ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
              )}
              
              <span
                className={`text-sm font-medium ${
                  status === 'completed'
                    ? 'text-green-700'
                    : status === 'active'
                    ? 'text-blue-700'
                    : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}



