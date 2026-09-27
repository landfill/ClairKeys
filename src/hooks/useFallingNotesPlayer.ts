'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { FallingNote } from '@/types/fallingNotes'
import { useFallingNotesAudio, DEFAULT_MASTER_GAIN } from './useFallingNotesAudio'
import { calculateSongLength, shouldAutoStop } from '@/utils/visualUtils'
import { createLoopSection } from '@/utils/loopSection'
import { nextWaitStep, remainingPitches, type WaitStep } from '@/utils/waitSteps'

export interface FallingNotesPlayerOptions {
  /**
   * Wait mode (D-086): the clock runs silently and stops on each step until
   * its keys are pressed. The reader makes the sound — a MIDI piano itself,
   * on-screen keys through the audio hook's playNoteNow.
   */
  waitSteps?: WaitStep[]
}

/** A step exactly at the seek target is still ahead of the reader. */
const JUST_BEFORE = 1e-6

/**
 * Main hook for falling notes player with audio-visual synchronization
 * Based on MVP implementation for precise timing
 */
export function useFallingNotesPlayer(notes: FallingNote[], options: FallingNotesPlayerOptions = {}) {
  const waitSteps = options.waitSteps
  const waitMode = Boolean(waitSteps?.length)
  // Playback state. `isPlaying` is whether a score is sounding right now;
  // `isSessionActive` is whether the reader is inside a practice run at all.
  // They diverge on a pause, and the screen needs the second one: a pause is a
  // moment inside the run, not a decision to leave it. Only a stop — the
  // reader's, or the end of the piece — closes the session.
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [tempoScale, setTempoScale] = useState(1.0)
  const [mute, setMute] = useState(false)
  const [lookAheadSec, setLookAheadSec] = useState(1.5)
  const [volume, setVolumeState] = useState(DEFAULT_MASTER_GAIN)
  const [loopStart, setLoopStart] = useState<number | null>(null)
  const [loopEnd, setLoopEnd] = useState<number | null>(null)

  // Wait mode: steps up to this song time are done; the step being waited on.
  const playedThroughRef = useRef(Number.NEGATIVE_INFINITY)
  const [waiting, setWaiting] = useState<{ step: WaitStep; pressed: Set<number> } | null>(null)
  const waitingRef = useRef(waiting)
  waitingRef.current = waiting

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
    playNoteNow,
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
      mute || waitMode
    )
    if (started) {
      setIsPlaying(true)
      setIsSessionActive(true)
    }
    return started
  }, [isPlaying, tempoScale, mute, waitMode, notes, getCurrentTime, startAudio, updateTempoScale])

  /**
   * Pause playback
   */
  const handlePause = useCallback(() => {
    if (!isPlaying) return

    // Get precise current time from audio context
    // A pause inside a wait keeps the step unplayed; playing again waits on it.
    const currentAudioTime = waitingRef.current ? waitingRef.current.step.time : getCurrentTime()
    setWaiting(null)
    setIsPlaying(false)
    stopAudio()
    setOffsetTime(currentAudioTime)
    setCurrentTime(currentAudioTime)
  }, [isPlaying, getCurrentTime, setOffsetTime, stopAudio])

  /**
   * Stop playback
   */
  const handleStop = useCallback(() => {
    playedThroughRef.current = Number.NEGATIVE_INFINITY
    setWaiting(null)
    setIsPlaying(false)
    setIsSessionActive(false)
    reset()
    setCurrentTime(0)
  }, [reset])

  /**
   * Seek to specific time
   */
  const handleSeek = useCallback(async (newTime: number) => {
    const clampedTime = Math.max(0, Math.min(newTime, totalLength))
    playedThroughRef.current = clampedTime - JUST_BEFORE
    setWaiting(null)
    if (!isPlaying) stopAudio()
    setOffsetTime(clampedTime)
    setCurrentTime(clampedTime)

    // If currently playing, restart audio from new position
    if (isPlaying) {
      const started = await startAudio(notes, clampedTime, tempoScale, mute || waitMode)
      if (!started) setIsPlaying(false)
    }
  }, [totalLength, isPlaying, notes, tempoScale, mute, waitMode, setOffsetTime, startAudio, stopAudio])

  /**
   * Change tempo with re-synchronization
   */
  const handleTempoChange = useCallback(async (newTempoScale: number) => {
    const wasPlaying = isPlaying

    if (wasPlaying) {
      // Get current precise time before stopping. A wait ends here and is
      // met again at once, since its step is still unplayed.
      const currentAudioTime = waitingRef.current ? waitingRef.current.step.time : getCurrentTime()
      setWaiting(null)
      stopAudio()

      // Update tempo scale
      setTempoScale(newTempoScale)
      updateTempoScale(newTempoScale)

      // Restart with new tempo
      setOffsetTime(currentAudioTime)
      const started = await startAudio(notes, currentAudioTime, newTempoScale, mute || waitMode)
      if (!started) setIsPlaying(false)
    } else {
      stopAudio()
      setTempoScale(newTempoScale)
      updateTempoScale(newTempoScale)
    }
  }, [isPlaying, mute, waitMode, notes, getCurrentTime, setOffsetTime, startAudio, stopAudio, updateTempoScale])

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
   * A key the reader pressed (MIDI or on screen). Returns whether it was one
   * the current step waits for; a completed step resumes from its own onset.
   */
  const pressKey = useCallback(async (midi: number): Promise<boolean> => {
    const current = waitingRef.current
    if (!current || !current.step.pitches.includes(midi)) return false
    const pressed = new Set(current.pressed).add(midi)
    if (remainingPitches(current.step.pitches, pressed).length > 0) {
      setWaiting({ step: current.step, pressed })
      return true
    }
    playedThroughRef.current = current.step.time
    waitingRef.current = null
    setWaiting(null)
    const started = await startAudio(notes, current.step.time, tempoScale, true)
    if (!started) setIsPlaying(false)
    return true
  }, [notes, tempoScale, startAudio])

  /**
   * Change look ahead time
   */
  const handleLookAheadChange = useCallback((newLookAheadSec: number) => {
    setLookAheadSec(Math.max(1, Math.min(5, newLookAheadSec)))
  }, [])

  const loopSection = useMemo(
    () => createLoopSection(loopStart, loopEnd, totalLength),
    [loopStart, loopEnd, totalLength]
  )
  const markLoopStart = useCallback(() => {
    setLoopStart(currentTime)
    setLoopEnd(null)
  }, [currentTime])
  const markLoopEnd = useCallback(() => {
    const section = createLoopSection(loopStart, currentTime, totalLength)
    if (section) setLoopEnd(section.end)
  }, [currentTime, loopStart, totalLength])
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
    if (!isPlaying || waiting) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    let cancelled = false
    const animationLoop = () => {
      // Audio, falling notes, and active keys all consume this one score-time
      // value derived from the AudioContext playback anchor.
      const currentAudioTime = getCurrentTime()

      // Wait mode: reaching an unplayed step stops the clock exactly on it.
      if (waitSteps?.length) {
        const index = nextWaitStep(waitSteps, playedThroughRef.current)
        const step = index >= 0 ? waitSteps[index] : null
        if (step && currentAudioTime >= step.time) {
          stopAudio()
          setOffsetTime(step.time)
          setCurrentTime(step.time)
          const next = { step, pressed: new Set<number>() }
          waitingRef.current = next
          setWaiting(next)
          return
        }
      }

      setCurrentTime(currentAudioTime)

      if (loopSection && currentAudioTime >= loopSection.end) {
        // A successful seek keeps isPlaying and this effect's dependencies
        // unchanged. Resume this loop explicitly, once the audio is ready.
        // Cleanup owns cancellation if pause/stop/unmount replaces the effect
        // while the asynchronous seek is still waiting.
        void handleSeek(loopSection.start).then(() => {
          if (!cancelled) rafRef.current = requestAnimationFrame(animationLoop)
        })
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
      cancelled = true
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, waiting, waitSteps, totalLength, getCurrentTime, handleStop, handleSeek, loopSection, setOffsetTime, stopAudio])

  return {
    // State
    isPlaying,
    isSessionActive,
    currentTime,
    tempoScale,
    mute,
    lookAheadSec,
    volume,
    loopStart,
    loopEnd,
    sampleStatus,
    totalLength,
    /** Keys the current wait still needs, ascending, or null outside a wait. */
    waitingFor: waiting ? remainingPitches(waiting.step.pitches, waiting.pressed) : null,

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
    pressKey,
    playNoteNow,

    // Combined play/pause toggle
    togglePlayPause: isPlaying ? handlePause : handlePlay
  }
}
