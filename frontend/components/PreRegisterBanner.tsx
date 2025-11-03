'use client'

interface PreRegisterBannerProps {
  onClick: () => void
}

export default function PreRegisterBanner({ onClick }: PreRegisterBannerProps) {
  return (
    <div className="w-full max-w-[480px] mx-auto px-6 flex justify-center">
      <button
        onClick={onClick}
        className="w-auto liquid-glass rounded-full py-2 px-4 hover:scale-[1.02] transition-all duration-300"
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-medium text-sm whitespace-nowrap">
            🎁 유료 플랜 사전등록하고 특별 혜택 받기
          </span>
          <span className="text-white/80">→</span>
        </div>
      </button>
    </div>
  )
}
