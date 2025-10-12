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
  interests: string[]
  deliveryTimeHour: number
  deliveryTimeMinute: number
  lastDeliveryTimeUpdate?: string | null
  isAdmin?: boolean
}

const AVAILABLE_INTERESTS = [
  'AI', 'Technology', 'Startup', 'Business', 'Marketing',
  'Design', 'Programming', 'Science', 'Health', 'Finance',
  'Education', 'Entertainment', 'Sports', 'Music', 'Art'
]

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([])
  const [interests, setInterests] = useState<string[]>([])
  const [deliveryTimeHour, setDeliveryTimeHour] = useState(8)
  const [deliveryTimeMinute, setDeliveryTimeMinute] = useState(0)
  const [lastDeliveryTimeUpdate, setLastDeliveryTimeUpdate] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
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
        setInterests(data.settings.interests || [])
        setDeliveryTimeHour(data.settings.deliveryTimeHour ?? 8)
        setDeliveryTimeMinute(data.settings.deliveryTimeMinute ?? 0)
        setLastDeliveryTimeUpdate(data.settings.lastDeliveryTimeUpdate || null)
        setIsAdmin(data.settings.isAdmin || false)
      }
    } catch (error) {
      console.error('Error fetching user settings:', error)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const { data, error } = await apiPost('/api/user/settings', {
        selectedPlaylists,
        interests,
        deliveryTimeHour,
        deliveryTimeMinute
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

  const handleInterestToggle = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest))
    } else {
      if (interests.length < 5) {
        setInterests([...interests, interest])
      }
    }
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
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/')
    return null
  }

  return (
    <div className="h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-brand to-brand-light text-white p-4 flex-shrink-0 shadow-lg">
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

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {message && (
          <div className={`mb-4 p-4 rounded-xl font-medium text-sm ${
            message.includes('실패') || message.includes('오류') 
              ? 'bg-red-50 text-red-700 border-2 border-red-200' 
              : 'bg-primary-50 text-brand border-2 border-primary-200'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-6">
          {/* 관심사 설정 */}
          <div className="app-card p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              관심사 설정
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              최대 5개까지 선택할 수 있습니다. ({interests.length}/5 선택됨)
            </p>

            <div className="flex flex-wrap gap-2">
              {AVAILABLE_INTERESTS.map((interest) => {
                const isSelected = interests.includes(interest)
                return (
                  <button
                    key={interest}
                    onClick={() => handleInterestToggle(interest)}
                    disabled={!isSelected && interests.length >= 5}
                    className={`
                      px-4 py-2.5 rounded-xl font-medium text-sm
                      transition-all duration-200
                      ${isSelected
                        ? 'bg-gradient-to-r from-brand to-brand-light text-white shadow-md scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${!isSelected && interests.length >= 5
                        ? 'opacity-50 cursor-not-allowed'
                        : 'active:scale-95'
                      }
                    `}
                  >
                    {interest}
                  </button>
                )
              })}
            </div>
          </div>

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
                <span className="ml-2 font-bold text-brand">{selectedPlaylists.length}개</span>
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
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Loader2 className="h-8 w-8 animate-spin text-brand" />
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
                    <div key={playlist.id} className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200 hover:border-brand transition-colors">
                      <label htmlFor={playlist.id} className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          id={playlist.id}
                          checked={selectedPlaylists.includes(playlist.id)}
                          onChange={() => handlePlaylistToggle(playlist.id)}
                          className="mt-1 h-5 w-5 text-brand focus:ring-brand border-gray-300 rounded"
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

          {/* 팟캐스트 배달 시간 설정 */}
          <div className="app-card p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              팟캐스트 배달 시간
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              매일 자동으로 팟캐스트를 받을 시간을 설정하세요.
            </p>
            
            <div className="flex items-center space-x-3">
              <select
                value={deliveryTimeHour}
                onChange={(e) => setDeliveryTimeHour(Number(e.target.value))}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent font-medium"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i}시
                  </option>
                ))}
              </select>
              <select
                value={deliveryTimeMinute}
                onChange={(e) => setDeliveryTimeMinute(Number(e.target.value))}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent font-medium"
              >
                <option value={0}>0분</option>
                <option value={15}>15분</option>
                <option value={30}>30분</option>
                <option value={45}>45분</option>
              </select>
            </div>
            
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 설정한 시간 1시간 전에 자동으로 팟캐스트가 생성되며, 설정한 시간에 공개됩니다.
              </p>
            </div>
            
            {/* 배달 시간 수정 제한 안내 */}
            {!isAdmin && lastDeliveryTimeUpdate && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700">
                  ⚠️ 배달 시간은 하루에 한 번만 변경할 수 있습니다.
                  <br />
                  마지막 수정: {new Date(lastDeliveryTimeUpdate).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
            
            {isAdmin && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs text-purple-700">
                  👑 관리자는 배달 시간을 언제든지 변경할 수 있습니다.
                </p>
              </div>
            )}
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-brand to-brand-light hover:from-brand-dark hover:to-brand disabled:opacity-50 text-white px-6 py-4 rounded-xl font-bold transition-all app-button flex items-center justify-center space-x-2"
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

          {/* 로그아웃 */}
          <button
            onClick={() => signOut({ callbackUrl: '/welcome' })}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-4 rounded-xl font-bold transition-all app-button flex items-center justify-center space-x-2"
          >
            <LogOut className="h-5 w-5" />
            <span>로그아웃</span>
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
