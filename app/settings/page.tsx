'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, Trash2, Loader2, ArrowLeft, RefreshCw, User, Sparkles, MessageSquare, FileText, CheckCircle, XCircle, Mail, Calendar, Youtube, ChevronRight, AlertCircle } from 'lucide-react'
import Prism from '@/components/Prism'

interface UserPersona {
  workStyle: string
  interests: string[]
  meetingFrequency: string
  communicationStyle: string
  primaryProjects: string[]
  preferredTime: string
  confirmed: boolean
}

interface ConnectedService {
  id: string
  serviceName: string
  accessToken?: string
  expiresAt: string | null
  enabled?: boolean
  metadata: any
  createdAt: string
  updatedAt: string
}

// 서비스 정의
const SERVICE_CONFIG = {
  gmail: {
    name: 'Gmail',
    description: '중요 메일 수집',
    icon: Mail,
    color: 'bg-gray-100',
    iconColor: 'text-gray-900',
    buttonColor: 'bg-brand',
    connectionType: 'google' // Google OAuth로 연결
  },
  calendar: {
    name: 'Google Calendar',
    description: '오늘의 일정',
    icon: Calendar,
    color: 'bg-gray-100',
    iconColor: 'text-gray-900',
    buttonColor: 'bg-brand',
    connectionType: 'google'
  },
  slack: {
    name: 'Slack',
    description: '읽지 않은 멘션 메시지',
    icon: MessageSquare,
    color: 'bg-gray-100',
    iconColor: 'text-gray-900',
    buttonColor: 'bg-brand',
    connectionType: 'slack'
  },
  notion: {
    name: 'Notion',
    description: '최근 업데이트된 페이지',
    icon: FileText,
    color: 'bg-gray-100',
    iconColor: 'text-gray-900',
    buttonColor: 'bg-brand',
    connectionType: 'notion'
  },
  youtube: {
    name: 'YouTube',
    description: '관심사 추천 영상',
    icon: Youtube,
    color: 'bg-gray-100',
    iconColor: 'text-gray-900',
    buttonColor: 'bg-brand',
    connectionType: 'google'
  }
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [persona, setPersona] = useState<UserPersona | null>(null)
  const [isLoadingPersona, setIsLoadingPersona] = useState(false)
  const [isRegeneratingPersona, setIsRegeneratingPersona] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [message, setMessage] = useState('')
  const [connectedServices, setConnectedServices] = useState<ConnectedService[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [updatingServices, setUpdatingServices] = useState<Set<string>>(new Set())
  const [showAddWorkspaceModal, setShowAddWorkspaceModal] = useState(false)
  const [workspaceToken, setWorkspaceToken] = useState('')
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/welcome')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      loadPersona()
      loadConnectedServices()
    }
  }, [session])

  useEffect(() => {
    // URL 파라미터에서 성공/에러 메시지 처리
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')

    if (success) {
      switch (success) {
        case 'slack_connected':
        case 'notion_connected':
        case 'google_connected':
          setMessage('연동이 완료되었습니다!')
          loadConnectedServices()
          break
      }
      setTimeout(() => setMessage(''), 5000)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const loadPersona = async () => {
    try {
      setIsLoadingPersona(true)
      const response = await fetch('/api/persona')
      if (response.ok) {
        const data = await response.json()
        setPersona(data.persona)
      }
    } catch (error) {
      console.error('Failed to load persona:', error)
    } finally {
      setIsLoadingPersona(false)
    }
  }

  const loadConnectedServices = async () => {
    try {
      setIsLoadingServices(true)
      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const data = await response.json()
        setConnectedServices(data.connectedServices || data.settings?.connectedServices || [])
      }
    } catch (error) {
      console.error('Failed to load connected services:', error)
    } finally {
      setIsLoadingServices(false)
    }
  }

  // 연결 상태 확인 함수
  const isServiceConnected = (serviceName: string): boolean => {
    const service = connectedServices.find(s => s.serviceName === serviceName)
    if (!service || !service.accessToken) {
      return false
    }
    
    // enabled 필드가 false면 토큰 갱신 실패로 재인증 필요
    if (service.enabled === false) {
      return false
    }
    
    // expiresAt이 있으면 만료 시간 확인
    if (service.expiresAt) {
      return new Date(service.expiresAt) > new Date()
    }
    
    // expiresAt이 없으면 (long-lived token) true 반환
    return true
  }

  // 서비스 활성화 상태 확인 (연결되어 있고 enabled가 true면 활성화)
  const isServiceEnabled = (serviceName: string): boolean => {
    const service = connectedServices.find(s => s.serviceName === serviceName)
    return service?.enabled !== false && isServiceConnected(serviceName)
  }

  // 토글 상태 변경
  const handleToggleService = async (serviceName: string, enabled: boolean) => {
    if (!isServiceConnected(serviceName)) {
      // 연결되지 않은 경우 연결 페이지로 이동
      await handleConnectService(serviceName)
      return
    }

    // OFF로 변경하면 연결 해제 (DB에서 삭제)
    if (!enabled) {
      const config = SERVICE_CONFIG[serviceName as keyof typeof SERVICE_CONFIG]
      if (!confirm(`${config.name} 연동을 해제하시겠습니까?\n다시 사용하려면 재연결이 필요합니다.`)) {
        return
      }

      try {
        setUpdatingServices(prev => new Set(prev).add(serviceName))
        
        const response = await fetch('/api/user/settings', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ serviceName }),
        })

        if (response.ok) {
          setMessage(`${config.name} 연동이 해제되었습니다.`)
          setTimeout(() => setMessage(''), 3000)
          await loadConnectedServices()
        } else {
          throw new Error('Failed to disconnect service')
        }
      } catch (error) {
        console.error('Toggle service error:', error)
        setMessage('연동 해제에 실패했습니다.')
      } finally {
        setUpdatingServices(prev => {
          const newSet = new Set(prev)
          newSet.delete(serviceName)
          return newSet
        })
      }
    }
  }

  // 서비스 연결
  const handleConnectService = async (serviceName: string) => {
    const config = SERVICE_CONFIG[serviceName as keyof typeof SERVICE_CONFIG]
    if (!config) return

    try {
      if (config.connectionType === 'slack') {
        const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}&user_scope=channels:read,groups:read,im:read,mpim:read,users:read,channels:history,groups:history,im:history,mpim:history&redirect_uri=${encodeURIComponent(`${window.location.origin}/api/auth/slack/callback`)}`
        window.location.href = slackAuthUrl
      } else if (config.connectionType === 'notion') {
        // Notion OAuth 연결
        const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(`${window.location.origin}/api/auth/notion/callback`)}`
        window.location.href = notionAuthUrl
      } else if (config.connectionType === 'google') {
        // Google OAuth 연결
        const googleAuthUrl = `/api/auth/google?services=${serviceName}`
        window.location.href = googleAuthUrl
      }
    } catch (error: any) {
      console.error('Connect service error:', error)
      setMessage(`${config.name} 연동 실패: ${error.message}`)
    }
  }

  // Notion 워크스페이스 추가
  const handleAddWorkspace = async () => {
    if (!workspaceToken.trim()) {
      setMessage('토큰을 입력해주세요.')
      return
    }

    try {
      setIsAddingWorkspace(true)
      setMessage('')

      const response = await fetch('/api/auth/notion/add-workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: workspaceToken }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        setTimeout(() => setMessage(''), 3000)
        setShowAddWorkspaceModal(false)
        setWorkspaceToken('')
        await loadConnectedServices()
      } else {
        throw new Error(data.error || 'Failed to add workspace')
      }
    } catch (error: any) {
      console.error('Add workspace error:', error)
      setMessage(error.message)
    } finally {
      setIsAddingWorkspace(false)
    }
  }

  // Notion 워크스페이스 목록 가져오기
  const getNotionWorkspaces = () => {
    return connectedServices.filter(service => service.serviceName.startsWith('notion'))
  }

  const handleRegeneratePersona = async () => {
    if (!confirm('페르소나를 다시 생성하시겠습니까? 기존 페르소나는 삭제됩니다.')) {
      return
    }

    try {
      setIsRegeneratingPersona(true)
      setMessage('')

      const response = await fetch('/api/persona/generate', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setPersona(data.persona)
        setMessage('페르소나가 성공적으로 재생성되었습니다.')
        setTimeout(() => setMessage(''), 3000)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to regenerate persona')
      }
    } catch (error: any) {
      console.error('Regenerate persona error:', error)
      alert(`페르소나 재생성 실패: ${error.message}`)
    } finally {
      setIsRegeneratingPersona(false)
    }
  }

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await signOut({ callbackUrl: '/welcome' })
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('⚠️ 정말로 계정을 삭제하시겠습니까?\n\n모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.')) {
      return
    }

    const confirmText = prompt('계정 삭제를 확인하려면 "DELETE"를 입력하세요:')
    if (confirmText !== 'DELETE') {
      alert('계정 삭제가 취소되었습니다.')
      return
    }

    try {
      setIsDeletingAccount(true)
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('계정이 삭제되었습니다.')
        await signOut({ callbackUrl: '/welcome' })
      } else {
        throw new Error('Failed to delete account')
      }
    } catch (error) {
      console.error('Delete account error:', error)
      alert('계정 삭제에 실패했습니다.')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="h-screen relative flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Prism
            animationType="rotate"
            suspendWhenOffscreen={true}
            transparent={true}
            hueShift={0.3}
            glow={0.4}
            bloom={0.6}
            scale={3.2}
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <Loader2 className="w-8 h-8 animate-spin text-white relative z-10" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Prism 배경 */}
      <div className="absolute inset-0 z-0 prism-background-container">
        <Prism
          animationType="rotate"
          suspendWhenOffscreen={true}
          transparent={true}
          hueShift={0.3}
          glow={0.8}
          bloom={0.6}
          scale={3.2}
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Floating 헤더 */}
      <div className="sticky top-0 z-50 px-6 pt-6 pb-2">
        <div className="max-w-[480px] mx-auto liquid-glass rounded-[9999px] px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 liquid-glass rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">설정</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-white/80 hover:text-white transition-colors text-xs font-medium"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-[480px] mx-auto px-6 py-6 relative z-10">
        {/* 성공/에러 메시지 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg liquid-glass-card ${
            message.includes('완료') || message.includes('성공')
              ? 'border-green-400/30'
              : 'border-red-400/30'
          }`}>
            <p className={`text-sm font-medium ${
              message.includes('완료') || message.includes('성공')
                ? 'text-green-100'
                : 'text-red-100'
            }`}>{message}</p>
          </div>
        )}

        {/* 페르소나 섹션 */}
        <div className="liquid-glass-card p-6 mb-6 rounded-xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 liquid-glass rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">페르소나</h2>
              <p className="text-sm text-white/70">AI가 분석한 당신의 프로필</p>
            </div>
          </div>

          {isLoadingPersona ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : persona ? (
            <div className="space-y-4 mb-6">
              {/* 업무 스타일 */}
              <div>
                <h3 className="text-sm font-medium text-white/70 mb-1">업무 스타일</h3>
                <p className="text-lg font-semibold text-white">
                  {persona.workStyle === 'morning-person' ? '아침형 인간 🌅' :
                   persona.workStyle === 'night-owl' ? '저녁형 인간 🌙' :
                   '유연한 스타일 ⚡'}
                </p>
              </div>

              {/* 관심사 */}
              <div>
                <h3 className="text-sm font-medium text-white/70 mb-2">관심사</h3>
                <div className="flex flex-wrap gap-2">
                  {persona.interests?.map((interest, index) => (
                    <span
                      key={`${interest}-${index}`}
                      className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-white/90 mb-4">페르소나가 생성되지 않았습니다.</p>
              <p className="text-sm text-white/70">온보딩을 완료하면 자동으로 생성됩니다.</p>
            </div>
          )}

          {/* 페르소나 재생성 버튼 */}
          <button
            onClick={handleRegeneratePersona}
            disabled={isRegeneratingPersona}
            className="w-full liquid-glass-button py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isRegeneratingPersona ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>페르소나 재생성 중...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                <span>페르소나 다시 생성하기</span>
              </>
            )}
          </button>
        </div>

        {/* 서비스 연동 섹션 */}
        <div className="liquid-glass-card p-6 mb-6 rounded-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 liquid-glass rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">데이터 소스</h2>
              <p className="text-sm text-white/70">브리핑에 사용할 서비스를 선택하세요</p>
            </div>
          </div>

          {isLoadingServices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(SERVICE_CONFIG).filter(([key]) => key !== 'notion').map(([key, config]) => {
                const Icon = config.icon
                const isConnected = isServiceConnected(key)
                const isEnabled = isServiceEnabled(key)
                const isUpdating = updatingServices.has(key)
                const service = connectedServices.find(s => s.serviceName === key)
                const needsReauth = service && service.enabled === false

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-lg transition-all ${
                      isEnabled ? 'liquid-glass-toggle active' : 'liquid-glass'
                    } ${needsReauth ? 'border border-yellow-400/50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 text-white`} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-white">{config.name}</h3>
                            {needsReauth && (
                              <span title="재인증 필요">
                                <AlertCircle className="w-4 h-4 text-yellow-400" />
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white/70">
                            {needsReauth ? '재인증이 필요합니다' : config.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {!isConnected || needsReauth ? (
                          <button
                            onClick={() => handleConnectService(key)}
                            className={`liquid-glass-button px-4 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                              needsReauth ? 'border border-yellow-400/50' : ''
                            }`}
                          >
                            <span>{needsReauth ? '재연결' : '연결하기'}</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            {/* 토글 스위치 */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isEnabled}
                                onChange={(e) => !isUpdating && handleToggleService(key, e.target.checked)}
                                disabled={isUpdating}
                              />
                              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-white/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/40"></div>
                            </label>
                            {isUpdating && (
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Notion 섹션 - 특별 렌더링 */}
              <div className="border-t border-white/20 pt-3 mt-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center`}>
                      <FileText className={`w-5 h-5 text-white`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Notion</h3>
                      <p className="text-sm text-white/70">워크스페이스별 최근 업데이트</p>
                    </div>
                  </div>

                  {getNotionWorkspaces().length === 0 && (
                    <button
                      onClick={() => handleConnectService('notion')}
                      className="liquid-glass-button px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
                    >
                      <span>연결하기</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Notion 워크스페이스 목록 */}
                {getNotionWorkspaces().length > 0 && (
                  <div className="space-y-2 ml-13">
                    {getNotionWorkspaces().map((workspace) => {
                      const metadata = workspace.metadata as any
                      const isUpdating = updatingServices.has(workspace.serviceName)
                      const isEnabled = isServiceEnabled(workspace.serviceName)
                      const needsReauth = workspace.enabled === false

                      return (
                        <div
                          key={workspace.id}
                          className={`p-3 rounded-lg transition-all ${
                            isEnabled ? 'liquid-glass-toggle active' : 'liquid-glass'
                          } ${needsReauth ? 'border border-yellow-400/50' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-white">
                                  {metadata?.workspaceName || 'Notion Workspace'}
                                </p>
                                {needsReauth && (
                                  <span title="재인증 필요">
                                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-white/70">
                                {needsReauth ? '재인증이 필요합니다' : (metadata?.type === 'oauth' ? 'OAuth 연결' : '토큰 연결')}
                              </p>
                            </div>

                            <div className="flex items-center space-x-3">
                              {needsReauth ? (
                                <button
                                  onClick={() => handleConnectService('notion')}
                                  className="liquid-glass-button px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-1 border border-yellow-400/50"
                                >
                                  <span>재연결</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              ) : (
                                <>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={isEnabled}
                                      onChange={(e) => !isUpdating && handleToggleService(workspace.serviceName, e.target.checked)}
                                      disabled={isUpdating}
                                    />
                                    <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-white/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/40"></div>
                                  </label>
                                  {isUpdating && (
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* 워크스페이스 추가 버튼 */}
                    <button
                      onClick={() => setShowAddWorkspaceModal(true)}
                      className="w-full p-3 border-2 border-dashed border-white/30 rounded-lg hover:border-white/50 hover:bg-white/10 transition-all text-white/70 hover:text-white font-medium"
                    >
                      + 워크스페이스 추가
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 계정 설정 섹션 */}
        <div className="liquid-glass-card p-6 rounded-xl">
          <div className="flex items-center space-x-3 mb-6">
            <User className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">계정 설정</h2>
          </div>

          <div className="space-y-3">
            {/* 사용자 정보 */}
            <div className="p-4 liquid-glass rounded-lg">
              <p className="text-sm text-white/70 mb-1">로그인 계정</p>
              <p className="font-medium text-white">{session?.user?.email}</p>
            </div>

            {/* 로그아웃 버튼 */}
            <button
              onClick={handleLogout}
              className="w-full liquid-glass py-3 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <LogOut className="w-5 h-5" />
              <span>로그아웃</span>
            </button>

            {/* 계정 삭제 버튼 */}
            <button
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-100 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 border border-red-400/30"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>계정 삭제 중...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  <span>계정 삭제</span>
                </>
              )}
            </button>

            <p className="text-xs text-white/70 text-center mt-2">
              ⚠️ 계정 삭제 시 모든 데이터가 영구적으로 삭제됩니다
            </p>
          </div>
        </div>
      </div>

      {/* 워크스페이스 추가 모달 */}
      {showAddWorkspaceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddWorkspaceModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Notion 워크스페이스 추가</h3>
            <p className="text-sm text-gray-600 mb-4">
              Notion Internal Integration Token을 입력하세요
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Integration Token
              </label>
              <input
                type="text"
                value={workspaceToken}
                onChange={(e) => setWorkspaceToken(e.target.value)}
                placeholder="secret_xxxxxxxxxxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                disabled={isAddingWorkspace}
              />
              <p className="text-xs text-gray-500 mt-2">
                <a 
                  href="https://www.notion.so/my-integrations" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  Notion 설정
                </a>에서 Internal Integration을 생성하고 토큰을 복사하세요.
              </p>
            </div>

            {message && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {message}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAddWorkspaceModal(false)
                  setWorkspaceToken('')
                  setMessage('')
                }}
                disabled={isAddingWorkspace}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleAddWorkspace}
                disabled={isAddingWorkspace || !workspaceToken.trim()}
                className="flex-1 px-4 py-2 bg-brand hover:bg-brand/90 text-white rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingWorkspace ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>추가 중...</span>
                  </>
                ) : (
                  <span>추가</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
