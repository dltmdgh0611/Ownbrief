'use client'

import { useState, useRef } from 'react'
import { Play, Pause, Volume2, Loader2, Mic, VolumeX, FileText, Calendar, BookOpen, TrendingUp } from 'lucide-react'

interface VoiceModel {
  id: string
  name: string
}

type SampleDataType = 'calendar' | 'notion' | 'trend'

interface SampleData {
  type: SampleDataType
  name: string
  icon: React.ReactNode
  script: string
}

const VOICE_MODELS: VoiceModel[] = [
  { id: 'Kore', name: 'Kore' },
  { id: 'Leda', name: 'Leda' },
  { id: 'Charon', name: 'Charon' },
]

// 샘플 데이터
const SAMPLE_DATA: Record<SampleDataType, SampleData> = {
  calendar: {
    type: 'calendar',
    name: '일정',
    icon: <Calendar className="w-5 h-5" />,
    script: `오늘 하루 일정을 간단히 브리핑드리겠습니다.

오전 10시에는 팀 미팅이 예정되어 있습니다. 주간 진행 상황과 다음 주 계획에 대해 논의할 예정입니다.

오후 2시부터는 고객사와의 화상 회의가 있습니다. 주요 안건은 다음 분기 프로젝트 일정 논의입니다.

오후 4시에는 개발팀과 기술 리뷰 미팅이 있습니다. 최근 배포된 기능에 대한 피드백을 공유합니다.

저녁 7시에는 동료들과 간단한 저녁 식사가 예정되어 있으니 참고 부탁드립니다.

오늘 하루도 힘내시고, 필요하시면 언제든 연락 부탁드립니다.`
  },
  notion: {
    type: 'notion',
    name: '노션',
    icon: <BookOpen className="w-5 h-5" />,
    script: `업무 진행 상황을 간단히 브리핑드리겠습니다.

최근 프로젝트 진행 상황을 확인해보니, 주요 작업들이 순조롭게 진행되고 있습니다. 디자인 시스템 리뷰 페이지가 최근 업데이트되었고, 이제 다음 단계인 개발 진행으로 넘어갈 준비가 되었습니다.

특히 제가 직접 태그된 작업으로는 사용자 피드백 반영 관련 문서가 있습니다. 이 작업은 이번 주 내로 완료 예정이며, 관련 팀원들과 협의가 필요한 부분들이 몇 가지 있어 주의 깊게 살펴봐야 할 것 같습니다.

전체적인 업무 진행 상황은 긍정적이며, 일정대로 잘 흘러가고 있습니다. 추가로 확인이 필요한 사항이 있으면 언제든 알려주세요.`
  },
  trend: {
    type: 'trend',
    name: '트렌드',
    icon: <TrendingUp className="w-5 h-5" />,
    script: `오늘 관심사 관련 트렌드를 간단히 브리핑드리겠습니다.

최근 AI 기술 분야에서 큰 주목을 받고 있는 것은 멀티모달 AI의 발전입니다. 텍스트와 이미지, 음성을 동시에 처리할 수 있는 모델들이 실제 서비스에 적용되기 시작했고, 이는 업무 효율성 향상에 큰 도움이 될 것으로 예상됩니다.

또한 프론트엔드 개발 트렌드로는 Next.js의 서버 컴포넌트 사용이 점차 보편화되고 있습니다. 이는 개발 생산성을 높이고 사용자 경험을 개선하는 데 핵심적인 역할을 하고 있어요.

마지막으로, 개발자 생산성 도구들이 계속해서 발전하고 있습니다. AI 기반 코드 생성과 리뷰 도구들이 실무에서 실제로 도움이 되는 사례들이 늘어나고 있어, 앞으로의 개발 방식에 영향을 줄 것으로 보입니다.

이런 트렌드들은 우리 업무에도 적용해볼 만한 부분들이 많으니 참고하시면 좋을 것 같습니다.`
  }
}

export default function LabPage() {
  const [selectedDataType, setSelectedDataType] = useState<SampleDataType>('calendar')
  const [tonePrompt, setTonePrompt] = useState('친근하고 따뜻한 말투로, 듣는 사람을 배려하는 느낌으로 전달해주세요.')
  const [selectedVoice, setSelectedVoice] = useState<VoiceModel>(VOICE_MODELS[0])
  const [rewrittenScript, setRewrittenScript] = useState<string>('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const currentSampleData = SAMPLE_DATA[selectedDataType]

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
        dataType: selectedDataType,
        script: currentSampleData.script.substring(0, 50),
        tonePrompt
      })

      const response = await fetch('/api/lab/rewrite-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: currentSampleData.script,
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

        {/* 샘플 데이터 선택 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            샘플 데이터 선택
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {(Object.values(SAMPLE_DATA) as SampleData[]).map((data) => (
              <button
                key={data.type}
                onClick={() => {
                  setSelectedDataType(data.type)
                  setRewrittenScript('')
                  setAudioUrl(null)
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedDataType === data.type
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {data.icon}
                  <span className="font-semibold text-gray-900">{data.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 샘플 대본 표시 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>샘플 대본 ({currentSampleData.name})</span>
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {currentSampleData.script}
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
              <strong>샘플 데이터 선택</strong>: 일정, 노션, 트렌드 중 하나를 선택하여 해당 데이터의 샘플 대본을 확인합니다.
            </li>
            <li>
              <strong>말투 프롬프트 입력</strong>: 원하는 말투를 자유롭게 입력하세요. 예: "친근하고 따뜻하게", "진지하고 전문적으로", "밝고 활기차게"
            </li>
            <li>
              <strong>스크립트 재작성</strong>: "스크립트 재작성" 버튼을 눌러 선택한 샘플 대본을 말투에 맞게 재작성합니다.
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

