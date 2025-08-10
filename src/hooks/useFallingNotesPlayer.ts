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
  const [lookAheadSec, setLookAheadSec] = useState(2.5)

  // Audio management
  const audioPlayback = useFallingNotesAudio()
  
  // Animation refs
  const rafRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const syncCheckIntervalRef = useRef<number>(0)

  // Calculate song length
  const totalLength = calculateSongLength(notes)

  /**
   * Start playback
   */
  const handlePlay = useCallback(() => {
    if (isPlaying) return

    setIsPlaying(true)
    audioPlayback.updateTempoScale(tempoScale)
    audioPlayback.startAudio(
      notes,
      audioPlayback.getCurrentTime(tempoScale),
      tempoScale,
      mute
    )
  }, [isPlaying, tempoScale, mute, notes, audioPlayback])

  /**
   * Pause playback
   */
  const handlePause = useCallback(() => {
    if (!isPlaying) return

    // Get precise current time from audio context
    const currentAudioTime = audioPlayback.getCurrentTime(tempoScale)
    setIsPlaying(false)
    audioPlayback.stopAudio()
    audioPlayback.setOffsetTime(currentAudioTime)
    setCurrentTime(currentAudioTime)
  }, [isPlaying, tempoScale, audioPlayback])

  /**
   * Stop playback
   */
  const handleStop = useCallback(() => {
    setIsPlaying(false)
    audioPlayback.reset()
    setCurrentTime(0)
  }, [audioPlayback])

  /**
   * Seek to specific time
   */
  const handleSeek = useCallback((newTime: number) => {
    const clampedTime = Math.max(0, Math.min(newTime, totalLength))
    audioPlayback.setOffsetTime(clampedTime)
    setCurrentTime(clampedTime)

    // If currently playing, restart audio from new position
    if (isPlaying) {
      audioPlayback.startAudio(notes, clampedTime, tempoScale, mute)
    }
  }, [totalLength, isPlaying, notes, tempoScale, mute, audioPlayback])

  /**
   * Change tempo with re-synchronization
   */
  const handleTempoChange = useCallback((newTempoScale: number) => {
    const wasPlaying = isPlaying

    if (wasPlaying) {
      // Get current precise time before stopping
      const currentAudioTime = audioPlayback.getCurrentTime(tempoScale)
      audioPlayback.stopAudio()

      // Update tempo scale
      setTempoScale(newTempoScale)
      audioPlayback.updateTempoScale(newTempoScale)

      // Restart with new tempo
      audioPlayback.setOffsetTime(currentAudioTime)
      audioPlayback.startAudio(notes, currentAudioTime, newTempoScale, mute)
    } else {
      setTempoScale(newTempoScale)
      audioPlayback.updateTempoScale(newTempoScale)
    }
  }, [isPlaying, tempoScale, mute, notes, audioPlayback])

  /**
   * Toggle mute
   */
  const handleMuteChange = useCallback((newMute: boolean) => {
    setMute(newMute)

    // If currently playing, restart audio with new mute setting
    if (isPlaying) {
      const currentAudioTime = audioPlayback.getCurrentTime(tempoScale)
      audioPlayback.stopAudio()
      audioPlayback.startAudio(notes, currentAudioTime, tempoScale, newMute)
    }
  }, [isPlaying, tempoScale, notes, audioPlayback])

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
      lastFrameTimeRef.current = 0
      syncCheckIntervalRef.current = 0
      return
    }

    const animationLoop = (frameTime: number) => {
      // Calculate frame delta for smooth animation
      const deltaTime = lastFrameTimeRef.current ? frameTime - lastFrameTimeRef.current : 0
      lastFrameTimeRef.current = frameTime

      // Get precise current time from AudioContext
      const currentAudioTime = audioPlayback.getCurrentTime(tempoScale)
      setCurrentTime(currentAudioTime)

      // Periodic synchronization check (every ~100ms)
      syncCheckIntervalRef.current += deltaTime
      if (syncCheckIntervalRef.current > 100) {
        syncCheckIntervalRef.current = 0

        // Verify audio-visual synchronization
        const timingInfo = audioPlayback.getTimingInfo()
        if (timingInfo.isPlaying && timingInfo.audioContextTime && timingInfo.baseAudioTime) {
          const audioTime = timingInfo.offsetSec + 
            (timingInfo.audioContextTime - timingInfo.baseAudioTime) * tempoScale

          // If drift is significant (>50ms), resync
          const drift = Math.abs(audioTime - currentAudioTime)
          if (drift > 0.05) {
            console.log(`Audio-visual drift detected: ${drift.toFixed(3)}s, resyncing...`)
            setCurrentTime(audioTime)
          }
        }
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
      lastFrameTimeRef.current = 0
      syncCheckIntervalRef.current = 0
    }
  }, [isPlaying, tempoScale, totalLength, audioPlayback, handleStop])

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