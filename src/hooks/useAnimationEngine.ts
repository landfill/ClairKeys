/**
 * Animation Engine Hook
 * Provides easy access to animation engine functionality with React integration
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { getAnimationEngine } from '@/services/animationEngine'
import { PianoAnimationData, AnimationState, AnimationEvent } from '@/types/animation'

export interface UseAnimationEngineOptions {
  /** Auto-initialize audio on first play */
  autoInitAudio?: boolean
  /** Enable debug logging */
  debug?: boolean
}

export interface UseAnimationEngineReturn {
  /** Current animation state */
  state: AnimationState
  /** Load animation data */
  loadAnimation: (data: PianoAnimationData) => void
  /** Start/resume playback */
  play: () => void
  /** Pause playback */
  pause: () => void
  /** Stop playback and reset */
  stop: () => void
  /** Seek to specific time */
  seekTo: (time: number) => void
  /** Set playback speed */
  setSpeed: (speed: number) => void
  /** Set playback mode */
  setMode: (mode: 'listen' | 'follow') => void
  /** Process user input for follow mode */
  processUserInput: (note: string) => boolean
  /** Subscribe to animation events */
  addEventListener: (event: string, callback: (event: AnimationEvent) => void) => void
  /** Unsubscribe from animation events */
  removeEventListener: (event: string, callback: (event: AnimationEvent) => void) => void
}

export function useAnimationEngine(options: UseAnimationEngineOptions = {}): UseAnimationEngineReturn {
  const { autoInitAudio = true, debug = false } = options
  
  const [state, setState] = useState<AnimationState>({
    isPlaying: false,
    currentTime: 0,
    speed: 1.0,
    mode: 'listen',
    activeNotes: new Set(),
    isReady: false
  })

  const engineRef = useRef(getAnimationEngine())
  const eventListenersRef = useRef<Map<string, Set<(event: AnimationEvent) => void>>>(new Map())

  // Update state when engine state changes
  const updateState = useCallback(() => {
    const newState = engineRef.current.getState()
    setState(newState)
    
    if (debug) {
      console.log('Animation state updated:', newState)
    }
  }, [debug])

  // Set up event listeners
  useEffect(() => {
    const engine = engineRef.current

    const handleTimeUpdate = (event: AnimationEvent) => {
      updateState()
      // Notify external listeners
      const listeners = eventListenersRef.current.get('timeUpdate')
      listeners?.forEach(callback => callback(event))
    }

    const handlePlayStateChange = (event: AnimationEvent) => {
      updateState()
      // Notify external listeners
      const listeners = eventListenersRef.current.get('playStateChange')
      listeners?.forEach(callback => callback(event))
    }

    const handleSpeedChange = (event: AnimationEvent) => {
      updateState()
      // Notify external listeners
      const listeners = eventListenersRef.current.get('speedChange')
      listeners?.forEach(callback => callback(event))
    }

    const handleNoteStart = (event: AnimationEvent) => {
      updateState()
      // Notify external listeners
      const listeners = eventListenersRef.current.get('noteStart')
      listeners?.forEach(callback => callback(event))
    }

    const handleNoteEnd = (event: AnimationEvent) => {
      updateState()
      // Notify external listeners
      const listeners = eventListenersRef.current.get('noteEnd')
      listeners?.forEach(callback => callback(event))
    }

    engine.on('timeUpdate', handleTimeUpdate)
    engine.on('playStateChange', handlePlayStateChange)
    engine.on('speedChange', handleSpeedChange)
    engine.on('noteStart', handleNoteStart)
    engine.on('noteEnd', handleNoteEnd)

    // Initial state sync
    updateState()

    return () => {
      engine.off('timeUpdate', handleTimeUpdate)
      engine.off('playStateChange', handlePlayStateChange)
      engine.off('speedChange', handleSpeedChange)
      engine.off('noteStart', handleNoteStart)
      engine.off('noteEnd', handleNoteEnd)
    }
  }, [updateState])

  const loadAnimation = useCallback((data: PianoAnimationData) => {
    engineRef.current.loadAnimation(data)
    updateState()
    
    if (debug) {
      console.log('Animation loaded:', data.title)
    }
  }, [updateState, debug])

  const play = useCallback(() => {
    engineRef.current.play()
    
    if (debug) {
      console.log('Animation play requested')
    }
  }, [debug])

  const pause = useCallback(() => {
    engineRef.current.pause()
    
    if (debug) {
      console.log('Animation pause requested')
    }
  }, [debug])

  const stop = useCallback(() => {
    engineRef.current.stop()
    
    if (debug) {
      console.log('Animation stop requested')
    }
  }, [debug])

  const seekTo = useCallback((time: number) => {
    engineRef.current.seekTo(time)
    
    if (debug) {
      console.log('Animation seek to:', time)
    }
  }, [debug])

  const setSpeed = useCallback((speed: number) => {
    engineRef.current.setSpeed(speed)
    
    if (debug) {
      console.log('Animation speed set to:', speed)
    }
  }, [debug])

  const setMode = useCallback((mode: 'listen' | 'follow') => {
    engineRef.current.setMode(mode)
    
    if (debug) {
      console.log('Animation mode set to:', mode)
    }
  }, [debug])

  const processUserInput = useCallback((note: string): boolean => {
    const result = engineRef.current.processUserInput(note)
    
    if (debug) {
      console.log('User input processed:', note, 'correct:', result)
    }
    
    return result
  }, [debug])

  const addEventListener = useCallback((event: string, callback: (event: AnimationEvent) => void) => {
    if (!eventListenersRef.current.has(event)) {
      eventListenersRef.current.set(event, new Set())
    }
    eventListenersRef.current.get(event)!.add(callback)
  }, [])

  const removeEventListener = useCallback((event: string, callback: (event: AnimationEvent) => void) => {
    const listeners = eventListenersRef.current.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }, [])

  return {
    state,
    loadAnimation,
    play,
    pause,
    stop,
    seekTo,
    setSpeed,
    setMode,
    processUserInput,
    addEventListener,
    removeEventListener
  }
}