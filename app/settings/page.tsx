'use client'

import { useState, useEffect, useMemo } from 'react'
import React from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, Trash2, Loader2, ArrowLeft, RefreshCw, User, Sparkles, MessageSquare, FileText, CheckCircle, XCircle, Mail, Calendar, Youtube, ChevronRight, AlertCircle, ThumbsUp } from 'lucide-react'
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

const SURVEY_OPTIONS = [
  { value: 'mail', label: '메일' },
  { value: 'calendar', label: '캘린더' },
  { value: 'slack', label: '슬랙' },
  { value: 'notion', label: '노션' },
  { value: 'trend', label: '트렌드 데이터' }
] as const

const SURVEY_LABEL_MAP = SURVEY_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

const parseSurveyFeedback = (feedback?: string | null) => {
  if (!feedback) {
    return {
      good: '',
      bad: '',
      etc: ''
    }
  }

  const patterns: Record<'good' | 'bad' | 'etc', RegExp> = {
    good: /좋았던점\s*:\s*([\s\S]*?)(?=\n아쉬웠던점\s*:|\n기타후기\s*:|$)/,
    bad: /아쉬웠던점\s*:\s*([\s\S]*?)(?=\n기타후기\s*:|$)/,
    etc: /기타후기\s*:\s*([\s\S]*)$/
  }

  const cleaned = feedback.replace(/\r\n/g, '\n')

  const goodMatch = cleaned.match(patterns.good)
  const badMatch = cleaned.match(patterns.bad)
  const etcMatch = cleaned.match(patterns.etc)

  return {
    good: goodMatch?.[1]?.trim() || '',
    bad: badMatch?.[1]?.trim() || '',
    etc: etcMatch?.[1]?.trim() || feedback.trim()
  }
}

const formatSurveyFeedback = (good: string, bad: string, etc: string) => {
  return `좋았던점 : ${good}\n아쉬웠던점 : ${bad}\n기타후기 : ${etc}`.trim()
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
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [surveySelection, setSurveySelection] = useState<string | null>(null)
  const [surveyGoodFeedback, setSurveyGoodFeedback] = useState('')
  const [surveyBadFeedback, setSurveyBadFeedback] = useState('')
  const [surveyEtcFeedback, setSurveyEtcFeedback] = useState('')
  const [surveyError, setSurveyError] = useState('')
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false)
  const [isLoadingSurvey, setIsLoadingSurvey] = useState(false)
  const [surveySubmittedAt, setSurveySubmittedAt] = useState<string | null>(null)
  const isSurveyReadyToSubmit = useMemo(() => {
    return Boolean(
      surveySelection &&
      surveyGoodFeedback.trim().length > 0 &&
      surveyBadFeedback.trim().length > 0 &&
      surveyEtcFeedback.trim().length > 0
    )
  }, [surveySelection, surveyGoodFeedback, surveyBadFeedback, surveyEtcFeedback])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/welcome')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      loadPersona()
      loadConnectedServices()
      loadSurveyResponse()
    }
  }, [session])

  useEffect(() => {
    // URL 파라미터에서 성공/에러 메시지 처리
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const connected = urlParams.get('connected')

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

    if (connected) {
      const config = SERVICE_CONFIG[connected as keyof typeof SERVICE_CONFIG]
      if (config) {
        setMessage(`${config.name} 연동이 완료되었습니다!`)
        loadConnectedServices()
        setTimeout(() => setMessage(''), 5000)
        window.history.replaceState({}, document.title, window.location.pathname)
      }
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

  const loadSurveyResponse = async () => {
    try {
      setIsLoadingSurvey(true)
      const response = await fetch('/api/user/settings/survey')
      if (response.ok) {
        const data = await response.json()
        const survey = data?.survey
        if (survey) {
          setSurveySelection(survey.preferredBriefing || null)
          const parsed = parseSurveyFeedback(survey.feedback)
          setSurveyGoodFeedback(parsed.good)
          setSurveyBadFeedback(parsed.bad)
          setSurveyEtcFeedback(parsed.etc)
          setSurveySubmittedAt(survey.submittedAt || null)
        } else {
          setSurveySelection(null)
          setSurveyGoodFeedback('')
          setSurveyBadFeedback('')
          setSurveyEtcFeedback('')
          setSurveySubmittedAt(null)
        }
      } else if (response.status === 404) {
        setSurveySelection(null)
        setSurveyGoodFeedback('')
        setSurveyBadFeedback('')
        setSurveyEtcFeedback('')
        setSurveySubmittedAt(null)
      } else {
        throw new Error('Failed to load survey response')
      }
    } catch (error) {
      console.error('Failed to load survey response:', error)
    } finally {
      setIsLoadingSurvey(false)
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
        // Google OAuth 연결 (설정 페이지로 돌아오기)
        const response = await fetch(`/api/auth/connect-service?service=${serviceName}&returnTo=/settings`)
        const data = await response.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        } else {
          throw new Error(data.error || 'Failed to get auth URL')
        }
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

  const handleOpenSurveyModal = () => {
    setSurveyError('')
    setShowSurveyModal(true)
  }

  const handleCloseSurveyModal = () => {
    setShowSurveyModal(false)
    setSurveyError('')
  }

  const handleSubmitSurvey = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()

    if (
      !surveySelection ||
      !surveyGoodFeedback.trim() ||
      !surveyBadFeedback.trim() ||
      !surveyEtcFeedback.trim()
    ) {
      setSurveyError('가장 도움이 된 브리핑과 세 가지 후기를 모두 작성해주세요.')
      return
    }

    try {
      setIsSubmittingSurvey(true)
      setSurveyError('')

      const formattedFeedback = formatSurveyFeedback(
        surveyGoodFeedback.trim(),
        surveyBadFeedback.trim(),
        surveyEtcFeedback.trim()
      )

      const response = await fetch('/api/user/settings/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferredBriefing: surveySelection,
          feedback: formattedFeedback
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '설문 제출에 실패했습니다.')
      }

      setMessage('설문이 성공적으로 제출되었습니다! 소중한 의견에 감사드립니다.')
      await loadSurveyResponse()
      setShowSurveyModal(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (error: any) {
      console.error('Submit survey error:', error)
      setSurveyError(error.message || '설문 제출 중 문제가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmittingSurvey(false)
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

        {/* 사용자 설문 카드 */}
        <div className="liquid-glass-card p-6 mb-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 liquid-glass rounded-full flex items-center justify-center">
                <ThumbsUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">사용자 설문</h2>
                <p className="text-sm text-white/70">가장 도움이 된 브리핑을 알려주세요</p>
              </div>
            </div>
            <button
              onClick={handleOpenSurveyModal}
              disabled={isLoadingSurvey}
              className="liquid-glass-button px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {surveySubmittedAt ? '설문 다시 작성하기' : '설문 참여하기'}
            </button>
          </div>

          <div className="mt-4 text-sm text-white/70">
            {isLoadingSurvey ? (
              <p>설문 정보를 불러오는 중입니다...</p>
            ) : surveySubmittedAt ? (
              <div className="space-y-3">
                {surveySelection && (
                  <p>
                    최근 응답:{' '}
                    <span className="text-white font-medium">{SURVEY_LABEL_MAP[surveySelection] || '-'}</span>
                  </p>
                )}
                <p>
                  제출일:{' '}
                  <span className="text-white">
                    {new Date(surveySubmittedAt).toLocaleString('ko-KR', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                </p>
                <div className="space-y-1 text-white/80">
                  <p className="text-white/90 font-semibold">최근 후기</p>
                  <p>
                    <span className="text-white/60">좋았던 점</span>:{' '}
                    <span className="text-white">{surveyGoodFeedback || '-'}</span>
                  </p>
                  <p>
                    <span className="text-white/60">아쉬웠던 점</span>:{' '}
                    <span className="text-white">{surveyBadFeedback || '-'}</span>
                  </p>
                  <p>
                    <span className="text-white/60">기타 후기</span>:{' '}
                    <span className="text-white">{surveyEtcFeedback || '-'}</span>
                  </p>
                </div>
              </div>
            ) : (
              <p>설문에 참여하고 OwnBrief가 더 나은 브리핑을 준비할 수 있도록 도와주세요.</p>
            )}
          </div>
        </div>

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

      {/* 설문 모달 */}
      {showSurveyModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleCloseSurveyModal}
        >
          <div
            className="liquid-glass-card p-6 max-w-md w-full rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmitSurvey} className="flex flex-col gap-5 max-h-[75vh]">
              <div className="overflow-y-auto pr-1 space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">OwnBrief 설문</h3>
                  <p className="text-sm text-white/70">
                    가장 도움이 된 브리핑과 느낀 점을 알려주세요. 더 좋은 경험을 준비하는 데 큰 도움이 됩니다.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-white/80">가장 도움이 된 브리핑</p>
                  <div className="space-y-2">
                    {SURVEY_OPTIONS.map((option) => {
                      const isSelected = surveySelection === option.value
                      return (
                        <label
                          key={option.value}
                          className={`block px-4 py-3 rounded-xl liquid-glass cursor-pointer transition-all ${
                            isSelected ? 'bg-white/10 ring-2 ring-white/40' : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between space-x-4">
                            <div className="flex items-center space-x-3">
                              <span className="text-white font-medium">{option.label}</span>
                            </div>
                            <span
                              className={`w-5 h-5 rounded-full border-2 ${
                                isSelected ? 'border-white bg-white' : 'border-white/40'
                              }`}
                            />
                          </div>
                          <input
                            type="radio"
                            name="surveyPreferredBriefing"
                            value={option.value}
                            className="sr-only"
                            checked={isSelected}
                            onChange={() => setSurveySelection(option.value)}
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      좋았던 점
                    </label>
                    <textarea
                      value={surveyGoodFeedback}
                      onChange={(e) => setSurveyGoodFeedback(e.target.value)}
                      rows={4}
                      maxLength={1000}
                      placeholder="OwnBrief 브리핑에서 가장 마음에 들었던 점을 적어주세요."
                      className="w-full px-4 py-3 liquid-glass rounded-xl text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/30 focus:outline-none transition-all resize-none overflow-y-auto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      아쉬웠던 점
                    </label>
                    <textarea
                      value={surveyBadFeedback}
                      onChange={(e) => setSurveyBadFeedback(e.target.value)}
                      rows={4}
                      maxLength={1000}
                      placeholder="어떤 점이 개선되었으면 좋겠는지 알려주세요."
                      className="w-full px-4 py-3 liquid-glass rounded-xl text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/30 focus:outline-none transition-all resize-none overflow-y-auto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      기타 후기
                    </label>
                    <textarea
                      value={surveyEtcFeedback}
                      onChange={(e) => setSurveyEtcFeedback(e.target.value)}
                      rows={4}
                      maxLength={1000}
                      placeholder="추가로 전하고 싶은 의견이 있다면 자유롭게 작성해주세요."
                      className="w-full px-4 py-3 liquid-glass rounded-xl text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/30 focus:outline-none transition-all resize-none overflow-y-auto"
                    />
                    <p className="text-xs text-white/60 mt-2">
                      각 입력란은 최소 한 글자 이상 작성해야 제출할 수 있어요. (각 최대 1000자)
                    </p>
                  </div>
                </div>

                {surveyError && (
                  <div className="p-3 rounded-lg liquid-glass border border-red-400/30 text-sm text-red-100">
                    {surveyError}
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCloseSurveyModal}
                  disabled={isSubmittingSurvey}
                  className="flex-1 px-4 py-3 liquid-glass rounded-xl font-medium text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!isSurveyReadyToSubmit || isSubmittingSurvey}
                  className="flex-1 px-4 py-3 liquid-glass-button rounded-xl font-semibold text-white flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingSurvey ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>제출 중...</span>
                    </>
                  ) : (
                    <span>제출하기</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 워크스페이스 추가 모달 */}
      {showAddWorkspaceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddWorkspaceModal(false)}>
          <div className="liquid-glass-card p-6 max-w-md w-full rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Notion 워크스페이스 추가</h3>
            <p className="text-sm text-white/70 mb-4">
              Notion Internal Integration Token을 입력하세요
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Integration Token
              </label>
              <input
                type="text"
                value={workspaceToken}
                onChange={(e) => setWorkspaceToken(e.target.value)}
                placeholder="secret_xxxxxxxxxxxx"
                className="w-full px-4 py-3 liquid-glass rounded-lg text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/30 focus:outline-none transition-all disabled:opacity-50"
                disabled={isAddingWorkspace}
              />
              <p className="text-xs text-white/60 mt-2">
                <a 
                  href="https://www.notion.so/my-integrations" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white/90 hover:text-white underline"
                >
                  Notion 설정
                </a>에서 Internal Integration을 생성하고 토큰을 복사하세요.
              </p>
            </div>

            {message && (
              <div className="mb-4 p-3 liquid-glass rounded-lg border border-red-400/30 text-sm">
                <p className="text-red-200">{message}</p>
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
                className="flex-1 px-4 py-3 liquid-glass rounded-xl font-medium text-white hover:bg-white/10 transition-all disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleAddWorkspace}
                disabled={isAddingWorkspace || !workspaceToken.trim()}
                className="flex-1 px-4 py-3 liquid-glass-button rounded-xl font-medium text-white flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
