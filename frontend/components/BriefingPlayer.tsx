'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Volume2, Loader2 } from 'lucide-react'
import GenerationStatus from './GenerationStatus'
import ScriptViewer from './ScriptViewer'
import MusicPlayer from './MusicPlayer'
import { AudioEngine } from '@/frontend/lib/audio-engine'

interface BriefingPlayerProps {
  userEmail: string
}

export default function BriefingPlayer({ userEmail }: BriefingPlayerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStatus, setCurrentStatus] = useState('')
  const [script, setScript] = useState('')
  const [progress, setProgress] = useState(0)
  const [briefingId, setBriefingId] = useState('')
  const [error, setError] = useState('')
  
  // 파이프라인 방식 브리핑 상태
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(0) // 현재 재생 중인 섹션 인덱스
  const [isStopped, setIsStopped] = useState(false) // 오류로 인한 중단 플래그
  const [currentSection, setCurrentSection] = useState('')
  const [backgroundMusicPlaying, setBackgroundMusicPlaying] = useState(false)
  const [isProcessingNext, setIsProcessingNext] = useState(false) // 다음 섹션 처리 중
  const isProcessingNextRef = useRef(false)
  const currentPlayingIndexRef = useRef(0)
  const lastPreparedIndexRef = useRef<number | null>(null)
  const isVoicePlayingRef = useRef(false)
  const pendingNextRef = useRef<{
    index: number
    section: string
    script: string
    buffer: AudioBuffer
  } | null>(null)

  // Music Player 상태
  const [currentTrack, setCurrentTrack] = useState({
    title: 'AICast 브리핑',
    artist: '실시간 브리핑',
    album: 'AI 생성 콘텐츠',
    duration: 180, // 3분
  })
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.7)

  const audioEngineRef = useRef<AudioEngine | null>(null)
  const interludeAudioRef = useRef<HTMLAudioElement | null>(null)

  // 섹션 데이터 정의
  const sections = [
    { name: 'intro', title: '인트로', isStatic: true },
    { name: 'calendar', title: '오늘 일정', isStatic: false },
    { name: 'gmail', title: '중요 메일', isStatic: false },
    { name: 'work', title: '업무 진행(슬랙/노션 통합)', isStatic: false },
    { name: 'interests', title: '관심사 비즈니스 뉴스레터', isStatic: false },
    { name: 'outro', title: '마무리', isStatic: true }
  ]


  // 음성 재생 종료 이벤트 핸들러
  const handleAudioEnd = useCallback(async () => {
    if (isStopped) return
    
    const endedIndex = currentPlayingIndexRef.current
    console.log(`🎤 섹션 ${endedIndex} 재생 종료`)
    
    const nextIndex = endedIndex + 1
    
    // 마지막 섹션인지 확인
    if (nextIndex >= sections.length) {
      console.log('🎯 모든 섹션 재생 완료')
      setIsGenerating(false)
      setIsPlaying(false)
      
      // Interlude 페이드아웃 (브리핑 완료 시)
      if (interludeAudioRef.current) {
        fadeOutInterlude()
      }
      return
    }
    
    // TTS 생성 완료 시 자동으로 재생되므로 대기만 함
    console.log('🎵 TTS 생성 완료 시 자동 재생 대기 중...')
    
    // Interlude 페이드인 (다음 섹션 준비 중)
    if (interludeAudioRef.current) {
      fadeInInterlude()
    }

    // 음성 재생 상태 업데이트
    isVoicePlayingRef.current = false

    // 대기 중인 다음 섹션이 있으면 즉시 재생
    if (pendingNextRef.current && pendingNextRef.current.index === nextIndex) {
      const next = pendingNextRef.current
      pendingNextRef.current = null

      try {
        // Interlude 페이드아웃 후 재생
        if (interludeAudioRef.current) {
          fadeOutInterlude()
        }

        currentPlayingIndexRef.current = next.index
        setCurrentPlayingIndex(next.index)
        setCurrentSection(next.section)
        setScript(prev => prev + '\n\n' + next.script)
        setIsProcessingNext(false)

        isVoicePlayingRef.current = true
        await audioEngineRef.current!.playBuffer(next.buffer)
      } catch (e) {
        console.error('다음 섹션 자동 재생 실패:', e)
        setError('다음 섹션 재생에 실패했습니다')
        setIsStopped(true)
        setIsGenerating(false)
      }
    }
  }, [isStopped, isGenerating, sections])

  // 브리핑 생성 시작
  const handleGenerateBriefing = async () => {
    try {
      setIsGenerating(true)
      setIsPlaying(true) // 바로 플레이어 시작
      setError('')
      setProgress(0)
      setScript('')
      setCurrentSection('')
      setCurrentStatus('음성 생성을 준비중입니다...')
      setIsStopped(false)
      setCurrentPlayingIndex(0)
      currentPlayingIndexRef.current = 0
      lastPreparedIndexRef.current = null
      setIsProcessingNext(false)

      // 오디오 엔진 초기화
      if (!audioEngineRef.current) {
        audioEngineRef.current = new AudioEngine()
      }

      // 사용자 상호작용 후 오디오 컨텍스트 활성화
      if (audioEngineRef.current.audioContext.state === 'suspended') {
        await audioEngineRef.current.audioContext.resume()
      }

      // 즉시 interlude 재생 (처리 중 음악)
      await playInterlude()

      // 첫 번째 섹션 시작
      await startFirstSection()
    } catch (error) {
      console.error('Briefing generation error:', error)
      setError('브리핑 생성에 실패했습니다')
      setIsGenerating(false)
      setIsStopped(true)
    }
  }

  // 첫 번째 섹션 시작
  const startFirstSection = async () => {
    try {
      const firstSection = sections[0]
      if (firstSection.name === 'intro') {
        const introScript = `좋은 아침입니다! 오늘도 멋진 하루를 시작해볼까요? 오늘의 브리핑을 준비해드리겠습니다.`
        
        // 인트로 TTS 생성 및 재생
        const ttsPromise = generateTTS(introScript)
        const audioBuffer = await ttsPromise
        
        if (!audioBuffer) {
          throw new Error('인트로 TTS 생성 실패')
        }
        
        setCurrentSection('intro')
        setCurrentStatus('브리핑을 시작합니다...')
        
        // 첫 번째 음성 재생 시작
        console.log('🎤 인트로 음성 재생 시작')
        currentPlayingIndexRef.current = 0
        await audioEngineRef.current!.playBuffer(audioBuffer)
      }
    } catch (error) {
      console.error('첫 번째 섹션 시작 오류:', error)
      setError('브리핑 시작에 실패했습니다')
      setIsGenerating(false)
      setIsStopped(true)
    }
  }

  // TTS 생성 함수 (타임아웃 포함)
  const generateTTS = useCallback(async (text: string): Promise<AudioBuffer | null> => {
    try {
      console.log(`🎙️ TTS 생성 시작: ${text.substring(0, 30)}...`)
      
      // TTS API 호출 (타임아웃 60초 - 관심사 섹션 등 긴 텍스트 대응)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)
      
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: 'Kore', // 일관된 음성 사용
          speed: 1.0 // 일관된 속도 사용
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`TTS API 응답 오류: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.audioContent) {
        // Base64 오디오를 AudioBuffer로 변환
        const audioBuffer = await audioEngineRef.current!.loadAudioFromBase64(
          `data:audio/wav;base64,${data.audioContent}`
        )
        
        console.log(`✅ TTS 생성 완료: ${data.duration}초`)
        return audioBuffer
      } else {
        throw new Error('TTS 데이터 없음')
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('TTS 생성 타임아웃')
        setError('TTS 생성이 너무 오래 걸렸습니다')
      } else {
        console.error('TTS 생성 오류:', error)
        setError('TTS 생성에 실패했습니다')
      }
      setIsStopped(true)
      return null
    }
  }, [])

  // 다음 섹션 준비
  const prepareNextSection = useCallback(async (index: number) => {
    if (isStopped) return
    // 같은 인덱스를 중복 준비하지 않도록 가드
    if (lastPreparedIndexRef.current === index) {
      return
    }
    lastPreparedIndexRef.current = index
    
    try {
      const section = sections[index]
      console.log(`🔄 섹션 ${index} 준비 중: ${section.title}`)
      
      let script = ''
      
      // 정적 섹션 처리
      if (section.name === 'outro') {
        script = '오늘 하루도 화이팅하세요! 브리핑을 마치겠습니다.'
      } else if (!section.isStatic) {
        // 동적 섹션: API를 통해 스크립트 생성
        const response = await fetch('/api/briefing/next-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectionIndex: index - 1 }) // intro를 제외한 인덱스
        })
        
        if (!response.ok) {
          throw new Error(`섹션 ${section.title} API 요청 실패`)
        }
        
        const data = await response.json()
        
        if (!data.success || !data.script) {
          throw new Error(data.message || '스크립트 생성 실패')
        }
        
        script = data.script
      }
      
      // TTS 생성 시작
      const ttsPromise = generateTTS(script)
      
      console.log(`✅ 섹션 ${index} 준비 완료: ${section.title}`)
      
      // TTS 생성 완료 시: 현재 음성이 재생 중이면 대기열에 저장, 아니면 즉시 재생
      ttsPromise.then(async (audioBuffer) => {
        if (audioBuffer && !isStopped) {
          if (isVoicePlayingRef.current) {
            console.log(`🎵 TTS 생성 완료! 현재 음성 재생 중 → 대기열 저장: ${section.title}`)
            pendingNextRef.current = {
              index,
              section: section.name,
              script,
              buffer: audioBuffer,
            }
          } else {
            console.log(`🎵 TTS 생성 완료! 즉시 재생 시작: ${section.title}`)
            
            // Interlude 페이드아웃
            if (interludeAudioRef.current) {
              fadeOutInterlude()
            }
            
            // 다음 섹션 재생
            currentPlayingIndexRef.current = index
            setCurrentPlayingIndex(index)
            setCurrentSection(section.name)
            setScript(prev => prev + '\n\n' + script)
            setIsProcessingNext(false)
            
            isVoicePlayingRef.current = true
            await audioEngineRef.current!.playBuffer(audioBuffer)
          }
        }
      }).catch((error) => {
        console.error(`TTS 생성 실패: ${section.title}`, error)
        setError(`TTS 생성에 실패했습니다`)
        setIsStopped(true)
        setIsGenerating(false)
      })
      
      // Interlude 페이드인 (다음 섹션 준비 완료 시)
      if (interludeAudioRef.current && !interludeAudioRef.current.paused) {
        console.log('🎵 다음 섹션 준비 완료 - Interlude 페이드인')
        fadeInInterlude()
      }
    } catch (error) {
      console.error(`섹션 ${index} 준비 오류:`, error)
      setError(`섹션 준비 중 오류가 발생했습니다`)
      setIsStopped(true)
      setIsGenerating(false)
    }
  }, [isStopped, generateTTS])

  // 음성 재생 시작 이벤트 핸들러
  const handleAudioStart = useCallback(async () => {
    if (isStopped) return
    
    // 최신 인덱스를 사용하도록 ref 우선
    const playingIndex = currentPlayingIndexRef.current
    console.log(`🎤 섹션 ${playingIndex} 재생 시작`)
    
    // Interlude 페이드아웃 (음성 재생 시작 시)
    if (interludeAudioRef.current) {
      console.log('🎵 음성 재생 시작 - Interlude 페이드아웃')
      fadeOutInterlude()
    }
    
    // 다음 섹션 준비 (현재 재생 중에 미리 준비)
    const nextIndex = playingIndex + 1
    if (nextIndex < sections.length && !isProcessingNextRef.current) {
      isProcessingNextRef.current = true
      setIsProcessingNext(true)
      prepareNextSection(nextIndex).finally(() => {
        isProcessingNextRef.current = false
      })
    }
    // 음성 재생 상태 업데이트
    isVoicePlayingRef.current = true
  }, [isStopped, isProcessingNext, prepareNextSection])

  // 이벤트 핸들러 설정 (함수 정의 후)
  useEffect(() => {
    if (audioEngineRef.current) {
      // 재생 시작/종료 이벤트 핸들러 설정
      audioEngineRef.current.onPlaybackStart(() => {
        console.log('🎵 재생 시작 이벤트 발생')
        handleAudioStart()
      })
      
      audioEngineRef.current.onPlaybackEnd(() => {
        console.log('🎵 재생 종료 이벤트 발생')
        handleAudioEnd()
      })
    }
  }, [handleAudioStart, handleAudioEnd])


  // Interlude 재생 함수
  const playInterlude = async () => {
    try {
      console.log('Interlude 재생 시도 중...')
      
      // Supabase BGM 버킷에서 랜덤 interlude 가져오기
      const response = await fetch('/api/music/interlude')
      
      if (!response.ok) {
        console.error('Interlude API 응답 오류:', response.status, response.statusText)
        playFallbackInterlude()
        return
      }
      
      const data = await response.json()
      console.log('Interlude API 응답:', data)

      if (data.success && data.audioUrl) {
        // Interlude 재생
        const audio = new Audio(data.audioUrl)
        audio.volume = 0.3
        audio.loop = true // 다음 섹션 준비될 때까지 반복
        interludeAudioRef.current = audio
        
        // 오디오 로드 및 재생
        audio.addEventListener('canplaythrough', async () => {
          try {
            await audio.play()
            setBackgroundMusicPlaying(true)
            console.log('🎵 Interlude started:', data.fileName)
            
            // 최소 5초 재생 보장
            setTimeout(() => {
              console.log('🎵 최소 5초 재생 완료, 다음 섹션 준비')
            }, 5000)
          } catch (playError) {
            console.error('오디오 재생 실패:', playError)
            // 폴백으로 상태만 변경
            setBackgroundMusicPlaying(true)
          }
        })
        
        audio.addEventListener('error', (error) => {
          console.error('오디오 로드 실패:', error)
          playFallbackInterlude()
        })
        
        // 오디오 로드 시작
        audio.load()
      } else {
        // 폴백: Web Audio API로 기본 사운드 생성
        console.log('Interlude 실패, 폴백 사용:', data.message)
        playFallbackInterlude()
      }
    } catch (error) {
      console.error('Interlude error:', error)
      playFallbackInterlude()
    }
  }

  // 폴백 interlude 재생 (더 안정적인 방법)
  const playFallbackInterlude = () => {
    try {
      console.log('🎵 Fallback interlude 시작')
      
      // 간단한 방법: 상태만 변경하고 실제 오디오는 재생하지 않음
      setBackgroundMusicPlaying(true)
      console.log('🎵 Fallback interlude 상태 활성화')
      
      // 3초 후 자동으로 상태 변경 (실제 TTS가 시작되면 페이드아웃됨)
      setTimeout(() => {
        console.log('🎵 Fallback interlude 자동 종료')
      }, 3000)
      
    } catch (error) {
      console.error('Fallback interlude error:', error)
      // 최후의 수단: 상태만 변경
      setBackgroundMusicPlaying(true)
    }
  }


  // Interlude 페이드아웃
  const fadeOutInterlude = () => {
    if (interludeAudioRef.current) {
      const audio = interludeAudioRef.current
      console.log(`🎵 Interlude 페이드아웃 시작 - 현재 볼륨: ${audio.volume}`)
      const fadeOutInterval = setInterval(() => {
        if (audio.volume > 0.01) {
          audio.volume -= 0.01
        } else {
          audio.pause()
          clearInterval(fadeOutInterval)
          console.log('🎵 Interlude 페이드아웃 완료')
        }
      }, 50)
      } else {
      console.log('🎵 Interlude 오디오가 없어서 페이드아웃 스킵')
    }
  }

  // Interlude 페이드인
  const fadeInInterlude = () => {
    if (interludeAudioRef.current) {
      const audio = interludeAudioRef.current
      console.log(`🎵 Interlude 페이드인 시작 - 현재 볼륨: ${audio.volume}`)
      audio.volume = 0
      audio.play()
      
      const fadeInInterval = setInterval(() => {
        if (audio.volume < 0.3) {
          audio.volume += 0.01
        } else {
          clearInterval(fadeInInterval)
          console.log('🎵 Interlude 페이드인 완료')
        }
      }, 50)
    } else {
      console.log('🎵 Interlude 오디오가 없어서 페이드인 스킵')
    }
  }


  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.dispose()
      }
      if (interludeAudioRef.current) {
        interludeAudioRef.current.pause()
      }
      setIsStopped(true)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center p-6" style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* 메인 재생 영역 */}
      <div className="w-full max-w-2xl" style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        {!isGenerating && !isPlaying && (
          <div className="text-center space-y-8">
            {/* 큰 재생 버튼 */}
            <div className="flex flex-col items-center space-y-6">
              <button
                onClick={handleGenerateBriefing}
                disabled={isGenerating}
                className="w-32 h-32 rounded-full bg-gradient-to-r from-brand to-brand-light shadow-2xl hover:shadow-3xl active:scale-95 transition-all duration-200 flex items-center justify-center group"
              >
                <Play className="w-16 h-16 text-white ml-2 group-hover:scale-110 transition-transform" />
              </button>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">
                  오늘의 브리핑
                </h2>
                <p className="text-gray-600">
                  재생 버튼을 눌러 맞춤 브리핑을 시작하세요
                </p>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="app-card p-4 bg-red-50 border border-red-200">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Apple Music 스타일 플레이어 */}
        {isPlaying && (
          <MusicPlayer
            isPlaying={backgroundMusicPlaying}
            currentTrack={currentTrack}
            onPlayPause={() => {
              if (backgroundMusicPlaying) {
                interludeAudioRef.current?.pause()
                setBackgroundMusicPlaying(false)
              } else {
                interludeAudioRef.current?.play()
                setBackgroundMusicPlaying(true)
              }
            }}
            onNext={() => console.log('Next track')}
            onPrevious={() => console.log('Previous track')}
            onSeek={(position) => setCurrentTime(position)}
            currentTime={currentTime}
            volume={volume}
            onVolumeChange={(vol) => {
              setVolume(vol)
              if (interludeAudioRef.current) {
                interludeAudioRef.current.volume = vol
              }
            }}
          />
        )}

        {/* 실시간 브리핑 상태 (플레이어 아래) */}
        {isGenerating && isPlaying && (
          <div className="space-y-6 mt-6">

            {/* 프로세스는 보여주지 않음 - 백그라운드에서 진행 */}
          </div>
        )}

        {/* 재생 중 상태 (생성 완료 후) */}
        {isPlaying && !isGenerating && script && (
          <div className="space-y-6">
            <ScriptViewer 
              script={script}
              isPlaying={isPlaying}
            />

            {/* 재생 컨트롤 */}
            <div className="app-card p-6">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-brand to-brand-light shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </button>

                <button
                  onClick={handleGenerateBriefing}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 transition-colors"
                >
                  새로 생성
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



