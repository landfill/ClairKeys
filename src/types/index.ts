// Clairkeys - Core types for the piano learning app

export interface User {
  id: string
  name?: string | null
  email: string
  image?: string | null
  createdAt: Date
}

export interface Category {
  id: number
  name: string
  userId: string
  createdAt: Date
}

export interface SheetMusic {
  id: number
  title: string
  composer: string
  userId: string
  categoryId?: number | null
  isPublic: boolean
  animationDataUrl: string
  createdAt: Date
  updatedAt: Date
  category?: Category
}

export interface SheetMusicMetadata {
  title: string
  composer: string
  category: string
  isPublic: boolean
  userId: string
}

export interface PianoNote {
  key: string // 'C4', 'D#5' etc.
  startTime: number
  duration: number
  velocity: number
}

export interface PianoAnimationData {
  notes: PianoNote[]
  duration: number
  tempo: number
}

export interface PracticeSession {
  id: number
  userId: string
  sheetMusicId: number
  durationSeconds: number
  completedPercentage: number
  createdAt: Date
}

export type PlayMode = 'listen' | 'follow'

export interface AnimationState {
  isPlaying: boolean
  currentPosition: number
  speed: number
  mode: PlayMode
}