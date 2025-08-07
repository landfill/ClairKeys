/**
 * Piano Animation Data Types
 * Defines the structure for piano animation data and related interfaces
 */

export interface PianoNote {
  /** Note name with octave (e.g., 'C4', 'F#5') */
  note: string
  /** Start time in seconds */
  startTime: number
  /** Duration in seconds */
  duration: number
  /** Velocity (0-1) */
  velocity: number
  /** Optional: finger number for educational purposes */
  finger?: number
  /** Optional: hand (left/right) */
  hand?: 'left' | 'right'
}

export interface PianoAnimationData {
  /** Version of the animation data format */
  version: string
  /** Title of the piece */
  title: string
  /** Composer name */
  composer: string
  /** Total duration in seconds */
  duration: number
  /** Tempo in BPM */
  tempo: number
  /** Time signature (e.g., '4/4') */
  timeSignature: string
  /** Array of notes to be played */
  notes: PianoNote[]
  /** Additional metadata */
  metadata: {
    originalFileName: string
    fileSize: number
    processedAt: string
    extractedText?: string
    keySignature?: string
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
  }
}

export interface AnimationTimeline {
  /** Current playback time in seconds */
  currentTime: number
  /** Total duration in seconds */
  duration: number
  /** Currently active notes */
  activeNotes: Set<string>
  /** Notes that should start at current time */
  notesToStart: PianoNote[]
  /** Notes that should stop at current time */
  notesToStop: PianoNote[]
}

export interface AnimationState {
  /** Whether animation is currently playing */
  isPlaying: boolean
  /** Current playback time */
  currentTime: number
  /** Playback speed multiplier */
  speed: number
  /** Playback mode */
  mode: 'listen' | 'follow' | 'practice'
  /** Currently active notes */
  activeNotes: Set<string>
  /** Whether animation is ready to play */
  isReady: boolean
  /** Practice mode specific state */
  practiceState?: PracticeState
}

export interface PracticeState {
  /** Whether practice mode is active */
  isActive: boolean
  /** Current step in practice mode */
  currentStep: number
  /** Total number of steps */
  totalSteps: number
  /** Next note(s) to practice */
  nextNotes: PianoNote[]
  /** Whether waiting for user to proceed */
  isPaused: boolean
  /** Practice session statistics */
  sessionStats: PracticeSessionStats
}

export interface PracticeSessionStats {
  /** Session start time */
  startTime: number
  /** Total practice time in seconds */
  totalTime: number
  /** Number of steps completed */
  stepsCompleted: number
  /** Current tempo progression */
  currentTempo: number
  /** Target tempo */
  targetTempo: number
}

export interface AnimationEvent {
  /** Type of animation event */
  type: 'noteStart' | 'noteEnd' | 'timeUpdate' | 'playStateChange' | 'speedChange' | 
        'practiceStep' | 'practiceComplete' | 'tempoIncrease'
  /** Timestamp when event occurred */
  timestamp: number
  /** Event-specific data */
  data: {
    note?: string
    time?: number
    isPlaying?: boolean
    speed?: number
    velocity?: number
    step?: number
    totalSteps?: number
    nextNotes?: PianoNote[]
    tempo?: number
  }
}

export interface AnimationConfig {
  /** Update interval in milliseconds */
  updateInterval: number
  /** Look-ahead time for note preparation in seconds */
  lookAheadTime: number
  /** Minimum note duration in seconds */
  minNoteDuration: number
  /** Maximum simultaneous notes */
  maxSimultaneousNotes: number
}

export interface ValidationResult {
  /** Whether the data is valid */
  isValid: boolean
  /** Array of validation errors */
  errors: string[]
  /** Array of validation warnings */
  warnings: string[]
}

export interface AnimationParser {
  /** Parse raw data into PianoAnimationData */
  parse(data: any): Promise<PianoAnimationData>
  /** Validate animation data */
  validate(data: PianoAnimationData): ValidationResult
  /** Serialize animation data to string */
  serialize(data: PianoAnimationData): string
  /** Deserialize animation data from string */
  deserialize(serialized: string): PianoAnimationData
}

export interface AnimationEngine {
  /** Load animation data */
  loadAnimation(data: PianoAnimationData): void
  /** Start/resume playback */
  play(): void
  /** Pause playback */
  pause(): void
  /** Stop playback and reset to beginning */
  stop(): void
  /** Seek to specific time */
  seekTo(time: number): void
  /** Set playback speed */
  setSpeed(speed: number): void
  /** Set playback mode */
  setMode(mode: 'listen' | 'follow' | 'practice'): void
  /** Get current animation state */
  getState(): AnimationState
  /** Get timeline at specific time */
  getTimelineAt(time: number): AnimationTimeline
  /** Subscribe to animation events */
  on(event: string, callback: (event: AnimationEvent) => void): void
  /** Unsubscribe from animation events */
  off(event: string, callback: (event: AnimationEvent) => void): void
  
  // Practice mode methods
  /** Start practice mode */
  startPracticeMode(startTempo?: number, targetTempo?: number): void
  /** Proceed to next step in practice mode */
  nextPracticeStep(): void
  /** Get current practice state */
  getPracticeState(): PracticeState | null
  /** Set practice tempo progression */
  setPracticeTempoProgression(enabled: boolean, increment?: number): void
  /** Set loop section for practice */
  setLoopSection(startTime: number, endTime: number): void
  /** Clear loop section */
  clearLoopSection(): void
  /** Get current loop section */
  getLoopSection(): { start: number, end: number } | null
}