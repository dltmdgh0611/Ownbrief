'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, ChevronRight, Check, Play, List, Mic2 } from 'lucide-react';

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

  const handleComplete = async () => {
    if (selectedPlaylists.length === 0) {
      alert('최소 1개 이상의 플레이리스트를 선택해주세요');
      return;
    }

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

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent"></div>
      </div>
    );
  }

  // Step 1: 환영 및 관심사 선택
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
        <div className="px-4 py-8 pb-24">
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

  // Step 2: 플레이리스트 선택
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="px-4 py-8 pb-24">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => setStep(1)}
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

        {/* 플레이리스트 목록 */}
        {loadingPlaylists ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand border-t-transparent"></div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="app-card p-8 text-center">
            <List className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">플레이리스트가 없습니다</p>
            <p className="text-sm text-gray-500">
              YouTube에서 플레이리스트를 만들어주세요
            </p>
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

