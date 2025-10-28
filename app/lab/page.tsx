'use client'

import { useState, useRef } from 'react'
import { Play, Pause, Volume2, Loader2, Mic, VolumeX, FileText } from 'lucide-react'

interface VoiceModel {
  id: string
  name: string
}

const VOICE_MODELS: VoiceModel[] = [
  { id: 'Kore', name: 'Kore' },
  { id: 'Leda', name: 'Leda' },
  { id: 'Charon', name: 'Charon' },
]

// 고정된 샘플 대본 (일정 브리핑)
const SAMPLE_SCRIPT = `오늘 하루 일정을 간단히 브리핑드리겠습니다.

오전 10시에는 팀 미팅이 예정되어 있습니다. 주간 진행 상황과 다음 주 계획에 대해 논의할 예정입니다.

오후 2시부터는 고객사와의 화상 회의가 있습니다. 주요 안건은 다음 분기 프로젝트 일정 논의입니다.

오후 4시에는 개발팀과 기술 리뷰 미팅이 있습니다. 최근 배포된 기능에 대한 피드백을 공유합니다.

저녁 7시에는 동료들과 간단한 저녁 식사가 예정되어 있으니 참고 부탁드립니다.

오늘 하루도 힘내시고, 필요하시면 언제든 연락 부탁드립니다.`

export default function LabPage() {
  const [tonePrompt, setTonePrompt] = useState('친근하고 따뜻한 말투로, 듣는 사람을 배려하는 느낌으로 전달해주세요.')
  const [selectedVoice, setSelectedVoice] = useState<VoiceModel>(VOICE_MODELS[0])
  const [rewrittenScript, setRewrittenScript] = useState<string>('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleRewriteScript = async () => {
    if (!tonePrompt.trim()) {
      setError('말투 프롬프트를 입력해주세요.')
      return
    }

    setIsRewriting(true)
    setError(null)
    setRewrittenScript('')
    setAudioUrl(null)

    try {
      console.log('✍️ 스크립트 재작성 요청:', {
        script: SAMPLE_SCRIPT.substring(0, 50),
        tonePrompt
      })

      const response = await fetch('/api/lab/rewrite-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: SAMPLE_SCRIPT,
          tonePrompt: tonePrompt
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `스크립트 재작성 실패: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.rewrittenScript) {
        setRewrittenScript(data.rewrittenScript)
        console.log('✅ 스크립트 재작성 완료:', data.rewrittenScript.length + '자')
      } else {
        throw new Error('재작성된 스크립트를 받지 못했습니다.')
      }
    } catch (err: any) {
      console.error('스크립트 재작성 오류:', err)
      setError(err.message || '스크립트 재작성에 실패했습니다.')
    } finally {
      setIsRewriting(false)
    }
  }

  const handleGenerateTTS = async () => {
    if (!rewrittenScript.trim()) {
      setError('먼저 스크립트를 재작성해주세요.')
      return
    }

    setIsGenerating(true)
    setError(null)
    setAudioUrl(null)
    setIsPlaying(false)

    try {
      console.log('🎤 TTS 생성 요청:', {
        text: rewrittenScript.substring(0, 50),
        voice: selectedVoice.id
      })

      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: rewrittenScript,
          voice: selectedVoice.id,
          speed: 1.0
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `TTS 생성 실패: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.audioContent) {
        // Base64 오디오를 Blob URL로 변환
        const mimeType = data.mimeType || 'audio/wav'
        const audioBlob = base64ToBlob(data.audioContent, mimeType)
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        
        // 오디오 자동 재생
        if (audioRef.current) {
          audioRef.current.src = url
          audioRef.current.play()
          setIsPlaying(true)
        }
      } else {
        throw new Error('오디오 데이터를 받지 못했습니다.')
      }
    } catch (err: any) {
      console.error('TTS 생성 오류:', err)
      setError(err.message || 'TTS 생성에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const handleAudioPlay = () => {
    setIsPlaying(true)
  }

  const handleAudioPause = () => {
    setIsPlaying(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Mic className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">TTS 실험실</h1>
          </div>
          <p className="text-gray-600">
            말투와 음성을 조절하여 다양한 TTS 결과를 실험해보세요
          </p>
        </div>

        {/* 샘플 대본 표시 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>샘플 대본</span>
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {SAMPLE_SCRIPT}
            </p>
          </div>
        </div>

        {/* 말투 프롬프트 입력 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            말투 설정
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              말투 프롬프트
            </label>
            <textarea
              value={tonePrompt}
              onChange={(e) => setTonePrompt(e.target.value)}
              placeholder="예: 친근하고 따뜻한 말투로, 듣는 사람을 배려하는 느낌으로 전달해주세요."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
            <p className="mt-2 text-xs text-gray-500">
              원하는 말투를 자유롭게 입력하세요. 예: "친근하고 따뜻하게", "진지하고 전문적으로", "밝고 활기차게"
            </p>
          </div>
        </div>

        {/* 스크립트 재작성 버튼 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={handleRewriteScript}
            disabled={isRewriting || !tonePrompt.trim()}
            className="w-full py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-semibold text-lg transition-all"
          >
            {isRewriting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>스크립트 재작성 중...</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                <span>스크립트 재작성</span>
              </>
            )}
          </button>
        </div>

        {/* 재작성된 스크립트 표시 */}
        {rewrittenScript && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              재작성된 스크립트
            </h2>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {rewrittenScript}
              </p>
            </div>
          </div>
        )}

        {/* 음성 모델 선택 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Volume2 className="w-5 h-5" />
            <span>음성 모델 선택</span>
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {VOICE_MODELS.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedVoice.id === voice.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-gray-900">
                  {voice.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* TTS 생성 버튼 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={handleGenerateTTS}
            disabled={isGenerating || !rewrittenScript.trim()}
            className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-semibold text-lg transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>TTS 생성 중...</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>TTS 생성</span>
              </>
            )}
          </button>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">오류</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* 오디오 플레이어 */}
        {audioUrl && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              생성된 오디오
            </h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePlayPause}
                className="p-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </button>
              <button
                onClick={handleStop}
                className="p-4 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-all"
              >
                <VolumeX className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <audio
                  ref={audioRef}
                  onEnded={handleAudioEnded}
                  onPlay={handleAudioPlay}
                  onPause={handleAudioPause}
                  className="w-full"
                  controls
                >
                  <source src={audioUrl} type="audio/wav" />
                  브라우저가 오디오 재생을 지원하지 않습니다.
                </audio>
              </div>
            </div>
          </div>
        )}

        {/* 사용 예시 */}
        <div className="bg-blue-50 rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            💡 사용 방법
          </h2>
          <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
            <li>
              <strong>말투 프롬프트 입력</strong>: 원하는 말투를 자유롭게 입력하세요. 예: "친근하고 따뜻하게", "진지하고 전문적으로", "밝고 활기차게"
            </li>
            <li>
              <strong>스크립트 재작성</strong>: "스크립트 재작성" 버튼을 눌러 샘플 대본을 말투에 맞게 재작성합니다.
            </li>
            <li>
              <strong>음성 모델 선택</strong>: 재작성된 스크립트로 TTS를 생성할 음성을 선택합니다.
            </li>
            <li>
              <strong>TTS 생성</strong>: 재작성된 스크립트로 음성을 생성하고 재생합니다.
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}

