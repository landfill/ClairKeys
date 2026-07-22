'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { FallingNote } from '@/types/fallingNotes'
import { useFallingNotesAudio } from './useFallingNotesAudio'
import { calculateSongLength, shouldAutoStop } from '@/utils/visualUtils'

/**
 * Main hook for falling notes player with audio-visual synchronization
 * Based on MVP implementation for precise timing
 */
export function useFallingNotesPlayer(notes: FallingNote[]) {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [tempoScale, setTempoScale] = useState(1.0)
  const [mute, setMute] = useState(false)
  const [lookAheadSec, setLookAheadSec] = useState(1.5)

  // Audio management
  const {
    startAudio,
    stopAudio,
    getCurrentTime,
    updateTempoScale,
    setOffsetTime,
    reset,
  } = useFallingNotesAudio()
  
  // Animation refs
  const rafRef = useRef<number | null>(null)

  // Calculate song length
  const totalLength = calculateSongLength(notes)

  /**
   * Start playback
   */
  const handlePlay = useCallback(async () => {
    if (isPlaying) return

    updateTempoScale(tempoScale)
    const started = await startAudio(
      notes,
      getCurrentTime(),
      tempoScale,
      mute
    )
    if (started) setIsPlaying(true)
  }, [isPlaying, tempoScale, mute, notes, getCurrentTime, startAudio, updateTempoScale])

  /**
   * Pause playback
   */
  const handlePause = useCallback(() => {
    if (!isPlaying) return

    // Get precise current time from audio context
    const currentAudioTime = getCurrentTime()
    setIsPlaying(false)
    stopAudio()
    setOffsetTime(currentAudioTime)
    setCurrentTime(currentAudioTime)
  }, [isPlaying, getCurrentTime, setOffsetTime, stopAudio])

  /**
   * Stop playback
   */
  const handleStop = useCallback(() => {
    setIsPlaying(false)
    reset()
    setCurrentTime(0)
  }, [reset])

  /**
   * Seek to specific time
   */
  const handleSeek = useCallback(async (newTime: number) => {
    const clampedTime = Math.max(0, Math.min(newTime, totalLength))
    if (!isPlaying) stopAudio()
    setOffsetTime(clampedTime)
    setCurrentTime(clampedTime)

    // If currently playing, restart audio from new position
    if (isPlaying) {
      const started = await startAudio(notes, clampedTime, tempoScale, mute)
      if (!started) setIsPlaying(false)
    }
  }, [totalLength, isPlaying, notes, tempoScale, mute, setOffsetTime, startAudio, stopAudio])

  /**
   * Change tempo with re-synchronization
   */
  const handleTempoChange = useCallback(async (newTempoScale: number) => {
    const wasPlaying = isPlaying

    if (wasPlaying) {
      // Get current precise time before stopping
      const currentAudioTime = getCurrentTime()
      stopAudio()

      // Update tempo scale
      setTempoScale(newTempoScale)
      updateTempoScale(newTempoScale)

      // Restart with new tempo
      setOffsetTime(currentAudioTime)
      const started = await startAudio(notes, currentAudioTime, newTempoScale, mute)
      if (!started) setIsPlaying(false)
    } else {
      stopAudio()
      setTempoScale(newTempoScale)
      updateTempoScale(newTempoScale)
    }
  }, [isPlaying, mute, notes, getCurrentTime, setOffsetTime, startAudio, stopAudio, updateTempoScale])

  /**
   * Toggle mute
   */
  const handleMuteChange = useCallback(async (newMute: boolean) => {
    setMute(newMute)

    // If currently playing, restart audio with new mute setting
    if (isPlaying) {
      const currentAudioTime = getCurrentTime()
      stopAudio()
      const started = await startAudio(notes, currentAudioTime, tempoScale, newMute)
      if (!started) setIsPlaying(false)
    } else {
      stopAudio()
    }
  }, [isPlaying, tempoScale, notes, getCurrentTime, startAudio, stopAudio])

  /**
   * Change look ahead time
   */
  const handleLookAheadChange = useCallback((newLookAheadSec: number) => {
    setLookAheadSec(Math.max(1, Math.min(5, newLookAheadSec)))
  }, [])

  // Enhanced animation loop with precise audio-visual synchronization
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const animationLoop = () => {
      // Audio, falling notes, and active keys all consume this one score-time
      // value derived from the AudioContext playback anchor.
      const currentAudioTime = getCurrentTime()
      setCurrentTime(currentAudioTime)

      // Auto-stop when song ends
      if (shouldAutoStop(currentAudioTime, totalLength, 2)) {
        handleStop()
        return
      }

      rafRef.current = requestAnimationFrame(animationLoop)
    }

    rafRef.current = requestAnimationFrame(animationLoop)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, totalLength, getCurrentTime, handleStop])

  return {
    // State
    isPlaying,
    currentTime,
    tempoScale,
    mute,
    lookAheadSec,
    totalLength,

    // Actions
    play: handlePlay,
    pause: handlePause,
    stop: handleStop,
    seek: handleSeek,
    setTempoScale: handleTempoChange,
    setMute: handleMuteChange,
    setLookAheadSec: handleLookAheadChange,

    // Combined play/pause toggle
    togglePlayPause: isPlaying ? handlePause : handlePlay
  }
}
