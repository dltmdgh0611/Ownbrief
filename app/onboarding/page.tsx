'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, ChevronRight, Check, Play, List, Mic2, Clock } from 'lucide-react';

const AVAILABLE_INTERESTS = [
  'AI', 'Technology', 'Startup', 'Business', 'Marketing',
  'Design', 'Programming', 'Science', 'Health', 'Finance',
  'Education', 'Entertainment', 'Sports', 'Music', 'Art'
];

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistSelectionType, setPlaylistSelectionType] = useState<'existing' | 'new' | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [deliveryTimeHour, setDeliveryTimeHour] = useState(8);
  const [deliveryTimeMinute, setDeliveryTimeMinute] = useState(0);
  const [referralCode, setReferralCode] = useState('');

  // 세션이 없으면 홈으로
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // 플레이리스트 가져오기 (Step 2에서)
  useEffect(() => {
    if (step === 2 && session?.accessToken) {
      fetchPlaylists();
    }
  }, [step, session]);

  const fetchPlaylists = async () => {
    try {
      setLoadingPlaylists(true);
      const response = await fetch('/api/youtube/playlists');
      
      if (!response.ok) {
        throw new Error('플레이리스트를 가져올 수 없습니다');
      }

      const data = await response.json();
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error('플레이리스트 로드 실패:', error);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleInterestToggle = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      if (interests.length < 5) {
        setInterests([...interests, interest]);
      }
    }
  };

  const handlePlaylistToggle = (playlistId: string) => {
    if (selectedPlaylists.includes(playlistId)) {
      setSelectedPlaylists(selectedPlaylists.filter(id => id !== playlistId));
    } else {
      setSelectedPlaylists([...selectedPlaylists, playlistId]);
    }
  };

  const handleNext = () => {
    if (step === 1 && interests.length > 0) {
      setStep(2);
    }
  };

  const handleBack = async () => {
    if (step === 1) {
      // 키워드 선택 단계에서 뒤로가기 - 로그아웃 처리
      try {
        await signOut({ callbackUrl: '/welcome' });
      } catch (error) {
        console.error('로그아웃 실패:', error);
        router.push('/welcome');
      }
    } else if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      setStep(2);
    } else if (step === 5) {
      // 시간 입력 단계에서 뒤로가기 - 플레이리스트 선택 단계로
      setStep(2);
    } else if (step === 6) {
      // 추천인 코드 입력 단계에서 뒤로가기 - 시간 입력 단계로
      setStep(5);
    } else if (step === 7) {
      // 최종 확인 단계에서 뒤로가기 - 추천인 코드 입력 단계로
      setStep(6);
    }
  };

  const createPlaylist = async (name: string) => {
    try {
      setCreatingPlaylist(true);
      const response = await fetch('/api/youtube/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || '플레이리스트 생성에 실패했습니다';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.playlist;
    } catch (error) {
      console.error('플레이리스트 생성 실패:', error);
      throw error;
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const handlePlaylistSelectionType = (type: 'existing' | 'new') => {
    setPlaylistSelectionType(type);
    if (type === 'existing') {
      setStep(3);
    } else {
      setStep(4);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      alert('플레이리스트 이름을 입력해주세요');
      return;
    }

    try {
      const newPlaylist = await createPlaylist(newPlaylistName.trim());
      // 직접 플레이리스트 ID를 전달하여 온보딩 완료
      handleCompleteWithPlaylist([newPlaylist.id]);
    } catch (error: any) {
      const errorMessage = error.message || '플레이리스트 생성에 실패했습니다';
      
      // YouTube 관련 에러인 경우 특별한 안내 제공
      if (errorMessage.includes('YouTube') || errorMessage.includes('채널')) {
        alert(`${errorMessage}\n\n기존 플레이리스트를 사용하거나 YouTube에 가입 후 다시 시도해주세요.`);
        // 이전 단계로 돌아가기
        setStep(2);
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleComplete = async () => {
    if (selectedPlaylists.length === 0) {
      alert('최소 1개 이상의 플레이리스트를 선택해주세요');
      return;
    }
    // 시간 입력 단계로 이동
    setStep(5);
  };

  const handleFinalComplete = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interests,
          selectedPlaylists,
          deliveryTimeHour,
          deliveryTimeMinute,
          referralCode: referralCode || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '온보딩 완료에 실패했습니다');
      }

      // 성공하면 홈으로 이동
      router.push('/');
    } catch (error: any) {
      console.error('온보딩 완료 실패:', error);
      alert(error.message || '온보딩 완료에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWithPlaylist = async (playlistIds: string[]) => {
    if (playlistIds.length === 0) {
      alert('최소 1개 이상의 플레이리스트를 선택해주세요');
      return;
    }

    // 플레이리스트를 선택하고 마지막 확인 단계로 이동
    setSelectedPlaylists(playlistIds);
    setStep(5);
  };

  if (status === 'loading') {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  // Step 1: 환영 및 관심사 선택
  if (step === 1) {
    return (
      <div className="h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-8 pb-24">
          {/* 뒤로가기 버튼 */}
          <div className="mb-4">
            <button
              onClick={handleBack}
              className="text-brand font-medium flex items-center"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              <span>뒤로</span>
            </button>
          </div>
          {/* 환영 메시지 */}
          <div className="text-center mb-8 fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-brand to-brand-light rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Mic2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-brand-dark mb-4">
              Hello!
              <br />
              Ownbrief에 오신걸 환영합니다
            </h1>
            <p className="text-base text-gray-700 px-4 leading-relaxed">
              Ownbrief와 함께 새로운 아침을 맞이해보세요
              <br />
              우리는 당신만을 위한 유익한 콘텐츠를 만들고자 합니다.
              <br />
              <span className="text-sm text-gray-600">
                당신이 저장한 콘텐츠를 출근길 15분 팟캐스트로 들어보세요.
              </span>
            </p>
          </div>

          {/* 관심사 선택 */}
          <div className="app-card p-6 mb-6 fade-in" style={{animationDelay: '0.1s'}}>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              관심사를 최대 5개까지 골라주세요
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {interests.length}/5 선택됨
            </p>

            <div className="flex flex-wrap gap-2">
              {AVAILABLE_INTERESTS.map((interest) => {
                const isSelected = interests.includes(interest);
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
                    {isSelected && (
                      <Check className="inline-block ml-1 w-4 h-4" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 다음 버튼 */}
          <button
            onClick={handleNext}
            disabled={interests.length === 0}
            className={`
              w-full py-4 rounded-xl font-bold text-lg
              transition-all duration-200 flex items-center justify-center space-x-2
              ${interests.length > 0
                ? 'bg-gradient-to-r from-brand to-brand-light text-white shadow-lg hover:shadow-xl active:scale-98'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <span>다음</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Step 2: 플레이리스트 선택 타입 선택
  if (step === 2) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-8 pb-24">
          {/* 헤더 */}
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="text-brand font-medium mb-4 flex items-center"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              <span>뒤로</span>
            </button>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              플레이리스트를 선택하거나 생성하세요
            </h1>
            <p className="text-sm text-gray-600">
              선택한 플레이리스트의 영상으로 맞춤 팟캐스트를 제공합니다
            </p>
          </div>

          {/* 선택된 관심사 표시 */}
          <div className="app-card p-4 mb-6 bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-brand" />
              <span className="text-sm font-medium text-brand-dark">선택한 관심사</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 bg-white text-brand rounded-lg text-sm font-medium border border-primary-200"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {/* 플레이리스트 선택 옵션 */}
          <div className="space-y-4">
            <button
              onClick={() => handlePlaylistSelectionType('existing')}
              disabled={playlists.length === 0}
              className={`
                w-full app-card p-6 text-left transition-all duration-200
                ${playlists.length === 0 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:shadow-md active:scale-98'
                }
              `}
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <List className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2">
                    기존 유튜브 플레이리스트 사용
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    이미 만든 플레이리스트를 선택합니다
                  </p>
                  {playlists.length === 0 && (
                    <p className="text-xs text-red-500">
                      사용 가능한 플레이리스트가 없습니다
                    </p>
                  )}
                </div>
              </div>
            </button>

            <button
              onClick={() => handlePlaylistSelectionType('new')}
              className="w-full app-card p-6 text-left transition-all duration-200 hover:shadow-md active:scale-98"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-brand-light flex items-center justify-center flex-shrink-0">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2">
                    새로 생성
                  </h3>
                  <p className="text-sm text-gray-600">
                    새로운 플레이리스트를 만들어 사용합니다
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: 기존 플레이리스트 선택
  if (step === 3) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-8 pb-24">
          {/* 헤더 */}
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="text-brand font-medium mb-4 flex items-center"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              <span>뒤로</span>
            </button>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              플레이리스트를 선택하세요
            </h1>
            <p className="text-sm text-gray-600">
              사용할 플레이리스트를 선택해주세요
            </p>
          </div>

          {/* 선택된 관심사 표시 */}
          <div className="app-card p-4 mb-6 bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-brand" />
              <span className="text-sm font-medium text-brand-dark">선택한 관심사</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 bg-white text-brand rounded-lg text-sm font-medium border border-primary-200"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {/* 플레이리스트 목록 */}
          {loadingPlaylists ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent"></div>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {playlists.map((playlist) => {
                  const isSelected = selectedPlaylists.includes(playlist.id);
                  return (
                    <button
                      key={playlist.id}
                      onClick={() => handlePlaylistToggle(playlist.id)}
                      className={`
                        w-full app-card p-4 text-left transition-all duration-200
                        ${isSelected
                          ? 'ring-2 ring-brand bg-primary-50'
                          : 'hover:shadow-md'
                        }
                      `}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`
                          w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                          ${isSelected
                            ? 'bg-gradient-to-br from-brand to-brand-light'
                            : 'bg-gray-100'
                          }
                        `}>
                          {isSelected ? (
                            <Check className="w-6 h-6 text-white" />
                          ) : (
                            <Play className="w-6 h-6 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 mb-1 truncate">
                            {playlist.title}
                          </h3>
                          {playlist.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {playlist.description}
                            </p>
                          )}
                          {playlist.itemCount !== undefined && (
                            <p className="text-xs text-gray-500 mt-1">
                              {playlist.itemCount}개의 동영상
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 완료 버튼 */}
              <button
                onClick={handleComplete}
                disabled={selectedPlaylists.length === 0 || loading}
                className={`
                  w-full py-4 rounded-xl font-bold text-lg
                  transition-all duration-200 flex items-center justify-center space-x-2
                  ${selectedPlaylists.length > 0 && !loading
                    ? 'bg-gradient-to-r from-brand to-brand-light text-white shadow-lg hover:shadow-xl active:scale-98'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>설정 중...</span>
                  </>
                ) : (
                  <>
                    <span>시작하기</span>
                    <Check className="w-5 h-5" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Step 4: 새 플레이리스트 생성
  if (step === 4) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-8 pb-24">
          {/* 헤더 */}
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="text-brand font-medium mb-4 flex items-center"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              <span>뒤로</span>
            </button>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              플레이리스트 이름을 정해주세요
            </h1>
            <p className="text-sm text-gray-600">
              Ownbrief에서 사용될 플레이리스트의 이름을 입력해주세요
            </p>
            <p className="text-xs text-gray-500 mt-1">
              (자동으로 유튜브에 저장됩니다)
            </p>
          </div>

          {/* 선택된 관심사 표시 */}
          <div className="app-card p-4 mb-6 bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-brand" />
              <span className="text-sm font-medium text-brand-dark">선택한 관심사</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 bg-white text-brand rounded-lg text-sm font-medium border border-primary-200"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {/* 플레이리스트 이름 입력 */}
          <div className="app-card p-6 mb-6">
            <label htmlFor="playlist-name" className="block text-sm font-medium text-gray-700 mb-2">
              플레이리스트 이름
            </label>
            <input
              id="playlist-name"
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="ex: ownbrief playlist"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 플레이리스트 생성이 실패하면 기존 플레이리스트를 사용할 수 있습니다
            </p>
          </div>

          {/* 생성 버튼 */}
          <button
            onClick={handleCreatePlaylist}
            disabled={!newPlaylistName.trim() || creatingPlaylist || loading}
            className={`
              w-full py-4 rounded-xl font-bold text-lg
              transition-all duration-200 flex items-center justify-center space-x-2
              ${newPlaylistName.trim() && !creatingPlaylist && !loading
                ? 'bg-gradient-to-r from-brand to-brand-light text-white shadow-lg hover:shadow-xl active:scale-98'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {creatingPlaylist ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>생성 중...</span>
              </>
            ) : loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>완료 중...</span>
              </>
            ) : (
              <>
                <span>생성하기</span>
                <Check className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Step 5: 마지막 확인 단계
  // Step 5: 시간 입력
  if (step === 5) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-8 pb-24">
          {/* 헤더 */}
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="text-brand font-medium mb-4 flex items-center"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              <span>뒤로</span>
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-brand to-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                팟캐스트 받을 시간을 설정하세요
              </h1>
              <p className="text-sm text-gray-600">
                매일 설정한 시간에 자동으로 팟캐스트가 준비됩니다
              </p>
            </div>
          </div>

          {/* 시간 선택 */}
          <div className="app-card p-6 mb-6">
            <div className="flex items-center space-x-3 mb-2">
              <select
                value={deliveryTimeHour}
                onChange={(e) => setDeliveryTimeHour(Number(e.target.value))}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand text-lg"
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
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand text-lg"
              >
                <option value={0}>0분</option>
                <option value={15}>15분</option>
                <option value={30}>30분</option>
                <option value={45}>45분</option>
              </select>
            </div>
            <p className="text-sm text-gray-500 mt-3 text-center">
              💡 선택한 시간 1시간 전에 팟캐스트가 자동 생성됩니다
            </p>
          </div>

          {/* 다음 버튼 */}
          <button
            onClick={() => setStep(6)}
            className="w-full bg-gradient-to-r from-brand to-brand-light text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 active:scale-98 flex items-center justify-center space-x-2"
          >
            <span>다음</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Step 6: 추천인 코드 입력
  if (step === 6) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-8 pb-24">
          {/* 헤더 */}
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="text-brand font-medium mb-4 flex items-center"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              <span>뒤로</span>
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #f7934c 0%, #ff8c42 100%)' }}>
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                추천인 코드가 있으신가요?
              </h1>
              <p className="text-sm text-gray-600">
                추천인 코드를 입력하면 10 크레딧을 받을 수 있어요!
              </p>
            </div>
          </div>

          {/* 추천인 코드 입력 */}
          <div className="app-card p-6 mb-6">
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="추천인 코드 입력 (8자)"
              maxLength={8}
              className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 text-center font-mono text-xl font-bold uppercase"
              style={{ borderColor: '#f7934c', color: '#f7934c' }}
              onFocus={(e) => {
                e.target.style.borderColor = '#f7934c'
                e.target.style.boxShadow = '0 0 0 3px rgba(247, 147, 76, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none'
              }}
            />
            <p className="text-sm text-gray-500 mt-3 text-center">
              추천인과 함께 각각 10 크레딧을 받아요
            </p>
          </div>

          {/* 건너뛰기 버튼 */}
          <button
            onClick={() => setStep(7)}
            className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all duration-200 mb-3"
          >
            건너뛰기
          </button>

          {/* 다음 버튼 */}
          <button
            onClick={() => setStep(7)}
            disabled={referralCode.length > 0 && referralCode.length !== 8}
            className="w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #f7934c 0%, #ff8c42 100%)' }}
          >
            <span>다음</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Step 7: 최종 확인
  if (step === 7) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-8 pb-24">
          {/* 헤더 */}
          <div className="mb-6">
            <button
              onClick={handleBack}
              disabled={loading}
              className="text-brand font-medium mb-4 flex items-center disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              <span>뒤로</span>
            </button>
            
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-brand to-brand-light rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                🎉 모든 준비가 완료되었습니다!
              </h1>
              <p className="text-lg text-gray-600">
                이제 당신만의 AI 팟캐스트를 만들어보세요
              </p>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="app-card p-6 mb-6 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200">
            <div className="flex items-start space-x-3">
              <Check className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-green-900 mb-2">설정 완료!</h3>
                <p className="text-sm text-green-700 leading-relaxed">
                  선택한 플레이리스트의 최신 동영상을 기반으로 매일 맞춤 팟캐스트를 생성해드립니다.
                </p>
              </div>
            </div>
          </div>

          {/* 시작하기 버튼 */}
          <button
            onClick={handleFinalComplete}
            disabled={loading}
            className={`
              w-full py-4 rounded-xl font-bold text-lg
              transition-all duration-200 flex items-center justify-center space-x-2
              ${!loading
                ? 'bg-gradient-to-r from-brand to-brand-light text-white shadow-lg hover:shadow-xl active:scale-98'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>시작 중...</span>
              </>
            ) : (
              <>
                <span>시작하기</span>
                <Check className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 기본 반환 (에러 상태)
  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">알 수 없는 오류</h1>
        <p className="text-gray-600 mb-4">온보딩 과정에서 오류가 발생했습니다.</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}


