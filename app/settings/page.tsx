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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-4 mb-6">
              <Link
                href="/"
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>메인으로</span>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Settings className="h-8 w-8 mr-3 text-blue-600" />
                설정
              </h1>
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-md ${
                message.includes('실패') || message.includes('오류') 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {message}
              </div>
            )}

            <div className="space-y-8">
              {/* 플레이리스트 설정 */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  팟캐스트 소스 플레이리스트 선택
                </h2>
                <p className="text-gray-600 mb-4">
                  팟캐스트 생성 시 사용할 플레이리스트를 선택하세요. 선택된 플레이리스트의 동영상들이 분석됩니다.
                </p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={fetchPlaylists}
                      disabled={isLoading}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Settings className="h-4 w-4" />
                      )}
                      <span>플레이리스트 새로고침</span>
                    </button>
                    
                    <div className="text-sm text-gray-600">
                      선택된 플레이리스트: {selectedPlaylists.length}개
                    </div>
                  </div>
                  
                  <button
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>설정 저장</span>
                  </button>
                </div>

                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-gray-600">플레이리스트를 가져오는 중...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {playlists.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        플레이리스트가 없습니다. YouTube에서 플레이리스트를 먼저 생성해주세요.
                      </p>
                    ) : (
                      playlists.map((playlist) => (
                        <div key={playlist.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                          <input
                            type="checkbox"
                            id={playlist.id}
                            checked={selectedPlaylists.includes(playlist.id)}
                            onChange={() => handlePlaylistToggle(playlist.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={playlist.id} className="flex-1 cursor-pointer">
                            <div className="font-medium text-gray-900">{playlist.title}</div>
                            {playlist.description && (
                              <div className="text-sm text-gray-500">{playlist.description}</div>
                            )}
                            {playlist.itemCount !== undefined && (
                              <div className="text-xs text-gray-400">
                                {playlist.itemCount}개 동영상
                              </div>
                            )}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 계정 관리 */}
              <div className="border-t pt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  계정 관리
                </h2>
                
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-red-900">계정 삭제</h3>
                      <p className="text-sm text-red-700 mt-1">
                        계정과 모든 데이터를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                      </p>
                    </div>
                    <button
                      onClick={handleDeleteAccount}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>계정 삭제</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
