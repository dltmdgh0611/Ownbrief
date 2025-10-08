import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import DevModeLink from '@/frontend/components/DevModeLink'

export const metadata: Metadata = {
  title: 'Ownbrief - AI 팟캐스트 생성기',
  description: 'Ownbrief는 유튜브 동영상을 AI가 팟캐스트로 변환합니다.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  themeColor: '#1C543E',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <div className="mobile-app-container">
            {children}
            <DevModeLink />
          </div>
        </Providers>
      </body>
    </html>
  )
}
