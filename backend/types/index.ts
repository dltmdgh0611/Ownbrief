// 공통 타입 정의

export interface Podcast {
  id: string
  title: string
  description: string | null
  audioUrl: string | null
  duration: number | null
  status: string
  script: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface VideoInfo {
  id: string
  title: string
  thumbnail?: string
}

export interface UserSettings {
  id: string
  userId: string
  selectedPlaylists: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Playlist {
  id: string
  title: string
  description: string
  itemCount?: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  success?: boolean
  message?: string
}
