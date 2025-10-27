'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error'
  message: string
  data?: any
  duration?: number
}

export default function DevPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const tests = [
    {
      name: '서버 상태',
      endpoint: '/api/health',
      method: 'GET'
    },
    {
      name: 'Calendar API (직접)',
      endpoint: '/api/dev/test?type=calendar',
      method: 'GET'
    },
    {
      name: 'Gmail API (직접)',
      endpoint: '/api/dev/test?type=gmail',
      method: 'GET'
    },
    {
      name: 'Slack API (직접)',
      endpoint: '/api/dev/test?type=slack',
      method: 'GET'
    },
    {
      name: 'Notion API (직접)',
      endpoint: '/api/dev/test?type=notion',
      method: 'GET'
    },
    {
      name: 'Work 스크립트 (노션/슬랙)',
      endpoint: '/api/dev/test?type=work-script',
      method: 'GET'
    },
    {
      name: '사용자 세션',
      endpoint: '/api/dev/test?type=session',
      method: 'GET'
    },
    {
      name: '브리핑 Calendar',
      endpoint: '/api/briefing/next-section',
      method: 'POST',
      body: { sectionIndex: 0 }
    },
    {
      name: '브리핑 Gmail',
      endpoint: '/api/briefing/next-section',
      method: 'POST',
      body: { sectionIndex: 1 }
    },
    {
      name: '브리핑 Slack',
      endpoint: '/api/briefing/next-section',
      method: 'POST',
      body: { sectionIndex: 2 }
    },
    {
      name: 'TTS 생성',
      endpoint: '/api/tts/generate',
      method: 'POST',
      body: {
        text: '테스트 음성입니다.',
        voice: 'ko-KR-Standard-D',
        speed: 1.0
      }
    },
    {
      name: 'Interlude 음악',
      endpoint: '/api/music/interlude',
      method: 'GET'
    },
    {
      name: '트렌드 뉴스레터 생성',
      endpoint: '/api/dev/trend-newsletter',
      method: 'GET'
    }
  ]

  const runTest = async (test: typeof tests[0]) => {
    const startTime = Date.now()
    
    try {
      const response = await fetch(test.endpoint, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: test.body ? JSON.stringify(test.body) : undefined,
      })

      const duration = Date.now() - startTime
      const data = await response.json()

      return {
        name: test.name,
        status: (response.ok ? 'success' : 'error') as 'success' | 'error',
        message: response.ok ? '성공' : `오류: ${response.status}`,
        data: data,
        duration: duration
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      return {
        name: test.name,
        status: 'error' as const,
        message: `네트워크 오류: ${error.message}`,
        duration: duration
      }
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setResults([])

    for (const test of tests) {
      const result = await runTest(test)
      setResults(prev => [...prev, result])
      
      // 각 테스트 간 500ms 대기
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
  }

  const runSingleTest = async (test: typeof tests[0]) => {
    const result = await runTest(test)
    setResults(prev => {
      const filtered = prev.filter(r => r.name !== test.name)
      return [...filtered, result]
    })
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-50 border-blue-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">개발자 모드</h1>
              <p className="text-gray-600 mt-1">외부 API 연결 상태 및 기능 테스트</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={runAllTests}
                disabled={isRunning}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                <span>전체 테스트</span>
              </button>
              <button
                onClick={async () => {
                  setIsRunning(true)
                  try {
                    const response = await fetch('/api/dev/test?type=all')
                    const data = await response.json()
                    console.log('All APIs test result:', data)
                    alert(`전체 API 테스트 완료!\n성공: ${data.summary?.successful || 0}\n실패: ${data.summary?.failed || 0}`)
                  } catch (error) {
                    console.error('All APIs test error:', error)
                    alert('전체 API 테스트 실패')
                  } finally {
                    setIsRunning(false)
                  }
                }}
                disabled={isRunning}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                <span>API 직접 테스트</span>
              </button>
            </div>
          </div>
        </div>

        {/* 테스트 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {tests.map((test, index) => {
            const result = results.find(r => r.name === test.name)
            return (
              <div
                key={index}
                className={`bg-white rounded-lg border-2 p-4 ${result ? getStatusColor(result.status) : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {result ? getStatusIcon(result.status) : <div className="w-5 h-5" />}
                    <h3 className="font-semibold text-gray-900">{test.name}</h3>
                  </div>
                  <button
                    onClick={() => runSingleTest(test)}
                    disabled={isRunning}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
                  >
                    테스트
                  </button>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {test.method} {test.endpoint}
                  </code>
                </div>

                {result && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${
                        result.status === 'success' ? 'text-green-700' : 
                        result.status === 'error' ? 'text-red-700' : 'text-blue-700'
                      }`}>
                        {result.message}
                      </span>
                      {result.duration && (
                        <span className="text-gray-500">{result.duration}ms</span>
                      )}
                    </div>
                    
                    {result.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                          응답 데이터 보기
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 환경 변수 상태 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">환경 변수 상태</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'GOOGLE_CLIENT_ID',
              'GOOGLE_CLIENT_SECRET',
              'SLACK_CLIENT_ID',
              'SLACK_CLIENT_SECRET',
              'GEMINI_API_KEY',
              'YOUTUBE_API_KEY',
              'OPENAI_API_KEY',
              'ELEVENLABS_API_KEY',
              'NEXTAUTH_URL',
              'NEXTAUTH_SECRET'
            ].map((envVar) => (
              <div key={envVar} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-mono text-sm">{envVar}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  process.env[envVar] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {process.env[envVar] ? '설정됨' : '미설정'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Slack & Notion 전용 테스트 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Slack & Notion 전용 테스트</h2>
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900 mb-2">Slack 멘션 테스트</h3>
              <p className="text-sm text-purple-700 mb-3">
                Slack에서 사용자를 멘션한 메시지를 가져와서 읽지 않은 상태를 확인합니다.
              </p>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/dev/test?type=slack')
                    const data = await response.json()
                    console.log('Slack test result:', data)
                    
                    if (data.success) {
                      alert(`Slack 테스트 성공!\n멘션 수: ${data.data?.mentionCount || 0}\n채널: ${data.data?.channels?.join(', ') || '없음'}`)
                    } else {
                      alert(`Slack 테스트 실패: ${data.error}`)
                    }
                  } catch (error) {
                    console.error('Slack test error:', error)
                    alert('Slack 테스트 실패')
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Slack 멘션 테스트 실행
              </button>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Slack 연결 상태 확인</h3>
              <p className="text-sm text-blue-700 mb-3">
                현재 사용자의 Slack 연결 상태와 토큰 정보를 확인합니다.
              </p>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/user/settings')
                    const data = await response.json()
                    console.log('User settings:', data)
                    
                    const slackConnected = data.settings?.connectedServices?.find((s: any) => s.serviceName === 'slack')
                    if (slackConnected) {
                      alert(`Slack 연결됨!\n연결 시간: ${new Date(slackConnected.createdAt).toLocaleString()}`)
                    } else {
                      alert('Slack이 연결되지 않았습니다.')
                    }
                  } catch (error) {
                    console.error('Connection check error:', error)
                    alert('연결 상태 확인 실패')
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                연결 상태 확인
              </button>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Private 채널 테스트</h3>
              <p className="text-sm text-green-700 mb-3">
                Private 채널에서 멘션된 메시지를 가져올 수 있는지 테스트합니다. 터미널에서 상세 로그를 확인하세요.
              </p>
              <button
                onClick={async () => {
                  try {
                    console.log('🧪 Private 채널 테스트 시작...')
                    const response = await fetch('/api/dev/test?type=slack')
                    const data = await response.json()
                    console.log('Private 채널 테스트 결과:', data)
                    
                    if (data.success) {
                      const privateChannels = data.data?.mentions?.filter((m: any) => m.channel?.startsWith('G')) || []
                      alert(`Slack 테스트 완료!\n전체 멘션: ${data.data?.mentionCount || 0}\nPrivate 채널 멘션: ${privateChannels.length}\n채널 목록: ${data.data?.channels?.join(', ') || '없음'}`)
                    } else {
                      alert(`Slack 테스트 실패: ${data.error}`)
                    }
                  } catch (error) {
                    console.error('Private 채널 테스트 오류:', error)
                    alert('Private 채널 테스트 실패')
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Private 채널 테스트 실행
              </button>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <h3 className="font-medium text-orange-900 mb-2">채널 목록 디버깅</h3>
              <p className="text-sm text-orange-700 mb-3">
                모든 채널 목록을 가져와서 Private 채널이 포함되어 있는지 확인합니다.
              </p>
              <button
                onClick={async () => {
                  try {
                    console.log('🔍 채널 목록 디버깅 시작...')
                    const response = await fetch('/api/dev/test?type=slack')
                    const data = await response.json()
                    console.log('채널 목록 디버깅 결과:', data)
                    
                    // 터미널 로그에서 확인할 수 있도록 안내
                    alert(`채널 목록 디버깅 완료!\n터미널에서 다음 로그들을 확인하세요:\n- 📋 전체 채널 상세 정보\n- 🔒 Private 채널 수\n- 🔍 방법 1, 2, 3 시도 결과`)
                  } catch (error) {
                    console.error('채널 목록 디버깅 오류:', error)
                    alert('채널 목록 디버깅 실패')
                  }
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                채널 목록 디버깅 실행
              </button>
            </div>

            {/* Notion 테스트 버튼 */}
            <div className="p-4 bg-purple-50 rounded-lg mt-4">
              <h3 className="font-medium text-purple-900 mb-2">Notion 페이지 테스트</h3>
              <p className="text-sm text-purple-700 mb-3">
                최근 24시간 이내 사용자가 태그되거나 수정한 Notion 페이지를 조회합니다. 터미널에서 상세 로그를 확인하세요.
              </p>
              <button
                onClick={async () => {
                  try {
                    console.log('🧪 Notion 테스트 시작...')
                    const response = await fetch('/api/dev/test?type=notion')
                    const data = await response.json()
                    console.log('Notion 테스트 결과:', data)
                    
                    if (data.success) {
                      const pageList = data.data?.pages?.map((p: any, idx: number) => 
                        `${idx + 1}. ${p.title}\n   ${p.timeAgo} | ${p.workspace}`
                      ).join('\n\n') || '없음'
                      
                      alert(`Notion 테스트 성공!\n\n페이지 수: ${data.data?.pageCount || 0}\n\n페이지 목록:\n${pageList}`)
                    } else {
                      alert(`Notion 테스트 실패: ${data.error}\n\n컨솔 로그를 확인하세요.`)
                    }
                  } catch (error) {
                    console.error('Notion test error:', error)
                    alert('Notion 테스트 실패')
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Notion 페이지 테스트 실행
              </button>
            </div>
          </div>
        </div>

        {/* 브리핑 테스트 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">브리핑 테스트</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">실시간 브리핑 테스트</h3>
              <p className="text-sm text-blue-700 mb-3">
                실제 브리핑 플레이어를 테스트하려면 메인 페이지로 이동하세요.
              </p>
              <a
                href="/"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                메인 페이지로 이동
              </a>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-2">데이터베이스 확인</h3>
              <p className="text-sm text-yellow-700 mb-3">
                Prisma Studio로 데이터베이스 상태를 확인할 수 있습니다.
              </p>
              <code className="block bg-yellow-100 p-2 rounded text-sm">
                yarn db:studio
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
