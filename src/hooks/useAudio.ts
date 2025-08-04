'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { getAudioService, initializeAudio, AudioSettings } from '@/services/audioService'

export interface UseAudioOptions {
  autoInitialize?: boolean
  defaultVelocity?: number
  enableKeyboardShortcuts?: boolean
}

export interface UseAudioReturn {
  playNote: (note: string, velocity?: number, duration?: number) => void
  releaseNote: (note: string) => void
  playChord: (notes: string[], velocity?: number, duration?: number) => void
  releaseChord: (notes: string[]) => void
  stopAllNotes: () => void
  initializeAudio: () => Promise<void>
  updateSettings: (settings: Partial<AudioSettings>) => void
  getSettings: () => AudioSettings
  setEnabled: (enabled: boolean) => void
  isReady: boolean
  isInitialized: boolean
  contextState: string
}

export function useAudio(options: UseAudioOptions = {}): UseAudioReturn {
  const {
    autoInitialize = false,
    defaultVelocity = 0.8,
    enableKeyboardShortcuts = false
  } = options

  const audioService = useRef(getAudioService())
  const [isReady, setIsReady] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [contextState, setContextState] = useState('suspended')

  // Initialize audio service
  const handleInitializeAudio = useCallback(async () => {
    try {
      await initializeAudio()
      setIsInitialized(true)
      setIsReady(audioService.current.isReady())
      setContextState(audioService.current.getContextState())
    } catch (error) {
      console.error('Failed to initialize audio:', error)
    }
  }, [])

  // Play a single note
  const playNote = useCallback((note: string, velocity?: number, duration?: number) => {
    audioService.current.playNote(note, velocity ?? defaultVelocity, duration)
  }, [defaultVelocity])

  // Release a single note
  const releaseNote = useCallback((note: string) => {
    audioService.current.releaseNote(note)
  }, [])

  // Play multiple notes (chord)
  const playChord = useCallback((notes: string[], velocity?: number, duration?: number) => {
    audioService.current.playChord(notes, velocity ?? defaultVelocity, duration)
  }, [defaultVelocity])

  // Release multiple notes
  const releaseChord = useCallback((notes: string[]) => {
    audioService.current.releaseChord(notes)
  }, [])

  // Stop all notes
  const stopAllNotes = useCallback(() => {
    audioService.current.stopAllNotes()
  }, [])

  // Update audio settings
  const updateSettings = useCallback((settings: Partial<AudioSettings>) => {
    audioService.current.updateSettings(settings)
    setIsReady(audioService.current.isReady())
  }, [])

  // Get current settings
  const getSettings = useCallback(() => {
    return audioService.current.getSettings()
  }, [])

  // Enable/disable audio
  const setEnabled = useCallback((enabled: boolean) => {
    audioService.current.setEnabled(enabled)
    setIsReady(audioService.current.isReady())
  }, [])

  // Keyboard shortcuts for testing
  useEffect(() => {
    if (!enableKeyboardShortcuts) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      // Map keyboard keys to piano notes
      const keyMap: Record<string, string> = {
        'a': 'C4',
        'w': 'C#4',
        's': 'D4',
        'e': 'D#4',
        'd': 'E4',
        'f': 'F4',
        't': 'F#4',
        'g': 'G4',
        'y': 'G#4',
        'h': 'A4',
        'u': 'A#4',
        'j': 'B4',
        'k': 'C5'
      }

      const note = keyMap[event.key.toLowerCase()]
      if (note && !event.repeat) {
        playNote(note)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const keyMap: Record<string, string> = {
        'a': 'C4',
        'w': 'C#4',
        's': 'D4',
        'e': 'D#4',
        'd': 'E4',
        'f': 'F4',
        't': 'F#4',
        'g': 'G4',
        'y': 'G#4',
        'h': 'A4',
        'u': 'A#4',
        'j': 'B4',
        'k': 'C5'
      }

      const note = keyMap[event.key.toLowerCase()]
      if (note) {
        releaseNote(note)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [enableKeyboardShortcuts, playNote, releaseNote])

  // Auto-initialize if requested
  useEffect(() => {
    if (autoInitialize) {
      handleInitializeAudio()
    }
  }, [autoInitialize, handleInitializeAudio])

  // Update state when audio service changes
  useEffect(() => {
    const checkState = () => {
      setIsReady(audioService.current.isReady())
      // getContextState 메서드가 없으므로 기본값 사용
      setContextState('running')
    }

    // Check state periodically
    const interval = setInterval(checkState, 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't dispose the service as it's a singleton
      // Just stop all notes
      audioService.current.stopAllNotes()
    }
  }, [])

  return {
    playNote,
    releaseNote,
    playChord,
    releaseChord,
    stopAllNotes,
    initializeAudio: handleInitializeAudio,
    updateSettings,
    getSettings,
    setEnabled,
    isReady,
    isInitialized,
    contextState
  }
}