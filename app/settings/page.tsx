'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings, LogOut, Trash2, Save, Loader2, Home, ArrowLeft } from 'lucide-react'
import { apiGet, apiPost, apiDelete } from '@/backend/lib/api-client'

interface Playlist {
  id: string
  title: string
  description: string
  itemCount?: number
}

interface UserSettings {
  selectedPlaylists: string[]
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPlaylists()
      fetchUserSettings()
    }
  }, [status])

  const fetchPlaylists = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await apiGet<{ playlists: Playlist[] }>('/api/youtube/playlists')
      
      if (data) {
        setPlaylists(data.playlists || [])
      } else if (error) {
        setMessage(`플레이리스트 가져오기 실패: ${error}`)
      }
    } catch (error) {
      console.error('Error fetching playlists:', error)
      setMessage('플레이리스트를 가져오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserSettings = async () => {
    try {
      const { data } = await apiGet<{ settings: UserSettings }>('/api/user/settings')
      
      if (data?.settings) {
        setSelectedPlaylists(data.settings.selectedPlaylists || [])
      }
    } catch (error) {
      console.error('Error fetching user settings:', error)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const { data, error } = await apiPost('/api/user/settings', {
        selectedPlaylists
      })
      
      if (data) {
        setMessage('✅ 설정이 저장되었습니다! 이제 팟캐스트를 생성할 수 있습니다.')
        // 저장 후 잠시 후에 메시지 초기화
        setTimeout(() => {
          setMessage('')
        }, 3000)
      } else if (error) {
        setMessage(`❌ 설정 저장 실패: ${error}`)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('설정 저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePlaylistToggle = (playlistId: string) => {
    setSelectedPlaylists(prev => 
      prev.includes(playlistId) 
        ? prev.filter(id => id !== playlistId)
        : [...prev, playlistId]
    )
  }

  const handleDeleteAccount = async () => {
    if (!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    try {
      const { data, error } = await apiDelete('/api/user/delete')

      if (data) {
        await signOut({ callbackUrl: '/' })
      } else if (error) {
        setMessage(`계정 삭제 실패: ${error}`)
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      setMessage('계정 삭제에 실패했습니다.')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">설정</h1>
              <p className="text-xs text-white/80">앱 설정 관리</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {message && (
          <div className={`mb-4 p-4 rounded-xl font-medium text-sm ${
            message.includes('실패') || message.includes('오류') 
              ? 'bg-red-50 text-red-700 border-2 border-red-200' 
              : 'bg-green-50 text-green-700 border-2 border-green-200'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-6">
          {/* 플레이리스트 설정 */}
          <div className="app-card p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              플레이리스트 선택
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              팟캐스트 생성에 사용할 플레이리스트를 선택하세요.
            </p>
            
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <div className="text-sm">
                <span className="text-gray-600">선택된 플레이리스트</span>
                <span className="ml-2 font-bold text-emerald-600">{selectedPlaylists.length}개</span>
              </div>
              
              <button
                onClick={fetchPlaylists}
                disabled={isLoading}
                className="flex items-center space-x-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 font-medium"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
                <span>새로고침</span>
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
                <p className="text-sm text-gray-600">플레이리스트를 가져오는 중...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {playlists.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">
                      플레이리스트가 없습니다.
                      <br />
                      YouTube에서 플레이리스트를 먼저 생성해주세요.
                    </p>
                  </div>
                ) : (
                  playlists.map((playlist) => (
                    <div key={playlist.id} className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-300 transition-colors">
                      <label htmlFor={playlist.id} className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          id={playlist.id}
                          checked={selectedPlaylists.includes(playlist.id)}
                          onChange={() => handlePlaylistToggle(playlist.id)}
                          className="mt-1 h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 mb-1">{playlist.title}</div>
                          {playlist.description && (
                            <div className="text-sm text-gray-600 mb-2 line-clamp-2">{playlist.description}</div>
                          )}
                          {playlist.itemCount !== undefined && (
                            <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full inline-block">
                              📹 {playlist.itemCount}개 동영상
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white px-6 py-4 rounded-xl font-bold transition-all app-button flex items-center justify-center space-x-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>설정 저장하기</span>
              </>
            )}
          </button>

          {/* 계정 관리 */}
          <div className="app-card p-5 border-2 border-red-200">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center space-x-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <span>계정 관리</span>
            </h2>
            
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <h3 className="font-bold text-red-900 mb-2">⚠️ 계정 삭제</h3>
              <p className="text-sm text-red-700 mb-4 leading-relaxed">
                계정과 모든 데이터를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <button
                onClick={handleDeleteAccount}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-bold transition-all app-button flex items-center justify-center space-x-2"
              >
                <Trash2 className="h-5 w-5" />
                <span>계정 삭제</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
