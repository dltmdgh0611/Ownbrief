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
