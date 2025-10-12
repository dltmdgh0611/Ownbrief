'use client'

import SkeletonLoader from './SkeletonLoader'

export function PlaylistItemSkeleton() {
  return (
    <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
      <div className="flex items-start space-x-3">
        <SkeletonLoader width="w-5" height="h-5" rounded="sm" className="mt-1" />
        <div className="flex-1 min-w-0 space-y-2">
          <SkeletonLoader width="w-3/4" height="h-5" />
          <SkeletonLoader width="w-full" height="h-4" />
          <SkeletonLoader width="w-24" height="h-6" rounded="full" />
        </div>
      </div>
    </div>
  )
}

export function SettingsSectionSkeleton() {
  return (
    <div className="app-card p-5">
      <div className="flex items-center justify-between mb-4">
        <SkeletonLoader width="w-40" height="h-6" />
        <SkeletonLoader width="w-5" height="h-5" />
      </div>
    </div>
  )
}

