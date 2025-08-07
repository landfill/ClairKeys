/**
 * Animation Engine Service
 * Handles time-based animation playback, key highlighting, and audio synchronization
 */

import { 
  PianoAnimationData,
  PianoNote,
  AnimationState,
  AnimationTimeline,
  AnimationEvent,
  AnimationConfig,
  AnimationEngine as IAnimationEngine,
  PracticeState,
  PracticeSessionStats
} from '@/types/animation'
import { getAudioService } from './audioService'

export class AnimationEngine implements IAnimationEngine {
  private animationData: PianoAnimationData | null = null
  private state: AnimationState = {
    isPlaying: false,
    currentTime: 0,
    speed: 1.0,
    mode: 'listen',
    activeNotes: new Set(),
    isReady: false
  }
  
  private config: AnimationConfig = {
    updateInterval: 16, // ~60fps
    lookAheadTime: 0.1, // 100ms look-ahead
    minNoteDuration: 0.05, // 50ms minimum
    maxSimultaneousNotes: 10
  }

  private intervalId: NodeJS.Timeout | null = null
  private startTime: number = 0
  private pausedTime: number = 0
  private eventListeners: Map<string, Set<(event: AnimationEvent) => void>> = new Map()
  private audioService = getAudioService()
  
  // Practice mode specific properties
  private practiceState: PracticeState | null = null
  private practiceSteps: PianoNote[][] = []
  private tempoProgressionEnabled = false
  private tempoIncrement = 0.1
  private loopSection: { start: number, end: number } | null = null

  /**
   * Load animation data
   */
  loadAnimation(data: PianoAnimationData): void {
    this.stop()
    this.animationData = data
    this.state.isReady = true
    this.state.currentTime = 0
    this.pausedTime = 0
    
    this.emitEvent({
      type: 'timeUpdate',
      timestamp: Date.now(),
      data: { time: 0 }
    })
  }

  /**
   * Start/resume playback
   */
  play(): void {
    if (!this.animationData || !this.state.isReady) {
      console.warn('Animation data not loaded')
      return
    }

    if (this.state.isPlaying) return

    this.state.isPlaying = true
    this.startTime = Date.now()
    
    // Initialize audio if needed
    if (!this.audioService.isReady()) {
      this.audioService.initialize().catch(console.error)
    }

    this.startAnimationLoop()
    
    this.emitEvent({
      type: 'playStateChange',
      timestamp: Date.now(),
      data: { isPlaying: true }
    })
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.state.isPlaying) return

    this.state.isPlaying = false
    this.pausedTime = this.state.currentTime
    this.stopAnimationLoop()
    
    // Stop all active notes
    this.state.activeNotes.forEach(note => {
      this.audioService.releaseNote(note)
      this.emitEvent({
        type: 'noteEnd',
        timestamp: Date.now(),
        data: { note }
      })
    })
    this.state.activeNotes.clear()

    this.emitEvent({
      type: 'playStateChange',
      timestamp: Date.now(),
      data: { isPlaying: false }
    })
  }

  /**
   * Stop playback and reset to beginning
   */
  stop(): void {
    this.pause()
    this.state.currentTime = 0
    this.pausedTime = 0
    
    this.emitEvent({
      type: 'timeUpdate',
      timestamp: Date.now(),
      data: { time: 0 }
    })
  }

  /**
   * Seek to specific time
   */
  seekTo(time: number): void {
    if (!this.animationData) return

    const clampedTime = Math.max(0, Math.min(time, this.animationData.duration))
    const wasPlaying = this.state.isPlaying
    
    // Stop current playback
    if (this.state.isPlaying) {
      this.pause()
    }
    
    this.state.currentTime = clampedTime
    this.pausedTime = clampedTime
    
    // Update active notes for new time
    this.updateActiveNotes(clampedTime)
    
    // Resume if was playing
    if (wasPlaying) {
      this.play()
    }
    
    this.emitEvent({
      type: 'timeUpdate',
      timestamp: Date.now(),
      data: { time: clampedTime }
    })
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    const clampedSpeed = Math.max(0.25, Math.min(4.0, speed))
    const wasPlaying = this.state.isPlaying
    
    if (wasPlaying) {
      // Adjust timing for new speed
      this.pausedTime = this.state.currentTime
      this.startTime = Date.now()
    }
    
    this.state.speed = clampedSpeed
    
    this.emitEvent({
      type: 'speedChange',
      timestamp: Date.now(),
      data: { speed: clampedSpeed }
    })
  }

  /**
   * Set playback mode
   */
  setMode(mode: 'listen' | 'follow' | 'practice'): void {
    this.state.mode = mode
    
    // In follow mode, pause until user input
    if (mode === 'follow' && this.state.isPlaying) {
      this.pause()
    }
    
    // In practice mode, stop playback and prepare practice steps
    if (mode === 'practice') {
      this.pause()
      this.preparePracticeSteps()
    } else {
      // Exit practice mode
      this.practiceState = null
      this.state.practiceState = undefined
    }
  }

  /**
   * Get current animation state
   */
  getState(): AnimationState {
    return { ...this.state, activeNotes: new Set(this.state.activeNotes) }
  }

  /**
   * Get timeline at specific time
   */
  getTimelineAt(time: number): AnimationTimeline {
    if (!this.animationData) {
      return {
        currentTime: time,
        duration: 0,
        activeNotes: new Set(),
        notesToStart: [],
        notesToStop: []
      }
    }

    const activeNotes = new Set<string>()
    const notesToStart: PianoNote[] = []
    const notesToStop: PianoNote[] = []
    
    const timeWindow = this.config.lookAheadTime
    
    this.animationData.notes.forEach(note => {
      const noteEndTime = note.startTime + note.duration
      
      // Check if note is active at this time
      if (time >= note.startTime && time < noteEndTime) {
        activeNotes.add(note.note)
      }
      
      // Check if note should start soon
      if (note.startTime >= time && note.startTime < time + timeWindow) {
        notesToStart.push(note)
      }
      
      // Check if note should stop soon
      if (noteEndTime >= time && noteEndTime < time + timeWindow) {
        notesToStop.push(note)
      }
    })

    return {
      currentTime: time,
      duration: this.animationData.duration,
      activeNotes,
      notesToStart,
      notesToStop
    }
  }

  /**
   * Subscribe to animation events
   */
  on(event: string, callback: (event: AnimationEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  /**
   * Unsubscribe from animation events
   */
  off(event: string, callback: (event: AnimationEvent) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  /**
   * Process user input for follow mode
   */
  processUserInput(note: string): boolean {
    if (this.state.mode !== 'follow' || !this.animationData) {
      return false
    }

    // Find the next expected note
    const expectedNotes = this.getExpectedNotesAtTime(this.state.currentTime)
    const isCorrect = expectedNotes.includes(note)
    
    if (isCorrect) {
      // Play the note
      this.audioService.playNote(note, 0.8)
      
      // Advance time slightly to progress through the piece
      const nextTime = this.findNextNoteTime(this.state.currentTime)
      if (nextTime > this.state.currentTime) {
        this.seekTo(nextTime)
      }
    }
    
    return isCorrect
  }

  /**
   * Start the animation loop
   */
  private startAnimationLoop(): void {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      this.updateAnimation()
    }, this.config.updateInterval)
  }

  /**
   * Stop the animation loop
   */
  private stopAnimationLoop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Update animation state
   */
  private updateAnimation(): void {
    if (!this.animationData || !this.state.isPlaying) return

    const elapsed = (Date.now() - this.startTime) / 1000 * this.state.speed
    let newTime = this.pausedTime + elapsed

    // Handle loop section
    if (this.loopSection) {
      if (newTime >= this.loopSection.end) {
        // Loop back to start
        this.seekTo(this.loopSection.start)
        return
      }
    } else {
      // Check if animation finished (no loop)
      if (newTime >= this.animationData.duration) {
        this.stop()
        return
      }
    }

    this.state.currentTime = newTime
    this.updateActiveNotes(newTime)
    
    this.emitEvent({
      type: 'timeUpdate',
      timestamp: Date.now(),
      data: { time: newTime }
    })
  }

  /**
   * Update active notes based on current time
   */
  private updateActiveNotes(time: number): void {
    if (!this.animationData) return

    const timeline = this.getTimelineAt(time)
    const previousActiveNotes = new Set(this.state.activeNotes)
    
    // Start new notes
    timeline.activeNotes.forEach(note => {
      if (!previousActiveNotes.has(note)) {
        const noteData = this.animationData!.notes.find(n => n.note === note && n.startTime <= time && n.startTime + n.duration > time)
        if (noteData) {
          this.audioService.playNote(note, noteData.velocity || 0.8)
          this.emitEvent({
            type: 'noteStart',
            timestamp: Date.now(),
            data: { note, velocity: noteData.velocity }
          })
        }
      }
    })
    
    // Stop old notes
    previousActiveNotes.forEach(note => {
      if (!timeline.activeNotes.has(note)) {
        this.audioService.releaseNote(note)
        this.emitEvent({
          type: 'noteEnd',
          timestamp: Date.now(),
          data: { note }
        })
      }
    })
    
    this.state.activeNotes = timeline.activeNotes
  }

  /**
   * Get expected notes at current time for follow mode
   */
  private getExpectedNotesAtTime(time: number): string[] {
    if (!this.animationData) return []

    const tolerance = 0.2 // 200ms tolerance
    return this.animationData.notes
      .filter(note => 
        Math.abs(note.startTime - time) <= tolerance
      )
      .map(note => note.note)
  }

  /**
   * Find the next note time after current time
   */
  private findNextNoteTime(currentTime: number): number {
    if (!this.animationData) return currentTime

    const nextNote = this.animationData.notes
      .filter(note => note.startTime > currentTime)
      .sort((a, b) => a.startTime - b.startTime)[0]
    
    return nextNote ? nextNote.startTime : currentTime
  }

  /**
   * Emit animation event
   */
  private emitEvent(event: AnimationEvent): void {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event)
        } catch (error) {
          console.error('Error in animation event listener:', error)
        }
      })
    }
  }

  /**
   * Start practice mode
   */
  startPracticeMode(startTempo: number = 0.5, targetTempo: number = 1.0): void {
    if (!this.animationData) return

    this.practiceState = {
      isActive: true,
      currentStep: 0,
      totalSteps: this.practiceSteps.length,
      nextNotes: this.practiceSteps[0] || [],
      isPaused: true,
      sessionStats: {
        startTime: Date.now(),
        totalTime: 0,
        stepsCompleted: 0,
        currentTempo: startTempo,
        targetTempo: targetTempo
      }
    }

    this.state.practiceState = this.practiceState
    this.setSpeed(startTempo)
    
    this.emitEvent({
      type: 'practiceStep',
      timestamp: Date.now(),
      data: {
        step: 0,
        totalSteps: this.practiceSteps.length,
        nextNotes: this.practiceSteps[0] || [],
        tempo: startTempo
      }
    })
  }

  /**
   * Proceed to next step in practice mode
   */
  nextPracticeStep(): void {
    if (!this.practiceState || !this.animationData) return

    // Update session stats
    this.practiceState.sessionStats.stepsCompleted++
    this.practiceState.sessionStats.totalTime = (Date.now() - this.practiceState.sessionStats.startTime) / 1000

    // Move to next step
    this.practiceState.currentStep++

    if (this.practiceState.currentStep >= this.practiceSteps.length) {
      // Practice complete
      this.emitEvent({
        type: 'practiceComplete',
        timestamp: Date.now(),
        data: {
          step: this.practiceState.currentStep,
          totalSteps: this.practiceSteps.length
        }
      })
      
      // Optionally increase tempo and restart
      if (this.tempoProgressionEnabled && this.practiceState.sessionStats.currentTempo < this.practiceState.sessionStats.targetTempo) {
        const newTempo = Math.min(
          this.practiceState.sessionStats.targetTempo,
          this.practiceState.sessionStats.currentTempo + this.tempoIncrement
        )
        this.practiceState.sessionStats.currentTempo = newTempo
        this.practiceState.currentStep = 0
        this.practiceState.sessionStats.stepsCompleted = 0
        this.setSpeed(newTempo)
        
        this.emitEvent({
          type: 'tempoIncrease',
          timestamp: Date.now(),
          data: {
            tempo: newTempo,
            step: 0,
            totalSteps: this.practiceSteps.length
          }
        })
      }
    }

    // Update next notes
    this.practiceState.nextNotes = this.practiceSteps[this.practiceState.currentStep] || []
    this.state.practiceState = this.practiceState

    this.emitEvent({
      type: 'practiceStep',
      timestamp: Date.now(),
      data: {
        step: this.practiceState.currentStep,
        totalSteps: this.practiceSteps.length,
        nextNotes: this.practiceState.nextNotes,
        tempo: this.practiceState.sessionStats.currentTempo
      }
    })
  }

  /**
   * Get current practice state
   */
  getPracticeState(): PracticeState | null {
    return this.practiceState
  }

  /**
   * Set practice tempo progression
   */
  setPracticeTempoProgression(enabled: boolean, increment: number = 0.1): void {
    this.tempoProgressionEnabled = enabled
    this.tempoIncrement = increment
  }

  /**
   * Set loop section for practice
   */
  setLoopSection(startTime: number, endTime: number): void {
    if (!this.animationData) return
    
    const clampedStart = Math.max(0, Math.min(startTime, this.animationData.duration))
    const clampedEnd = Math.max(clampedStart + 1, Math.min(endTime, this.animationData.duration))
    
    this.loopSection = {
      start: clampedStart,
      end: clampedEnd
    }
  }

  /**
   * Clear loop section
   */
  clearLoopSection(): void {
    this.loopSection = null
  }

  /**
   * Get current loop section
   */
  getLoopSection(): { start: number, end: number } | null {
    return this.loopSection
  }

  /**
   * Prepare practice steps from animation data
   */
  private preparePracticeSteps(): void {
    if (!this.animationData) return

    this.practiceSteps = []
    const sortedNotes = [...this.animationData.notes].sort((a, b) => a.startTime - b.startTime)
    
    // Group notes by time (allowing for small timing differences)
    const timeThreshold = 0.1 // 100ms threshold for grouping simultaneous notes
    let currentGroup: PianoNote[] = []
    let currentTime = -1

    for (const note of sortedNotes) {
      if (currentTime < 0 || Math.abs(note.startTime - currentTime) <= timeThreshold) {
        // Add to current group
        currentGroup.push(note)
        if (currentTime < 0) currentTime = note.startTime
      } else {
        // Start new group
        if (currentGroup.length > 0) {
          this.practiceSteps.push([...currentGroup])
        }
        currentGroup = [note]
        currentTime = note.startTime
      }
    }

    // Add final group
    if (currentGroup.length > 0) {
      this.practiceSteps.push([...currentGroup])
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stop()
    this.eventListeners.clear()
    this.animationData = null
    this.state.isReady = false
    this.practiceState = null
    this.practiceSteps = []
    this.loopSection = null
  }
}

// Export singleton instance
let animationEngineInstance: AnimationEngine | null = null

export function getAnimationEngine(): AnimationEngine {
  if (!animationEngineInstance) {
    animationEngineInstance = new AnimationEngine()
  }
  return animationEngineInstance
} 