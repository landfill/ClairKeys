'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { FallingNote } from '@/types/fallingNotes'
import { useFallingNotesAudio, DEFAULT_MASTER_GAIN } from './useFallingNotesAudio'
import { calculateSongLength, shouldAutoStop } from '@/utils/visualUtils'
import { createLoopSection } from '@/utils/loopSection'
import type { MetronomeClick } from '@/utils/beatGrid'
import { nextWaitStep, remainingPitches, type WaitStep } from '@/utils/waitSteps'

export interface FallingNotesPlayerOptions {
  /**
   * The notes the audio schedules. Timing, length and the visual playhead
   * always follow `notes`; one-hand practice can silence the other hand here
   * without moving the end of the piece.
   */
  audibleNotes?: FallingNote[]
  /** Metronome clicks for the whole piece, or none. Scheduled on every start. */
  clicks?: MetronomeClick[]
  /**
   * One bar of clicks ending at the resume point, asked for on each play. The
   * clock starts at its first click; notes before the resume point stay silent
   * and the picture holds at the resume point until the count-in is over.
   */
  countIn?: (resumeAt: number) => MetronomeClick[]
  /**
   * Wait mode (D-086): the clock runs silently and stops on each step until
   * its keys are pressed. The reader makes the sound — a MIDI piano itself,
   * on-screen keys through the audio hook's playNoteNow. It overrides the
   * count-in and silences notes and clicks alike.
   */
  waitSteps?: WaitStep[]
}

const NO_CLICKS: MetronomeClick[] = []

/** A step exactly at the seek target is still ahead of the reader. */
const JUST_BEFORE = 1e-6

/**
 * How early a press may come for the step ahead. Readers press as the note
 * reaches the line, so a press can land just before the onset, or after it
 * but before the next frame has installed the wait; neither may be lost.
 */
export const EARLY_PRESS_SEC = 0.25

/**
 * Main hook for falling notes player with audio-visual synchronization
 * Based on MVP implementation for precise timing
 */
export function useFallingNotesPlayer(notes: FallingNote[], options: FallingNotesPlayerOptions = {}) {
  const audibleNotes = options.audibleNotes ?? notes
  const clicks = options.clicks ?? NO_CLICKS
  const waitSteps = options.waitSteps
  const waitMode = Boolean(waitSteps?.length)
  // In wait mode the reader starts the music by pressing the first step.
  const countInFor = waitMode ? undefined : options.countIn
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
  // Presses for the step ahead that came before its wait was installed.
  const armedRef = useRef<{ time: number; pressed: Set<number> } | null>(null)
  const playingRef = useRef(isPlaying)
  playingRef.current = isPlaying

  const latestAudible = useRef(audibleNotes)
  latestAudible.current = audibleNotes
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
    audioStartError,
    reset,
    playNoteNow,
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
      audibleNotes,
      countIn.length ? countIn[0].time : resumeAt,
      tempoScale,
      mute || waitMode,
      countIn.length ? { clicks: withCountIn(clicks), notesFrom: resumeAt } : { clicks }
    )
    if (started) {
      if (countIn.length) {
        countInRef.current = { until: resumeAt, beats: countIn.map(click => click.time) }
        setCountInLeft(countIn.length)
      }
      setIsPlaying(true)
      setIsSessionActive(true)
      // The start may have waited seconds for samples. A hand choice made or a
      // score beat grid that arrived in that window has not reached the audio
      // yet; apply both now, keeping any count-in that is still running.
      const latestNotes = latestAudible.current
      const latestGrid = latestClicks.current
      if (latestNotes !== audibleNotes || latestGrid !== clicks) {
        const at = getCurrentTime()
        stopAudio()
        const again = countIn.length && at < resumeAt
          ? await startAudio(latestNotes, at, tempoScale, mute || waitMode, { clicks: withCountIn(latestGrid), notesFrom: resumeAt })
          : await startAudio(latestNotes, Math.max(at, resumeAt), tempoScale, mute || waitMode, { clicks: latestGrid })
        if (!again) setIsPlaying(false)
      }
    }
    return started
  }, [isPlaying, tempoScale, mute, waitMode, audibleNotes, clicks, countInFor, getCurrentTime, startAudio, stopAudio, updateTempoScale])

  /**
   * Pause playback
   */
  const handlePause = useCallback(() => {
    if (!isPlaying) return

    // Get precise current time from audio context. A pause inside a wait keeps
    // the step unplayed, so playing again waits on it; a pause inside the
    // count-in returns to the resume point and the next play counts in again.
    const currentAudioTime = waitingRef.current ? waitingRef.current.step.time : playheadNow()
    setWaiting(null)
    armedRef.current = null
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
    playedThroughRef.current = Number.NEGATIVE_INFINITY
    armedRef.current = null
    setWaiting(null)
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
    playedThroughRef.current = clampedTime - JUST_BEFORE
    armedRef.current = null
    setWaiting(null)
    clearCountIn()
    if (!isPlaying) stopAudio()
    setOffsetTime(clampedTime)
    setCurrentTime(clampedTime)

    // If currently playing, restart audio from new position
    if (isPlaying) {
      const started = await startAudio(audibleNotes, clampedTime, tempoScale, mute || waitMode, { clicks })
      if (!started) setIsPlaying(false)
    }
  }, [totalLength, isPlaying, audibleNotes, clicks, tempoScale, mute, waitMode, clearCountIn, setOffsetTime, startAudio, stopAudio])

  /**
   * Change tempo with re-synchronization
   */
  const handleTempoChange = useCallback(async (newTempoScale: number) => {
    const wasPlaying = isPlaying

    if (wasPlaying) {
      // Get current precise time before stopping. A wait ends here and is met
      // again at once, since its step is still unplayed; a count-in ends and
      // playing resumes at once from the resume point.
      const currentAudioTime = waitingRef.current ? waitingRef.current.step.time : playheadNow()
      setWaiting(null)
      clearCountIn()
      stopAudio()

      // Update tempo scale
      setTempoScale(newTempoScale)
      updateTempoScale(newTempoScale)

      // Restart with new tempo
      setOffsetTime(currentAudioTime)
      const started = await startAudio(audibleNotes, currentAudioTime, newTempoScale, mute || waitMode, { clicks })
      if (!started) setIsPlaying(false)
    } else {
      stopAudio()
      setTempoScale(newTempoScale)
      updateTempoScale(newTempoScale)
    }
  }, [isPlaying, mute, waitMode, audibleNotes, clicks, playheadNow, clearCountIn, setOffsetTime, startAudio, stopAudio, updateTempoScale])

  /**
   * Toggle mute
   */
  const handleMuteChange = useCallback(async (newMute: boolean) => {
    setMute(newMute)

    // If currently playing, restart audio with new mute setting. A wait has
    // stopped the clock on purpose; release restarts it with the new setting.
    if (isPlaying && !waitingRef.current) {
      const currentAudioTime = playheadNow()
      clearCountIn()
      stopAudio()
      const started = await startAudio(audibleNotes, currentAudioTime, tempoScale, newMute || waitMode, { clicks })
      if (!started) setIsPlaying(false)
    } else {
      stopAudio()
    }
  }, [isPlaying, tempoScale, waitMode, audibleNotes, clicks, playheadNow, clearCountIn, startAudio, stopAudio])

  // A new audible set (one-hand practice) or click grid (metronome on/off, a
  // score grid arriving) while sounding reschedules from the playhead, as a
  // mute change does. Only the two identities are watched: the player keeps
  // them stable when nothing changed, and the other inputs are read through a
  // ref so a playback frame or a tempo change can never trigger this restart.
  const scheduleRestart = useRef({ isPlaying, tempoScale, mute: mute || waitMode, playheadNow, clearCountIn, startAudio, stopAudio })
  scheduleRestart.current = { isPlaying, tempoScale, mute: mute || waitMode, playheadNow, clearCountIn, startAudio, stopAudio }
  const previousSchedule = useRef({ audibleNotes, clicks })
  useEffect(() => {
    const previous = previousSchedule.current
    if (previous.audibleNotes === audibleNotes && previous.clicks === clicks) return
    previousSchedule.current = { audibleNotes, clicks }
    const current = scheduleRestart.current
    // A wait has stopped the clock on purpose; the new set applies on release.
    if (!current.isPlaying || waitingRef.current) return
    const at = current.playheadNow()
    current.clearCountIn()
    current.stopAudio()
    void current.startAudio(audibleNotes, at, current.tempoScale, current.mute, { clicks }).then(started => {
      if (!started) setIsPlaying(false)
    })
  }, [audibleNotes, clicks])

  /**
   * A key the reader pressed (MIDI or on screen). Returns whether it was one
   * the current step waits for; a completed step resumes from its own onset.
   */
  const pressKey = useCallback(async (midi: number): Promise<boolean> => {
    const current = waitingRef.current
    if (!current) {
      // Not waiting yet: arm the step ahead if the press is close enough to it.
      if (!waitSteps?.length || !playingRef.current) return false
      const index = nextWaitStep(waitSteps, playedThroughRef.current)
      const step = index >= 0 ? waitSteps[index] : null
      if (!step || !step.pitches.includes(midi) || getCurrentTime() < step.time - EARLY_PRESS_SEC) return false
      const armed = armedRef.current?.time === step.time ? armedRef.current : { time: step.time, pressed: new Set<number>() }
      armed.pressed.add(midi)
      armedRef.current = armed
      // Complete before it was reached: the frame loop passes it without stopping.
      if (remainingPitches(step.pitches, armed.pressed).length === 0) {
        playedThroughRef.current = step.time
        armedRef.current = null
      }
      return true
    }
    if (!current.step.pitches.includes(midi)) return false
    const pressed = new Set(current.pressed).add(midi)
    if (remainingPitches(current.step.pitches, pressed).length > 0) {
      // Synchronously, so a chord's note-ons delivered together all count.
      const next = { step: current.step, pressed }
      waitingRef.current = next
      setWaiting(next)
      return true
    }
    playedThroughRef.current = current.step.time
    waitingRef.current = null
    setWaiting(null)
    const started = await startAudio(audibleNotes, current.step.time, tempoScale, true, { clicks })
    if (!started) setIsPlaying(false)
    return true
  }, [waitSteps, audibleNotes, clicks, tempoScale, getCurrentTime, startAudio])

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

      // The A-B loop comes first: a frame that jumped past B must return to A,
      // never stop on a wait step that lies outside the loop.
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

      // Wait mode: reaching an unplayed step stops the clock exactly on it.
      if (waitSteps?.length) {
        const index = nextWaitStep(waitSteps, playedThroughRef.current)
        const step = index >= 0 ? waitSteps[index] : null
        if (step && currentAudioTime >= step.time) {
          stopAudio()
          setOffsetTime(step.time)
          setCurrentTime(step.time)
          // Keep any keys already pressed for this step (see EARLY_PRESS_SEC).
          const armed = armedRef.current?.time === step.time ? armedRef.current.pressed : new Set<number>()
          armedRef.current = null
          const next = { step, pressed: armed }
          waitingRef.current = next
          setWaiting(next)
          return
        }
      }

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
    audioStartError,
    totalLength,
    /** Beats left in the count-in (counting down to 1), or null. */
    countInLeft,
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
