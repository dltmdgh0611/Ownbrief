'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, CheckCircle, XCircle, AlertCircle, RefreshCw, Home, Database, Youtube, Mic2, Brain } from 'lucide-react'

interface HealthStatus {
  service: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  message: string
  responseTime?: number
  lastChecked?: string
}

interface LogEntry {
  timestamp: string
  level: 'info' | 'error' | 'warn'
  message: string
}

export default function DevModePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [healthStatuses, setHealthStatuses] = useState<HealthStatus[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

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
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Health check completed'
      }].slice(-50)) // Keep last 50 logs
    } catch (error) {
      console.error('Health check failed:', error)
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }].slice(-50))
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
      default:
        return 'text-gray-600'
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
