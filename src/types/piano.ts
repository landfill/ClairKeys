export interface PianoKey {
  note: string
  octave: number
  keyNumber: number
  isBlack: boolean
  x: number
  y: number
  width: number
  height: number
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

export type PianoMode = 'listen' | 'follow'

export interface PianoKeyboardProps {
  onKeyPress?: (key: string) => void
  onKeyRelease?: (key: string) => void
  highlightedKeys?: string[]
  pressedKeys?: string[]
  animationActiveKeys?: string[]
  className?: string
  height?: number
}