/**
 * Web Audio API 기반 실시간 오디오 엔진
 */
export class AudioEngine {
  public audioContext: AudioContext
  private gainNode: GainNode
  private audioQueue: AudioBuffer[] = []
  private currentSource: AudioBufferSourceNode | null = null
  private isPlaying = false
  private onEndCallback?: () => void
  private onStartCallback?: () => void
  private onPlaybackEndCallback?: () => void

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.gainNode = this.audioContext.createGain()
    this.gainNode.connect(this.audioContext.destination)
    this.gainNode.gain.value = 1.0
  }

  /**
   * URL에서 오디오 로드 및 버퍼 생성
   */
  async loadAudioFromUrl(url: string): Promise<AudioBuffer> {
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      return audioBuffer
    } catch (error) {
      console.error('Error loading audio:', error)
      throw error
    }
  }

  /**
   * Base64 오디오 데이터를 버퍼로 변환
   */
  async loadAudioFromBase64(base64: string): Promise<AudioBuffer> {
    try {
      // data:audio/mp3;base64, 부분 제거
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
      
      // Base64 유효성 검사
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Empty base64 data')
      }
      
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer)
      return audioBuffer
    } catch (error) {
      console.error('Error decoding base64 audio:', error)
      // 폴백: 무음 오디오 버퍼 생성
      const sampleRate = this.audioContext.sampleRate
      const length = sampleRate * 1 // 1초 무음
      const buffer = this.audioContext.createBuffer(1, length, sampleRate)
      return buffer
    }
  }

  /**
   * 오디오 버퍼를 큐에 추가
   */
  addToQueue(audioBuffer: AudioBuffer) {
    this.audioQueue.push(audioBuffer)
    if (!this.isPlaying) {
      this.playNext()
    }
  }

  /**
   * 다음 오디오 재생
   */
  private playNext() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false
      this.onEndCallback?.()
      return
    }

    const audioBuffer = this.audioQueue.shift()!
    this.currentSource = this.audioContext.createBufferSource()
    this.currentSource.buffer = audioBuffer
    this.currentSource.connect(this.gainNode)
    
    this.currentSource.onended = () => {
      this.playNext()
    }

    this.currentSource.start()
    this.isPlaying = true
  }

  /**
   * 단일 오디오 버퍼 재생 (파이프라인 방식용)
   */
  playBuffer(audioBuffer: AudioBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 현재 재생 중인 것이 있으면 중지
        if (this.currentSource) {
          this.currentSource.stop()
          this.currentSource = null
        }

        this.currentSource = this.audioContext.createBufferSource()
        this.currentSource.buffer = audioBuffer
        this.currentSource.connect(this.gainNode)
        
        this.currentSource.onended = () => {
          this.currentSource = null
          this.onPlaybackEndCallback?.()
          resolve()
        }

        this.currentSource.start()
        this.onStartCallback?.()
        this.isPlaying = true
      } catch (error) {
        console.error('Error playing audio buffer:', error)
        reject(error)
      }
    })
  }

  /**
   * 볼륨 설정 (0.0 ~ 1.0)
   */
  setVolume(volume: number) {
    this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
  }

  /**
   * 페이드 인/아웃
   */
  fade(targetVolume: number, duration: number) {
    const currentTime = this.audioContext.currentTime
    this.gainNode.gain.cancelScheduledValues(currentTime)
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, currentTime)
    this.gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + duration)
  }

  /**
   * 재생 중지
   */
  stop() {
    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }
    this.audioQueue = []
    this.isPlaying = false
  }

  /**
   * 일시 정지 (AudioContext suspend)
   */
  async pause() {
    await this.audioContext.suspend()
  }

  /**
   * 재개 (AudioContext resume)
   */
  async resume() {
    await this.audioContext.resume()
  }

  /**
   * 종료 콜백 설정
   */
  onEnd(callback: () => void) {
    this.onEndCallback = callback
  }

  /**
   * 재생 시작 콜백 설정
   */
  onPlaybackStart(callback: () => void) {
    this.onStartCallback = callback
  }

  /**
   * 재생 완료 콜백 설정
   */
  onPlaybackEnd(callback: () => void) {
    this.onPlaybackEndCallback = callback
  }

  /**
   * 현재 재생 상태 반환
   */
  getPlayingStatus() {
    return this.isPlaying
  }

  /**
   * 정리
   */
  dispose() {
    this.stop()
    this.audioContext.close()
  }
}
