'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, CheckCircle, XCircle, AlertCircle, RefreshCw, Home, Database, Youtube, Mic2, Brain, Play, Loader2 } from 'lucide-react'

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
  const [testResults, setTestResults] = useState<{[key: string]: TestResult}>({})

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

        {/* Test Tools */}
        <div className="mt-6 bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Play className="h-6 w-6 text-purple-400" />
            <span>Component Tests</span>
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
    </div>
  )
}
