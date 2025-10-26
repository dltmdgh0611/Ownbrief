'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Play, Pause } from 'lucide-react'
import { AudioEngine } from '@/frontend/lib/audio-engine'

export default function BriefingPlayerPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  
  // UI 상태
  const [viewMode, setViewMode] = useState<'text' | 'card'>('text')
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // 브리핑 데이터
  const [script, setScript] = useState('')
  const [scriptSections, setScriptSections] = useState<Array<{
    section: string
    title: string
    script: string
    paragraphs: Array<{
      text: string
      sentences: string[]
      startIndex: number
      startTime: number
      endTime: number
    }>
    sentences: Array<{
      text: string
      startTime: number
      endTime: number
    }>
    index: number
    duration: number
  }>>([])
  const [currentSection, setCurrentSection] = useState('')
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0)
  const [error, setError] = useState('')
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(0)
  const [isStopped, setIsStopped] = useState(false)
  
  // 카드 뷰를 위한 원본 데이터
  const [sectionData, setSectionData] = useState<Array<{
    section: string
    title: string
    data: any
    timestamp: Date
  }>>([])
  
  // Refs
  const audioEngineRef = useRef<AudioEngine | null>(null)
  const interludeAudioRef = useRef<HTMLAudioElement | null>(null)
  const currentPlayingIndexRef = useRef(0)
  const lastPreparedIndexRef = useRef<number | null>(null)
  const isVoicePlayingRef = useRef(false)
  const pendingNextRef = useRef<{
    index: number
    section: string
    script: string
    buffer: AudioBuffer
  } | null>(null)
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const scriptSectionsRef = useRef(scriptSections)
  const sentenceRefs = useRef<{ [key: string]: HTMLSpanElement | null }>({})

  // 섹션 정의
  const sections = [
    { name: 'intro', title: '인트로', isStatic: true },
    { name: 'calendar', title: '오늘 일정', isStatic: false },
    { name: 'gmail', title: '중요 메일', isStatic: false },
    { name: 'work', title: '업무 진행(슬랙/노션 통합)', isStatic: false },
    { name: 'trend1', title: '트렌드 1', isStatic: false },
    { name: 'trend2', title: '트렌드 2', isStatic: false },
    { name: 'trend3', title: '트렌드 3', isStatic: false },
    { name: 'outro', title: '마무리', isStatic: true }
  ]

  // 재생 속도 옵션
  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0]

  // 스크립트를 문단과 문장으로 분리하는 함수
  const parseScriptStructure = (text: string, totalDuration: number) => {
    // 문단으로 분리 (연속된 줄바꿈 기준)
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
    
    // 전체 문장 배열 (시간 계산용)
    const allSentences: string[] = []
    const paragraphStructure: Array<{
      text: string
      sentences: string[]
      startIndex: number
      startTime: number
      endTime: number
    }> = []
    
    paragraphs.forEach(paragraph => {
      const startIndex = allSentences.length
      
      // 각 문단을 문장으로 분리
      const sentences = paragraph
        .split(/([.?!])\s+/)
        .reduce((acc: string[], curr, idx, arr) => {
          if (idx % 2 === 0 && curr.trim()) {
            const sentence = curr + (arr[idx + 1] || '')
            if (sentence.trim()) {
              acc.push(sentence.trim())
            }
          }
          return acc
        }, [])
      
      allSentences.push(...sentences)
      paragraphStructure.push({
        text: paragraph,
        sentences,
        startIndex,
        startTime: 0, // 나중에 계산
        endTime: 0
      })
    })
    
    // 전체 문장에 대해 시간 배분
    const totalLength = allSentences.reduce((sum, s) => sum + s.length, 0)
    let currentTime = 0
    
    const sentenceTimes = allSentences.map(sentence => {
      const ratio = sentence.length / totalLength
      const duration = totalDuration * ratio
      const startTime = currentTime
      const endTime = currentTime + duration
      currentTime = endTime
      
      return {
        text: sentence,
        startTime,
        endTime
      }
    })
    
    // 각 문단의 시작/종료 시간 계산
    paragraphStructure.forEach((para, idx) => {
      const firstSentenceIdx = para.startIndex
      const lastSentenceIdx = idx < paragraphStructure.length - 1 
        ? paragraphStructure[idx + 1].startIndex - 1 
        : sentenceTimes.length - 1
      
      para.startTime = sentenceTimes[firstSentenceIdx]?.startTime || 0
      para.endTime = sentenceTimes[lastSentenceIdx]?.endTime || totalDuration
    })
    
    return {
      paragraphs: paragraphStructure,
      sentences: sentenceTimes
    }
  }

  // scriptSections ref 업데이트
  useEffect(() => {
    scriptSectionsRef.current = scriptSections
  }, [scriptSections])

  // 로그인 체크
  useEffect(() => {
    console.log('🔐 인증 상태:', status)
    if (status === 'unauthenticated') {
      console.log('🚪 로그인 안 됨 → /welcome으로 리다이렉트')
      router.push('/welcome')
    }
  }, [status, router])

  // 오디오 엔진 초기화 (컴포넌트 생명주기와 분리)
  const initAudioEngine = () => {
    if (!audioEngineRef.current || audioEngineRef.current.audioContext.state === 'closed') {
      console.log('🔊 오디오 엔진 초기화')
      audioEngineRef.current = new AudioEngine()
    }
  }
  
  useEffect(() => {
    // 언마운트 시에만 정리
    return () => {
      if (interludeAudioRef.current) {
        interludeAudioRef.current.pause()
      }
      // dispose는 실제 컴포넌트가 완전히 언마운트될 때만 실행
      // (페이지 이동 시)
    }
  }, [])

  // TTS 생성 함수
  const generateTTS = useCallback(async (text: string): Promise<AudioBuffer | null> => {
    try {
      console.log(`🎙️ TTS 생성 시작: ${text.substring(0, 30)}...`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5분 타임아웃
      
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: 'Kore',
          speed: playbackSpeed
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`TTS API 응답 오류: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.audioContent) {
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
  }, [playbackSpeed])

  // 다음 섹션 준비
  const prepareNextSection = useCallback(async (index: number) => {
    if (isStopped) return
    if (lastPreparedIndexRef.current === index) return
    
    lastPreparedIndexRef.current = index
    
    try {
      const section = sections[index]
      console.log(`🔄 섹션 ${index} 준비 중: ${section.title}`)
      
      let sectionScript = ''
      
      if (section.name === 'outro') {
        sectionScript = '오늘 하루도 화이팅하세요! 브리핑을 마치겠습니다.'
      } else if (!section.isStatic) {
        const response = await fetch('/api/briefing/next-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectionIndex: index - 1 })
        })
        
        if (!response.ok) {
          throw new Error(`섹션 ${section.title} API 요청 실패`)
        }
        
        const responseData = await response.json()
        
        if (!responseData.success || !responseData.script) {
          throw new Error(responseData.message || '스크립트 생성 실패')
        }
        
        sectionScript = responseData.script
        
        // 원본 데이터 저장 (카드 뷰용)
        if (responseData.data) {
          setSectionData(prev => [...prev, {
            section: section.name,
            title: section.title,
            data: responseData.data,
            timestamp: new Date()
          }])
        }
      }
      
      const ttsPromise = generateTTS(sectionScript)
      
      console.log(`✅ 섹션 ${index} 준비 완료: ${section.title}`)
      
      ttsPromise.then(async (audioBuffer) => {
        if (audioBuffer && !isStopped) {
          console.log(`🎵 TTS 생성 완료! 섹션: ${section.title}, isVoicePlaying: ${isVoicePlayingRef.current}`)
          
          if (isVoicePlayingRef.current) {
            console.log(`🎵 TTS 생성 완료! 현재 음성 재생 중 → 대기열 저장: ${section.title}`)
            pendingNextRef.current = {
              index,
              section: section.name,
              script: sectionScript,
              buffer: audioBuffer,
            }
          } else {
            console.log(`🎵 TTS 생성 완료! 즉시 재생 시작: ${section.title}`)
            
            if (interludeAudioRef.current) {
              fadeOutInterlude()
            }
            
            currentPlayingIndexRef.current = index
            setCurrentPlayingIndex(index)
            setCurrentSection(section.name)
            setScript(prev => prev + '\n\n' + sectionScript)
            
            // 문단과 문장으로 분리하고 시간 계산
            const scriptStructure = parseScriptStructure(sectionScript, audioBuffer.duration)
            
            setScriptSections(prev => [...prev, {
              section: section.name,
              title: section.title,
              script: sectionScript,
              paragraphs: scriptStructure.paragraphs,
              sentences: scriptStructure.sentences,
              index,
              duration: audioBuffer.duration
            }])
            setCurrentParagraphIndex(0)
            
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
  }, [isStopped, generateTTS, sections])

  // 음성 재생 종료 핸들러
  const handleAudioEnd = useCallback(async () => {
    if (isStopped) return
    
    const endedIndex = currentPlayingIndexRef.current
    console.log(`🎤 섹션 ${endedIndex} 재생 종료`)
    
    const nextIndex = endedIndex + 1
    console.log(`🔍 다음 섹션 인덱스: ${nextIndex}, pendingNext: ${pendingNextRef.current ? pendingNextRef.current.index : 'null'}`)
    
    if (nextIndex >= sections.length) {
      console.log('🎯 모든 섹션 재생 완료')
      setIsGenerating(false)
      setIsPlaying(false)
      
      if (interludeAudioRef.current) {
        fadeOutInterlude()
      }
      return
    }
    
    console.log('🎵 TTS 생성 완료 시 자동 재생 대기 중...')
    
    if (interludeAudioRef.current) {
      fadeInInterlude()
    }

    isVoicePlayingRef.current = false

    if (pendingNextRef.current && pendingNextRef.current.index === nextIndex) {
      console.log(`✅ pendingNext 일치! 섹션 ${nextIndex} 즉시 재생`)
      const next = pendingNextRef.current
      pendingNextRef.current = null

      try {
        if (interludeAudioRef.current) {
          fadeOutInterlude()
        }

        currentPlayingIndexRef.current = next.index
        setCurrentPlayingIndex(next.index)
        setCurrentSection(next.section)
        setScript(prev => prev + '\n\n' + next.script)
        
        // 문단과 문장으로 분리하고 시간 계산
        const scriptStructure = parseScriptStructure(next.script, next.buffer.duration)
        
        setScriptSections(prev => [...prev, {
          section: next.section,
          title: sections[next.index]?.title || next.section,
          script: next.script,
          paragraphs: scriptStructure.paragraphs,
          sentences: scriptStructure.sentences,
          index: next.index,
          duration: next.buffer.duration
        }])
        setCurrentParagraphIndex(0)

        isVoicePlayingRef.current = true
        await audioEngineRef.current!.playBuffer(next.buffer)
      } catch (e) {
        console.error('다음 섹션 자동 재생 실패:', e)
        setError('다음 섹션 재생에 실패했습니다')
        setIsStopped(true)
        setIsGenerating(false)
      }
    } else {
      console.warn(`⚠️ pendingNext 불일치 또는 없음! nextIndex: ${nextIndex}, pendingNext: ${pendingNextRef.current ? pendingNextRef.current.index : 'null'}`)
    }
  }, [isStopped, sections])

  // 음성 재생 시작 핸들러
  const handleAudioStart = useCallback(async () => {
    if (isStopped) return
    
    const playingIndex = currentPlayingIndexRef.current
    console.log(`🎤 섹션 ${playingIndex} 재생 시작`)
    
    if (interludeAudioRef.current) {
      console.log('🎵 음성 재생 시작 - Interlude 페이드아웃')
      fadeOutInterlude()
    }
    
    const nextIndex = playingIndex + 1
    if (nextIndex < sections.length) {
      prepareNextSection(nextIndex)
    }
    
    isVoicePlayingRef.current = true
  }, [isStopped, prepareNextSection, sections])


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
    }
  }

  // Interlude 재생
  const playInterlude = useCallback(async () => {
    try {
      console.log('Interlude 재생 시도 중...')
      
      const response = await fetch('/api/music/interlude')
      
      if (!response.ok) {
        console.error('Interlude API 응답 오류:', response.status, response.statusText)
        return
      }
      
      const data = await response.json()
      console.log('Interlude API 응답:', data)

      if (data.success && data.audioUrl) {
        const audio = new Audio(data.audioUrl)
        audio.volume = 0.3
        audio.loop = true
        interludeAudioRef.current = audio
        
        audio.addEventListener('canplaythrough', async () => {
          try {
            await audio.play()
            console.log('🎵 Interlude started:', data.fileName)
          } catch (playError) {
            console.error('오디오 재생 실패:', playError)
          }
        })
        
        audio.load()
      }
    } catch (error) {
      console.error('Interlude error:', error)
    }
  }, [])

  // 첫 번째 섹션 시작
  const startFirstSection = useCallback(async () => {
    try {
      const firstSection = sections[0]
      if (firstSection.name === 'intro') {
        const today = new Date()
        const dateStr = today.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        })
        
        const introScript = `안녕하세요.

${dateStr} 브리핑을 시작하겠습니다.`
        
        const audioBuffer = await generateTTS(introScript)
        
        if (!audioBuffer) {
          throw new Error('인트로 TTS 생성 실패')
        }
        
        setCurrentSection('intro')
        setScript(introScript)
        
        // 문단과 문장으로 분리하고 시간 계산
        const scriptStructure = parseScriptStructure(introScript, audioBuffer.duration)
        
        setScriptSections([{
          section: 'intro',
          title: '인트로',
          script: introScript,
          paragraphs: scriptStructure.paragraphs,
          sentences: scriptStructure.sentences,
          index: 0,
          duration: audioBuffer.duration
        }])
        setCurrentParagraphIndex(0)
        
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
  }, [generateTTS])

  // 브리핑 생성 시작
  const handleGenerateBriefing = useCallback(async () => {
    try {
      console.log('🚀 브리핑 생성 시작')
      setIsGenerating(true)
      setIsPlaying(true)
      setError('')
      setScript('')
      setScriptSections([])
      setSectionData([])
      setCurrentSection('')
      setIsStopped(false)
      setCurrentPlayingIndex(0)
      currentPlayingIndexRef.current = 0
      lastPreparedIndexRef.current = null

      // 오디오 엔진 초기화 (닫힌 경우 재생성)
      initAudioEngine()

      // 이벤트 핸들러 설정
      console.log('🎵 이벤트 핸들러 설정')
      audioEngineRef.current!.onPlaybackStart(() => {
        console.log('🎵 재생 시작 이벤트 발생')
        handleAudioStart()
      })
      
      audioEngineRef.current!.onPlaybackEnd(() => {
        console.log('🎵 재생 종료 이벤트 발생')
        handleAudioEnd()
      })

      // 시간 업데이트 핸들러 설정
      audioEngineRef.current!.onTimeUpdate((currentTime: number, duration: number) => {
        // ref를 통해 최신 섹션 데이터 접근
        const currentSectionIndex = currentPlayingIndexRef.current
        const currentSectionData = scriptSectionsRef.current.find(s => s.index === currentSectionIndex)
        
        if (currentSectionData && currentSectionData.paragraphs.length > 0) {
          // 현재 시간에 해당하는 문단 찾기
          const paragraphIndex = currentSectionData.paragraphs.findIndex(
            (p) => currentTime >= p.startTime && currentTime < p.endTime
          )
          
          if (paragraphIndex >= 0) {
            setCurrentParagraphIndex(paragraphIndex)
          }
        }
      })

      // 오디오 컨텍스트 활성화
      if (audioEngineRef.current!.audioContext.state === 'suspended') {
        console.log('🔊 오디오 컨텍스트 재개')
        await audioEngineRef.current!.audioContext.resume()
      }

      await playInterlude()
      await startFirstSection()
    } catch (error) {
      console.error('Briefing generation error:', error)
      setError('브리핑 생성에 실패했습니다')
      setIsGenerating(false)
      setIsStopped(true)
    }
  }, [handleAudioStart, handleAudioEnd, playInterlude, startFirstSection]) // eslint-disable-line react-hooks/exhaustive-deps

  // 일시정지/재생 토글
  const togglePlayPause = async () => {
    if (isPlaying) {
      await audioEngineRef.current?.pause()
      setIsPlaying(false)
    } else {
      await audioEngineRef.current?.resume()
      setIsPlaying(true)
    }
  }

  // 페이지 로드 시 자동 시작
  const hasStartedRef = useRef(false)
  
  useEffect(() => {
    if (status === 'authenticated' && !hasStartedRef.current) {
      hasStartedRef.current = true
      
      // 백그라운드로 트렌드 키워드 미리 생성
      const preloadTrends = async () => {
        try {
          await fetch('/api/briefing/preload-trends', {
            method: 'POST'
          })
          console.log('🔨 백그라운드 트렌드 키워드 생성 시작')
        } catch (error) {
          console.error('Preload trends error:', error)
        }
      }

      preloadTrends()

      console.log('🚀 브리핑 자동 시작 예약')
      // 약간의 딜레이 후 자동 시작
      const timer = setTimeout(() => {
        console.log('🚀 브리핑 자동 시작 실행')
        handleGenerateBriefing()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [status, handleGenerateBriefing])

  // 현재 재생 중인 섹션으로 자동 스크롤
  useEffect(() => {
    if (currentSection && sectionRefs.current[currentSection]) {
      console.log('📍 현재 섹션으로 스크롤:', currentSection)
      sectionRefs.current[currentSection]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [currentSection])

  // 하이라이트된 문장으로 자동 스크롤
  useEffect(() => {
    const highlightedSentence = document.querySelector('span.bg-yellow-300, span.bg-yellow-200')
    if (highlightedSentence) {
      console.log('📍 하이라이트 문장으로 스크롤')
      highlightedSentence.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      })
    }
  }, [currentPlayingIndex, currentSection, scriptSections])

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-teal-800 to-teal-600">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-teal-800 via-teal-700 to-teal-600 text-white overflow-hidden">
      {/* 상단 헤더 */}
      <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 bg-white/10 rounded-full p-1">
          <button
            onClick={() => setViewMode('text')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'text' 
                ? 'bg-white/20 text-white' 
                : 'text-white/70 hover:text-white'
            }`}
          >
            텍스트
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'card' 
                ? 'bg-white/20 text-white' 
                : 'text-white/70 hover:text-white'
            }`}
          >
            카드
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* 텍스트 뷰 */}
        {viewMode === 'text' && (
          <div className="space-y-6 text-base leading-relaxed">
            {scriptSections.length > 0 ? (
            scriptSections.map((item, sectionIdx) => (
              <div
                key={sectionIdx}
                ref={(el) => {
                  sectionRefs.current[item.section] = el
                }}
                className="transition-all duration-300"
              >
                {/* 섹션 타이틀 */}
                {item.index > 0 && (
                  <div className={`text-sm mb-3 transition-all duration-300 ${
                    currentSection === item.section ? 'text-white/90 font-medium' : 'text-white/30'
                  }`}>
                    [ {item.title} ]
                  </div>
                )}
                
                {/* 문단들 */}
                <div className="space-y-4">
                  {item.paragraphs && item.paragraphs.length > 0 ? (
                    item.paragraphs.map((paragraph, paragraphIdx) => {
                      const isCurrentSection = currentSection === item.section
                      const isCurrentParagraph = isCurrentSection && currentParagraphIndex === paragraphIdx
                      
                      return (
                        <div 
                          key={paragraphIdx} 
                          className={`leading-relaxed transition-all duration-300 ${
                            isCurrentParagraph
                              ? 'text-white font-bold opacity-100'
                              : isCurrentSection
                              ? 'text-white/60 opacity-80'
                              : 'text-white/30 opacity-50'
                          }`}
                        >
                          {paragraph.text}
                        </div>
                      )
                    })
                  ) : (
                    // 문장이 없는 경우 전체 스크립트 표시
                    <p className={`transition-all duration-300 whitespace-pre-wrap ${
                      currentSection === item.section
                        ? 'text-white font-bold opacity-100'
                        : 'text-white/40 opacity-60'
                    }`}>
                      {item.script}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : isGenerating ? (
            <>
              <h1 className="text-xl font-medium mb-4">안녕하세요.</h1>
              <p className="opacity-90 animate-pulse">브리핑을 생성하고 있습니다...</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-medium mb-4">안녕하세요.</h1>
              <p className="opacity-90">브리핑을 준비 중입니다...</p>
              <button
                onClick={handleGenerateBriefing}
                className="mt-4 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                브리핑 시작
              </button>
            </>
          )}
          </div>
        )}

        {/* 카드 뷰 */}
        {viewMode === 'card' && (
          <div className="space-y-6">
            <div className="text-2xl font-bold text-white mb-4">
              {new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </div>

            <div className="text-xl text-white/90 mb-6">
              좋은 아침입니다! 👋
            </div>

            <div className="text-lg font-medium text-white mb-4">
              오늘의 브리핑을 시작합니다
            </div>

            {/* 데이터 카드들 */}
            <div className="space-y-6">
              {sectionData.length > 0 ? (
                sectionData.map((section, idx) => (
                  <div key={idx} className="space-y-3">
                    {/* 섹션 헤더 */}
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-lg">
                        {section.section === 'calendar' ? '📅' : 
                         section.section === 'gmail' ? '📧' :
                         section.section === 'slack' ? '💬' :
                         section.section === 'notion' ? '📝' :
                         section.section === 'interests' ? '📈' : '📋'}
                      </span>
                      <h3 className="text-lg font-semibold">{section.title}</h3>
                      {Array.isArray(section.data) && (
                        <span className="text-sm opacity-70">{section.data.length}건</span>
                      )}
                    </div>

                    {/* 카드 아이템들 */}
                    {section.section === 'gmail' && Array.isArray(section.data) && section.data.length > 0 && (
                      <div className="space-y-2">
                        {section.data.slice(0, 3).map((email: any, emailIdx: number) => (
                          <div 
                            key={emailIdx}
                            className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="font-medium text-white mb-1">
                                  {email.from || email.sender || '발신자 정보 없음'}
                                </div>
                                <div className="text-sm text-white/70 mb-2">
                                  {email.subject || email.title || '제목 없음'}
                                </div>
                              </div>
                              {email.urgent && (
                                <span className="px-2 py-1 bg-red-500/30 text-red-200 text-xs rounded-full">
                                  긴급
                                </span>
                              )}
                            </div>
                            {email.time && (
                              <div className="text-xs text-white/50">
                                {email.time}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {section.section === 'calendar' && Array.isArray(section.data) && section.data.length > 0 && (
                      <div className="space-y-2">
                        {section.data.slice(0, 3).map((event: any, eventIdx: number) => (
                          <div 
                            key={eventIdx}
                            className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-white mb-1">
                                  {event.summary || event.title || '제목 없음'}
                                </div>
                                {event.location && (
                                  <div className="text-sm text-white/60">
                                    📍 {event.location}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-white/70 text-right">
                                {event.time || event.start || '시간 미정'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {section.section === 'interests' && Array.isArray(section.data) && section.data.length > 0 && (
                      <div className="space-y-2">
                        {section.data.slice(0, 3).map((item: any, itemIdx: number) => (
                          <div 
                            key={itemIdx}
                            className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-colors"
                          >
                            {item.tag && (
                              <div className="inline-block px-2 py-1 bg-white/20 rounded text-xs text-white/80 mb-2">
                                {item.tag}
                              </div>
                            )}
                            <div className="font-medium text-white mb-2">
                              {item.title || item.topic || '제목 없음'}
                            </div>
                            {item.source && (
                              <div className="text-xs text-white/50">
                                {item.source}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-white/60 text-center py-8">
                  브리핑 데이터를 수집하고 있습니다...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* 하단 컨트롤 */}
      <div className="flex-shrink-0 px-6 pb-8 pt-4">
        {/* 재생 속도 버튼 */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {speedOptions.map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                playbackSpeed === speed
                  ? 'bg-white/30 text-white scale-105'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* 재생 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={togglePlayPause}
            disabled={!script && !isGenerating}
            className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


