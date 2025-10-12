'use client'

interface SkeletonLoaderProps {
  className?: string
  width?: string
  height?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export default function SkeletonLoader({ 
  className = '', 
  width = 'w-full', 
  height = 'h-4',
  rounded = 'md'
}: SkeletonLoaderProps) {
  const roundedClass = {
    'sm': 'rounded-sm',
    'md': 'rounded-md',
    'lg': 'rounded-lg',
    'xl': 'rounded-xl',
    'full': 'rounded-full'
  }[rounded]

  return (
    <div className={`${width} ${height} ${roundedClass} bg-gray-200 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
    </div>
  )
}

// 팟캐스트 카드 스켈레톤
export function PodcastCardSkeleton() {
  return (
    <div className="app-card p-4">
      <div className="flex items-center space-x-4">
        {/* 썸네일 스켈레톤 */}
        <SkeletonLoader width="w-16" height="h-16" rounded="lg" className="flex-shrink-0" />
        
        {/* 제목 및 상태 스켈레톤 */}
        <div className="flex-1 min-w-0 space-y-2">
          <SkeletonLoader width="w-3/4" height="h-5" />
          <div className="flex items-center space-x-2">
            <SkeletonLoader width="w-16" height="h-6" rounded="full" />
            <SkeletonLoader width="w-12" height="h-4" />
          </div>
        </div>
        
        {/* 재생 버튼 스켈레톤 */}
        <SkeletonLoader width="w-8" height="h-8" rounded="full" className="flex-shrink-0" />
      </div>
    </div>
  )
}

// 크레딧 카드 스켈레톤
export function CreditCardSkeleton() {
  return (
    <div className="app-card p-4 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SkeletonLoader width="w-8" height="h-8" rounded="lg" />
          <div className="space-y-2">
            <SkeletonLoader width="w-24" height="h-4" />
            <SkeletonLoader width="w-40" height="h-3" />
          </div>
        </div>
        <div className="text-right space-y-2">
          <SkeletonLoader width="w-12" height="h-8" />
        </div>
      </div>
    </div>
  )
}

// 텍스트 스켈레톤 (여러 줄)
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader 
          key={index} 
          width={index === lines - 1 ? 'w-2/3' : 'w-full'} 
          height="h-4" 
        />
      ))}
    </div>
  )
}

