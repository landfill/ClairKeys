'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { FallingNote } from '@/types/fallingNotes'
import { useFallingNotesAudio, DEFAULT_MASTER_GAIN } from './useFallingNotesAudio'
import { calculateSongLength, shouldAutoStop } from '@/utils/visualUtils'
import { createLoopSection } from '@/utils/loopSection'

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
  const [volume, setVolumeState] = useState(DEFAULT_MASTER_GAIN)
  const [loopStart, setLoopStart] = useState<number | null>(null)
  const [loopEnd, setLoopEnd] = useState<number | null>(null)

  // Audio management
  const {
    startAudio,
    stopAudio,
    getCurrentTime,
    updateTempoScale,
    setOffsetTime,
    setVolume,
    sampleStatus,
    reset,
  } = useFallingNotesAudio()
  
  // Animation refs
  const rafRef = useRef<number | null>(null)

  // Calculate song length
  const totalLength = calculateSongLength(notes)

  /**
   * Start playback
   */
  // Returns whether playback actually began. The caller needs that: a request
  // made from the click — the orientation change is one — has to be undone when
  // the audio never starts, and `isPlaying` alone cannot distinguish "not yet"
  // from "never".
  const handlePlay = useCallback(async () => {
    if (isPlaying) return false

    updateTempoScale(tempoScale)
    const started = await startAudio(
      notes,
      getCurrentTime(),
      tempoScale,
      mute
    )
    if (started) setIsPlaying(true)
    return started
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

  const loopSection = createLoopSection(loopStart, loopEnd, totalLength)
  const markLoopStart = useCallback(() => {
    setLoopStart(currentTime)
    setLoopEnd(null)
  }, [currentTime])
  const markLoopEnd = useCallback(() => setLoopEnd(currentTime), [currentTime])
  const clearLoop = useCallback(() => {
    setLoopStart(null)
    setLoopEnd(null)
  }, [])

  /**
   * Change master volume live. The audio hook clamps to a headroom-safe ceiling
   * and applies it to the running bus; this mirrors the accepted value into
   * React state so the control and its readout reflect what is actually set.
   */
  const handleVolumeChange = useCallback((newVolume: number) => {
    // Store the value the audio hook actually applied after clamping, not the
    // raw request, so the readout can never show a level the bus is not at.
    const applied = setVolume(newVolume)
    setVolumeState(applied)
  }, [setVolume])

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

      if (loopSection && currentAudioTime >= loopSection.end) {
        void handleSeek(loopSection.start)
        return
      }

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
  }, [isPlaying, totalLength, getCurrentTime, handleStop, handleSeek, loopSection])

  return {
    // State
    isPlaying,
    currentTime,
    tempoScale,
    mute,
    lookAheadSec,
    volume,
    loopStart,
    loopEnd,
    sampleStatus,
    totalLength,

    // Actions
    play: handlePlay,
    pause: handlePause,
    stop: handleStop,
    seek: handleSeek,
    setTempoScale: handleTempoChange,
    setMute: handleMuteChange,
    setLookAheadSec: handleLookAheadChange,
    setVolume: handleVolumeChange,
    markLoopStart,
    markLoopEnd,
    clearLoop,

    // Combined play/pause toggle
    togglePlayPause: isPlaying ? handlePause : handlePlay
  }
}
