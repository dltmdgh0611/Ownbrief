'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, CheckCircle, XCircle, AlertCircle, RefreshCw, Home, Database, Youtube, Mic2, Brain, Play, Loader2, Zap, Link2, Music } from 'lucide-react'
import ConnectorsDemo from '@/frontend/components/ConnectorsDemo'
import LyricsPlayerDemo from '@/frontend/components/LyricsPlayerDemo'

interface HealthStatus {
  service: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  message: string
  responseTime?: number
  lastChecked?: string
}

interface LogEntry {
  timestamp: string
  level: 'info' | 'error' | 'warn' | 'success'
  message: string
}

interface TestResult {
  success: boolean
  data?: any
  error?: string
}

export default function DevModePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [healthStatuses, setHealthStatuses] = useState<HealthStatus[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Test states
  const [testVideoUrl, setTestVideoUrl] = useState('https://www.youtube.com/watch?v=')
  const [testScript, setTestScript] = useState('호스트: 안녕하세요! 오늘은 AI 기술에 대해 이야기해볼까요?\n\n게스트: 네, 좋습니다! 최근 AI 발전이 정말 놀랍죠.')
  const [testTranscript, setTestTranscript] = useState('이것은 테스트용 자막 텍스트입니다.')
  const [isTestingApify, setIsTestingApify] = useState(false)
  const [isTestingTts, setIsTestingTts] = useState(false)
  const [isTestingScript, setIsTestingScript] = useState(false)
  const [isTestingPodcastUpload, setIsTestingPodcastUpload] = useState(false)
  const [isTestingSupabaseUpload, setIsTestingSupabaseUpload] = useState(false)
  const [testPodcastUrl, setTestPodcastUrl] = useState('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3')
  const [testPodcastTitle, setTestPodcastTitle] = useState('테스트 팟캐스트')
  const [testResults, setTestResults] = useState<{[key: string]: TestResult}>({})
  const [isTestingAutoGenerate, setIsTestingAutoGenerate] = useState(false)
  const [autoGenerateLogs, setAutoGenerateLogs] = useState<string[]>([])
  const [showConnectorsDemo, setShowConnectorsDemo] = useState(false)
  const [showLyricsPlayerDemo, setShowLyricsPlayerDemo] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      checkHealth()
      // Auto-refresh every 30 seconds
      const interval = setInterval(checkHealth, 30000)
      return () => clearInterval(interval)
    }
  }, [status])

  const checkHealth = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealthStatuses(data.statuses || [])
      const newLog: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Health check completed'
      }
      setLogs(prev => [...prev, newLog].slice(-50))
    } catch (error) {
      console.error('Health check failed:', error)
      const errorLog: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
      setLogs(prev => [...prev, errorLog].slice(-50))
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'unhealthy':
        return <XCircle className="h-6 w-6 text-red-500" />
      default:
        return <AlertCircle className="h-6 w-6 text-yellow-500" />
    }
  }

  const getServiceIcon = (service: string) => {
    if (service.includes('Database')) return <Database className="h-5 w-5" />
    if (service.includes('YouTube')) return <Youtube className="h-5 w-5" />
    if (service.includes('Gemini')) return <Brain className="h-5 w-5" />
    if (service.includes('TTS')) return <Mic2 className="h-5 w-5" />
    return <Activity className="h-5 w-5" />
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600'
      case 'warn':
        return 'text-yellow-600'
      case 'success':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const addLog = (level: 'info' | 'error' | 'warn' | 'success', message: string) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      level,
      message
    }].slice(-50))
  }

  const testApify = async () => {
    setIsTestingApify(true)
    addLog('info', `Testing Apify with URL: ${testVideoUrl}`)
    
    try {
      const response = await fetch('/api/dev/test-apify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: testVideoUrl })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestResults(prev => ({ ...prev, apify: { success: true, data } }))
        addLog('success', `Apify test successful: ${data.segmentCount} segments in ${data.duration}ms`)
      } else {
        setTestResults(prev => ({ ...prev, apify: { success: false, error: data.error } }))
        addLog('error', `Apify test failed: ${data.error}`)
      }
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, apify: { success: false, error: error.message } }))
      addLog('error', `Apify test error: ${error.message}`)
    } finally {
      setIsTestingApify(false)
    }
  }

  const testScriptGeneration = async () => {
    setIsTestingScript(true)
    addLog('info', `Testing script generation with ${testTranscript.length} characters`)
    
    try {
      const response = await fetch('/api/dev/test-script-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptText: testTranscript })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestResults(prev => ({ ...prev, script: { success: true, data } }))
        setTestScript(data.fullScript) // Update script for TTS test
        addLog('success', `Script generation successful: ${data.scriptLength} characters in ${data.duration}ms`)
      } else {
        setTestResults(prev => ({ ...prev, script: { success: false, error: data.error } }))
        addLog('error', `Script generation failed: ${data.error}`)
      }
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, script: { success: false, error: error.message } }))
      addLog('error', `Script generation error: ${error.message}`)
    } finally {
      setIsTestingScript(false)
    }
  }

  const testTts = async () => {
    setIsTestingTts(true)
    addLog('info', `Testing TTS with ${testScript.length} characters`)
    
    try {
      const response = await fetch('/api/dev/test-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: testScript })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestResults(prev => ({ ...prev, tts: { success: true, data } }))
        addLog('success', `TTS test successful: ${data.bufferSize} bytes (${data.mimeType}) - 소요 시간: ${data.processingTime}초`)
      } else {
        setTestResults(prev => ({ ...prev, tts: { success: false, error: data.error } }))
        addLog('error', `TTS test failed: ${data.error} - 소요 시간: ${data.processingTime || '?'}초`)
      }
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, tts: { success: false, error: error.message } }))
      addLog('error', `TTS test error: ${error.message}`)
    } finally {
      setIsTestingTts(false)
    }
  }

  const testPodcastUpload = async () => {
    setIsTestingPodcastUpload(true)
    addLog('info', `Testing podcast upload: ${testPodcastTitle}`)
    
    try {
      const response = await fetch('/api/dev/test-podcast-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audioUrl: testPodcastUrl,
          title: testPodcastTitle,
          description: '개발자 모드 테스트 팟캐스트',
          duration: 180
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestResults(prev => ({ ...prev, podcastUpload: { success: true, data } }))
        addLog('success', `Podcast upload successful: ${data.podcast.id}`)
      } else {
        setTestResults(prev => ({ ...prev, podcastUpload: { success: false, error: data.error } }))
        addLog('error', `Podcast upload failed: ${data.error}`)
      }
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, podcastUpload: { success: false, error: error.message } }))
      addLog('error', `Podcast upload error: ${error.message}`)
    } finally {
      setIsTestingPodcastUpload(false)
    }
  }

  const testSupabaseUpload = async () => {
    setIsTestingSupabaseUpload(true)
    addLog('info', 'Testing Supabase Storage upload (실제 파일 업로드)')
    
    try {
      const response = await fetch('/api/dev/test-supabase-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestResults(prev => ({ ...prev, supabaseUpload: { success: true, data } }))
        addLog('success', `Supabase upload successful: ${data.fileName} (${(data.fileSize / 1024).toFixed(2)}KB)`)
      } else {
        setTestResults(prev => ({ ...prev, supabaseUpload: { success: false, error: data.error } }))
        addLog('error', `Supabase upload failed: ${data.error}`)
      }
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, supabaseUpload: { success: false, error: error.message } }))
      addLog('error', `Supabase upload error: ${error.message}`)
    } finally {
      setIsTestingSupabaseUpload(false)
    }
  }

  const testAutoGenerate = async () => {
    setIsTestingAutoGenerate(true)
    setAutoGenerateLogs([])
    addLog('info', '🚀 자동 팟캐스트 생성 테스트 시작 (1분 후 공개 예정)')
    
    try {
      const response = await fetch('/api/dev/test-auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestResults(prev => ({ ...prev, autoGenerate: { success: true, data } }))
        setAutoGenerateLogs(data.logs || [])
        addLog('success', `✅ 자동 생성 완료! 팟캐스트 ID: ${data.podcastId}`)
        addLog('success', `⏰ 공개 시간: ${new Date(data.publishedAt).toLocaleString('ko-KR')}`)
        addLog('success', `💰 남은 크레딧: ${data.remainingCredits}개`)
        
        // 페이지 새로고침하여 팟캐스트 목록에 표시
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setTestResults(prev => ({ ...prev, autoGenerate: { success: false, error: data.error } }))
        setAutoGenerateLogs(data.logs || [])
        addLog('error', `❌ 자동 생성 실패: ${data.error}`)
      }
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, autoGenerate: { success: false, error: error.message } }))
      addLog('error', `❌ 자동 생성 오류: ${error.message}`)
    } finally {
      setIsTestingAutoGenerate(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold">Developer Mode</h1>
                <p className="text-sm text-gray-400">System Health & Monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={checkHealth}
                disabled={isRefreshing}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-md transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <Link
                href="/"
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Health Status */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Activity className="h-6 w-6 text-blue-400" />
              <span>API Health Status</span>
            </h2>
            <div className="space-y-3">
              {healthStatuses.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Click refresh to check API health
                </div>
              ) : (
                healthStatuses.map((status, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {getServiceIcon(status.service)}
                      <div>
                        <div className="font-medium">{status.service}</div>
                        <div className="text-sm text-gray-400">{status.message}</div>
                        {status.lastChecked && (
                          <div className="text-xs text-gray-500 mt-1">
                            Last checked: {new Date(status.lastChecked).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {status.responseTime && (
                        <span className="text-sm text-gray-400">
                          {status.responseTime}ms
                        </span>
                      )}
                      {getStatusIcon(status.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Info */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">System Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">Environment</div>
                  <div className="text-xl font-bold">
                    {process.env.NODE_ENV || 'development'}
                  </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">Session Status</div>
                  <div className="text-xl font-bold">{status}</div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">User Email</div>
                  <div className="text-sm font-medium truncate">
                    {session?.user?.email || 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">Last Check</div>
                  <div className="text-sm font-medium">
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">API Endpoints</div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>/api/health</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>/api/podcast</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>/api/youtube/playlists</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400">✓</span>
                    <span>/api/user/settings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Demo UI Section */}
        <div className="mt-6 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-lg shadow-lg p-6 border-2 border-indigo-500">
          <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
            <Music className="h-8 w-8 text-indigo-400" />
            <span>🎨 Demo UI 보기</span>
          </h2>
          
          <p className="text-gray-200 mb-6">
            보여주기용 UI 컴포넌트를 확인해보세요. 실제 기능은 구현되어 있지 않습니다.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setShowConnectorsDemo(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-lg font-bold text-lg flex items-center justify-center space-x-3 shadow-xl transform transition-all hover:scale-105"
            >
              <Link2 className="h-6 w-6" />
              <span>앱 연결 UI</span>
            </button>
            
            <button
              onClick={() => setShowLyricsPlayerDemo(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-4 rounded-lg font-bold text-lg flex items-center justify-center space-x-3 shadow-xl transform transition-all hover:scale-105"
            >
              <Music className="h-6 w-6" />
              <span>팟캐스트 플레이어 UI</span>
            </button>
          </div>
        </div>

        {/* Auto-Generate Test */}
        <div className="mt-6 bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg shadow-lg p-6 border-2 border-purple-500">
          <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
            <Zap className="h-8 w-8 text-yellow-400" />
            <span>🚀 자동 팟캐스트 생성 테스트</span>
          </h2>
          
          <p className="text-gray-200 mb-4">
            실제 자동 생성 프로세스를 테스트합니다. 유튜브 영상 → 자막 추출 → 스크립트 생성 → 음성 생성까지 모든 과정이 실행됩니다. 
            생성된 팟캐스트는 <strong className="text-yellow-300">1분 후 공개</strong>되도록 설정됩니다.
          </p>
          
          <button
            onClick={testAutoGenerate}
            disabled={isTestingAutoGenerate}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-4 rounded-lg font-bold text-lg flex items-center justify-center space-x-3 shadow-xl transform transition-all hover:scale-105 disabled:scale-100"
          >
            {isTestingAutoGenerate ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>자동 생성 중... (몇 분 소요됩니다)</span>
              </>
            ) : (
              <>
                <Zap className="h-6 w-6" />
                <span>자동 팟캐스트 생성 시작</span>
              </>
            )}
          </button>
          
          {/* Auto-Generate Logs */}
          {autoGenerateLogs.length > 0 && (
            <div className="mt-4 bg-black/50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <h3 className="text-sm font-bold text-yellow-400 mb-2">실시간 로그:</h3>
              <div className="space-y-1 font-mono text-xs">
                {autoGenerateLogs.map((log, index) => (
                  <div key={index} className="text-gray-300">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {testResults.autoGenerate && (
            <div className={`mt-4 p-4 rounded-lg ${testResults.autoGenerate.success ? 'bg-green-900/50 text-green-200 border-2 border-green-500' : 'bg-red-900/50 text-red-200 border-2 border-red-500'}`}>
              {testResults.autoGenerate.success ? (
                <div>
                  <div className="font-bold text-xl mb-2">✅ 자동 생성 성공!</div>
                  <div className="space-y-1">
                    <div>📍 팟캐스트 ID: <code className="bg-black/30 px-2 py-1 rounded">{testResults.autoGenerate.data.podcastId}</code></div>
                    <div>⏰ 공개 시간: {new Date(testResults.autoGenerate.data.publishedAt).toLocaleString('ko-KR')}</div>
                    <div>💰 남은 크레딧: {testResults.autoGenerate.data.remainingCredits}개</div>
                    <div className="mt-3 p-3 bg-yellow-500/20 rounded border border-yellow-500">
                      <strong>🎉 2초 후 홈 페이지로 이동하여 팟캐스트를 확인하세요!</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-bold text-xl mb-2">❌ 자동 생성 실패</div>
                  <div className="text-sm">{testResults.autoGenerate.error}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Tools */}
        <div className="mt-6 bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Play className="h-6 w-6 text-purple-400" />
            <span>Component Tests</span>
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Apify Test */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Youtube className="h-5 w-5 text-red-400" />
                <h3 className="font-bold">1. Apify 자막 추출</h3>
              </div>
              
              <input
                type="text"
                value={testVideoUrl}
                onChange={(e) => setTestVideoUrl(e.target.value)}
                placeholder="YouTube URL or Video ID"
                className="w-full bg-gray-600 text-white px-3 py-2 rounded mb-3 text-sm"
              />
              
              <button
                onClick={testApify}
                disabled={isTestingApify}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded flex items-center justify-center space-x-2"
              >
                {isTestingApify ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Test Apify</span>
                  </>
                )}
              </button>
              
              {testResults.apify && (
                <div className={`mt-3 p-3 rounded text-sm ${testResults.apify.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                  {testResults.apify.success ? (
                    <div>
                      <div className="font-bold mb-1">✓ 성공</div>
                      <div>세그먼트: {testResults.apify.data.segmentCount}개</div>
                      <div>소요시간: {testResults.apify.data.duration}ms</div>
                      {testResults.apify.data.fullText && (
                        <div className="mt-2 text-xs opacity-75">
                          미리보기: {testResults.apify.data.fullText}...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold mb-1">✗ 실패</div>
                      <div className="text-xs">{testResults.apify.error}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Script Generation Test */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Brain className="h-5 w-5 text-purple-400" />
                <h3 className="font-bold">2. 스크립트 생성</h3>
              </div>
              
              <textarea
                value={testTranscript}
                onChange={(e) => setTestTranscript(e.target.value)}
                placeholder="자막 텍스트 입력"
                className="w-full bg-gray-600 text-white px-3 py-2 rounded mb-3 text-sm h-20 resize-none"
              />
              
              <button
                onClick={testScriptGeneration}
                disabled={isTestingScript}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded flex items-center justify-center space-x-2"
              >
                {isTestingScript ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Test Script Gen</span>
                  </>
                )}
              </button>
              
              {testResults.script && (
                <div className={`mt-3 p-3 rounded text-sm ${testResults.script.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                  {testResults.script.success ? (
                    <div>
                      <div className="font-bold mb-1">✓ 성공</div>
                      <div>길이: {testResults.script.data.scriptLength}자</div>
                      <div>소요시간: {testResults.script.data.duration}ms</div>
                      {testResults.script.data.script && (
                        <div className="mt-2 text-xs opacity-75">
                          미리보기: {testResults.script.data.script}...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold mb-1">✗ 실패</div>
                      <div className="text-xs">{testResults.script.error}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TTS Test */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Mic2 className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold">3. TTS 음성 생성</h3>
              </div>
              
              <textarea
                value={testScript}
                onChange={(e) => setTestScript(e.target.value)}
                placeholder="스크립트 입력"
                className="w-full bg-gray-600 text-white px-3 py-2 rounded mb-3 text-sm h-20 resize-none"
              />
              
              <button
                onClick={testTts}
                disabled={isTestingTts}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded flex items-center justify-center space-x-2"
              >
                {isTestingTts ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Test TTS</span>
                  </>
                )}
              </button>
              
              {testResults.tts && (
                <div className={`mt-3 p-3 rounded text-sm ${testResults.tts.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                  {testResults.tts.success ? (
                    <div>
                      <div className="font-bold mb-1">✓ 성공</div>
                      <div>크기: {(testResults.tts.data.bufferSize / 1024).toFixed(1)}KB</div>
                      <div>형식: {testResults.tts.data.mimeType}</div>
                      <div className="text-yellow-300 font-semibold">⏱️ 소요시간: {testResults.tts.data.processingTime}초 ({(parseFloat(testResults.tts.data.processingTime) / 60).toFixed(2)}분)</div>
                      {testResults.tts.data.audioUrl && (
                        <audio controls className="w-full mt-2">
                          <source src={testResults.tts.data.audioUrl} type={testResults.tts.data.mimeType} />
                        </audio>
                      )}
                      <div className="mt-2 text-xs opacity-75">
                        헤더: {testResults.tts.data.bufferHeader}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold mb-1">✗ 실패</div>
                      <div className="text-xs">{testResults.tts.error}</div>
                      {testResults.tts.data?.processingTime && (
                        <div className="text-xs mt-1">소요시간: {testResults.tts.data.processingTime}초</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Supabase Storage Test */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Database className="h-5 w-5 text-yellow-400" />
                <h3 className="font-bold">4. Supabase Storage</h3>
              </div>
              
              <div className="text-xs text-gray-400 mb-3">
                실제 오디오 파일을 Supabase에 업로드하여<br/>
                bucket not found 에러를 테스트합니다.
              </div>
              
              <button
                onClick={testSupabaseUpload}
                disabled={isTestingSupabaseUpload}
                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white px-4 py-2 rounded flex items-center justify-center space-x-2"
              >
                {isTestingSupabaseUpload ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    <span>Storage 업로드</span>
                  </>
                )}
              </button>
              
              {testResults.supabaseUpload && (
                <div className={`mt-3 p-3 rounded text-sm ${testResults.supabaseUpload.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                  {testResults.supabaseUpload.success ? (
                    <div>
                      <div className="font-bold mb-1">✓ 업로드 성공</div>
                      <div>파일: {testResults.supabaseUpload.data.fileName}</div>
                      <div>크기: {(testResults.supabaseUpload.data.fileSize / 1024).toFixed(2)}KB</div>
                      <div className="mt-2 text-xs break-all">
                        URL: {testResults.supabaseUpload.data.publicUrl}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold mb-1">✗ 업로드 실패</div>
                      <div className="text-xs font-bold text-red-400">
                        {testResults.supabaseUpload.error}
                      </div>
                      {testResults.supabaseUpload.data?.details && (
                        <div className="text-xs mt-2 opacity-75">
                          {JSON.stringify(testResults.supabaseUpload.data.details, null, 2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Podcast Upload Test */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Database className="h-5 w-5 text-green-400" />
                <h3 className="font-bold">5. Podcast DB 업로드</h3>
              </div>
              
              <input
                type="text"
                value={testPodcastTitle}
                onChange={(e) => setTestPodcastTitle(e.target.value)}
                placeholder="팟캐스트 제목"
                className="w-full bg-gray-600 text-white px-3 py-2 rounded mb-2 text-sm"
              />

              <input
                type="text"
                value={testPodcastUrl}
                onChange={(e) => setTestPodcastUrl(e.target.value)}
                placeholder="MP3 URL (또는 비워두면 기본 샘플)"
                className="w-full bg-gray-600 text-white px-3 py-2 rounded mb-3 text-sm"
              />
              
              <button
                onClick={testPodcastUpload}
                disabled={isTestingPodcastUpload}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded flex items-center justify-center space-x-2"
              >
                {isTestingPodcastUpload ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    <span>DB에 업로드</span>
                  </>
                )}
              </button>
              
              {testResults.podcastUpload && (
                <div className={`mt-3 p-3 rounded text-sm ${testResults.podcastUpload.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                  {testResults.podcastUpload.success ? (
                    <div>
                      <div className="font-bold mb-1">✓ DB 저장 성공</div>
                      <div>ID: {testResults.podcastUpload.data.podcast.id}</div>
                      <div>제목: {testResults.podcastUpload.data.podcast.title}</div>
                      <div>상태: {testResults.podcastUpload.data.podcast.status}</div>
                      {testResults.podcastUpload.data.podcast.audioUrl && (
                        <div className="mt-2">
                          <audio controls className="w-full">
                            <source src={testResults.podcastUpload.data.podcast.audioUrl} type="audio/mpeg" />
                          </audio>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold mb-1">✗ 실패</div>
                      <div className="text-xs">{testResults.podcastUpload.error}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="mt-6 bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Activity Logs</h2>
          <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-gray-500 whitespace-nowrap">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className={`font-bold ${getLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-gray-300">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demo 모달들 */}
      <ConnectorsDemo 
        isOpen={showConnectorsDemo} 
        onClose={() => setShowConnectorsDemo(false)} 
      />
      <LyricsPlayerDemo 
        isOpen={showLyricsPlayerDemo} 
        onClose={() => setShowLyricsPlayerDemo(false)} 
      />
    </div>
  )
}
