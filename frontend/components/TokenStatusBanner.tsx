'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'

interface TokenStatus {
  hasAccount: boolean
  hasRefreshToken: boolean
  isExpired: boolean
  needsReauth: boolean
  message: string
}

export default function TokenStatusBanner() {
  const { data: session, status } = useSession()
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && !isDismissed) {
      checkTokenStatus()
    }
  }, [status, isDismissed])

  const checkTokenStatus = async () => {
    try {
      setIsChecking(true)
      const response = await fetch('/api/user/check-token', {
        cache: 'no-store', // 캐시 방지
      })
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Token Status:', data) // 디버깅용
        setTokenStatus(data)
      }
    } catch (error) {
      console.error('Failed to check token status:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleReauthorize = async () => {
    try {
      // 현재 계정 연결 해제 안내
      if (confirm(
        '재인증을 위해 다음 단계를 진행하세요:\n\n' +
        '1. 로그아웃합니다\n' +
        '2. Google 계정 설정에서 앱 권한을 제거합니다\n' +
        '3. 다시 로그인합니다\n\n' +
        '지금 로그아웃하시겠습니까?'
      )) {
        await signOut({ callbackUrl: '/?reauth=true' })
      }
    } catch (error) {
      console.error('Failed to reauthorize:', error)
    }
  }

  if (status !== 'authenticated' || !tokenStatus || isDismissed) {
    return null
  }

  // Refresh token이 있으면 배너 표시 안함
  if (!tokenStatus.needsReauth) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 shadow-lg">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-6 w-6 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1">⚠️ 재인증이 필요합니다</h3>
          <p className="text-xs text-white/90 mb-2">
            자동 팟캐스트 생성을 위해 Google 계정 재인증이 필요합니다.
            {tokenStatus && (
              <span className="block mt-1 opacity-75">
                Debug: hasRefreshToken={tokenStatus.hasRefreshToken.toString()}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleReauthorize}
              className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors flex items-center space-x-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>재인증하기</span>
            </button>
            <button
              onClick={checkTokenStatus}
              disabled={isChecking}
              className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/30 transition-colors flex items-center space-x-1"
            >
              <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
              <span>상태 다시 확인</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-white/80 hover:text-white px-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

