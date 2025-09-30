'use client'

import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // 5분마다 세션 갱신 확인
      refetchInterval={5 * 60}
      // 포커스 시 세션 갱신
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  )
}
