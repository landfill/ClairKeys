'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { FallingNote } from '@/types/fallingNotes'
import { useFallingNotesAudio, DEFAULT_MASTER_GAIN } from './useFallingNotesAudio'
import { calculateSongLength, shouldAutoStop } from '@/utils/visualUtils'
import { createLoopSection } from '@/utils/loopSection'
import type { MetronomeClick } from '@/utils/beatGrid'

export interface FallingNotesPlayerOptions {
  /** Metronome clicks for the whole piece, or none. Scheduled on every start. */
  clicks?: MetronomeClick[]
  /**
   * One bar of clicks ending at the resume point, asked for on each play. The
   * clock starts at its first click; notes before the resume point stay silent
   * and the picture holds at the resume point until the count-in is over.
   */
  countIn?: (resumeAt: number) => MetronomeClick[]
}

const NO_CLICKS: MetronomeClick[] = []

/**
 * Main hook for falling notes player with audio-visual synchronization
 * Based on MVP implementation for precise timing
 */
export function useFallingNotesPlayer(notes: FallingNote[], options: FallingNotesPlayerOptions = {}) {
  const clicks = options.clicks ?? NO_CLICKS
  const countInFor = options.countIn
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

  const latestClicks = useRef(clicks)
  latestClicks.current = clicks

  // Count-in in progress: the resume point the picture holds at, and the
  // count-in beats so the UI can count down. Null outside a count-in.
  const countInRef = useRef<{ until: number; beats: number[] } | null>(null)
  const [countInLeft, setCountInLeft] = useState<number | null>(null)
  const clearCountIn = useCallback(() => {
    countInRef.current = null
    setCountInLeft(null)
  }, [])

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
  
  // The song position the reader is at. During a count-in the clock runs
  // before the resume point, but the reader is still at the resume point.
  const playheadNow = useCallback(() => {
    const raw = getCurrentTime()
    const countIn = countInRef.current
    return countIn && raw < countIn.until ? countIn.until : raw
  }, [getCurrentTime])

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
    const resumeAt = getCurrentTime()
    const countIn = countInFor?.(resumeAt) ?? []
    // The count-in is the only beat before the resume point; the metronome
    // takes over from there, so no beat of the count-in sounds twice.
    const withCountIn = (grid: MetronomeClick[]) =>
      [...countIn, ...grid.filter(click => click.time >= resumeAt)]
    const started = await startAudio(
      notes,
      countIn.length ? countIn[0].time : resumeAt,
      tempoScale,
      mute,
      countIn.length ? { clicks: withCountIn(clicks), notesFrom: resumeAt } : { clicks }
    )
    if (started) {
      if (countIn.length) {
        countInRef.current = { until: resumeAt, beats: countIn.map(click => click.time) }
        setCountInLeft(countIn.length)
      }
      setIsPlaying(true)
      setIsSessionActive(true)
      // The start may have waited seconds for samples, and the score's beat
      // grid may have arrived meanwhile. Apply it, keeping any count-in.
      const latest = latestClicks.current
      if (latest !== clicks) {
        const at = getCurrentTime()
        stopAudio()
        const again = countIn.length && at < resumeAt
          ? await startAudio(notes, at, tempoScale, mute, { clicks: withCountIn(latest), notesFrom: resumeAt })
          : await startAudio(notes, Math.max(at, resumeAt), tempoScale, mute, { clicks: latest })
        if (!again) setIsPlaying(false)
      }
    }
    return started
  }, [isPlaying, tempoScale, mute, notes, clicks, countInFor, getCurrentTime, startAudio, stopAudio, updateTempoScale])

  /**
   * Pause playback
   */
  const handlePause = useCallback(() => {
    if (!isPlaying) return

    // Get precise current time from audio context. A pause inside the
    // count-in returns to the resume point; the next play counts in again.
    const currentAudioTime = playheadNow()
    clearCountIn()
    setIsPlaying(false)
    stopAudio()
    setOffsetTime(currentAudioTime)
    setCurrentTime(currentAudioTime)
  }, [isPlaying, playheadNow, clearCountIn, setOffsetTime, stopAudio])

  /**
   * Stop playback
   */
  const handleStop = useCallback(() => {
    clearCountIn()
    setIsPlaying(false)
    setIsSessionActive(false)
    reset()
    setCurrentTime(0)
  }, [reset, clearCountIn])

  /**
   * Seek to specific time
   */
  const handleSeek = useCallback(async (newTime: number) => {
    const clampedTime = Math.max(0, Math.min(newTime, totalLength))
    clearCountIn()
    if (!isPlaying) stopAudio()
    setOffsetTime(clampedTime)
    setCurrentTime(clampedTime)

    // If currently playing, restart audio from new position
    if (isPlaying) {
      const started = await startAudio(notes, clampedTime, tempoScale, mute, { clicks })
      if (!started) setIsPlaying(false)
    }
  }, [totalLength, isPlaying, notes, clicks, tempoScale, mute, clearCountIn, setOffsetTime, startAudio, stopAudio])

  /**
   * Change tempo with re-synchronization
   */
  const handleTempoChange = useCallback(async (newTempoScale: number) => {
    const wasPlaying = isPlaying

    if (wasPlaying) {
      // Get current precise time before stopping. A speed change ends a
      // count-in; playing resumes at once from the resume point.
      const currentAudioTime = playheadNow()
      clearCountIn()
      stopAudio()

      // Update tempo scale
      setTempoScale(newTempoScale)
      updateTempoScale(newTempoScale)

      // Restart with new tempo
      setOffsetTime(currentAudioTime)
      const started = await startAudio(notes, currentAudioTime, newTempoScale, mute, { clicks })
      if (!started) setIsPlaying(false)
    } else {
      stopAudio()
      setTempoScale(newTempoScale)
      updateTempoScale(newTempoScale)
    }
  }, [isPlaying, mute, notes, clicks, playheadNow, clearCountIn, setOffsetTime, startAudio, stopAudio, updateTempoScale])

  /**
   * Toggle mute
   */
  const handleMuteChange = useCallback(async (newMute: boolean) => {
    setMute(newMute)

    // If currently playing, restart audio with new mute setting
    if (isPlaying) {
      const currentAudioTime = playheadNow()
      clearCountIn()
      stopAudio()
      const started = await startAudio(notes, currentAudioTime, tempoScale, newMute, { clicks })
      if (!started) setIsPlaying(false)
    } else {
      stopAudio()
    }
  }, [isPlaying, tempoScale, notes, clicks, playheadNow, clearCountIn, startAudio, stopAudio])

  // Turning the metronome on or off while sounding reschedules from the
  // playhead, as a mute change does. Only the click set's identity is watched;
  // the other inputs are read through a ref so a playback frame cannot restart.
  const clickRestart = useRef({ isPlaying, tempoScale, mute, notes, playheadNow, clearCountIn, startAudio, stopAudio })
  clickRestart.current = { isPlaying, tempoScale, mute, notes, playheadNow, clearCountIn, startAudio, stopAudio }
  const previousClicks = useRef(clicks)
  useEffect(() => {
    if (previousClicks.current === clicks) return
    previousClicks.current = clicks
    const current = clickRestart.current
    if (!current.isPlaying) return
    const at = current.playheadNow()
    current.clearCountIn()
    current.stopAudio()
    void current.startAudio(current.notes, at, current.tempoScale, current.mute, { clicks }).then(started => {
      if (!started) setIsPlaying(false)
    })
  }, [clicks])

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
    if (!isPlaying) {
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

      // During a count-in the clock runs before the resume point. Hold the
      // picture there and count down; the music has not started yet.
      const countIn = countInRef.current
      if (countIn) {
        if (currentAudioTime < countIn.until) {
          const sounded = countIn.beats.filter(time => time <= currentAudioTime).length
          setCountInLeft(Math.min(countIn.beats.length, countIn.beats.length - sounded + 1))
          setCurrentTime(countIn.until)
          rafRef.current = requestAnimationFrame(animationLoop)
          return
        }
        countInRef.current = null
        setCountInLeft(null)
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
  }, [isPlaying, totalLength, getCurrentTime, handleStop, handleSeek, loopSection])

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
    /** Beats left in the count-in (counting down to 1), or null. */
    countInLeft,

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
