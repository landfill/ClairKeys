'use client'

import { useRef, useCallback, useEffect } from 'react'
import type { FallingNote } from '@/types/fallingNotes'
import { midiToFreq } from '@/utils/pianoLayout'
import {
  selectNotesInWindow,
  nextScheduleWindow,
  TICK_MS,
  VOICE_LIMIT,
} from '@/utils/audioScheduler'
import {
  audioTimeAtSongTime,
  songTimeAtAudioTime,
  type PlaybackClockAnchor,
} from '@/utils/playbackClock'
import {
  harmonicAmplitudes,
  timbreCutoffHz,
  envelopeBreakpoints,
} from '@/utils/pianoTimbre'

/**
 * Audio nodes for a single note
 */
interface AudioNodes {
  osc: OscillatorNode
  gain: GainNode
  lp: BiquadFilterNode
  /** AudioContext time at which this voice fully finishes (after release). */
  end: number
}

/**
 * Hook for managing audio playback with falling notes visualization
 * Provides precise AudioContext-based timing for synchronization.
 *
 * Scheduling uses a rolling look-ahead model (see `@/utils/audioScheduler`): a
 * timer advances a cursor through song time and keeps the next
 * `SCHEDULE_AHEAD_SEC` of audio queued. This replaces the previous one-shot
 * scheduler that only ever scheduled notes within 10 seconds of the play point
 * and never re-filled — the cause of issue #18 (audio stops after ~10s while
 * notes keep falling).
 */
export function useFallingNotesAudio() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const scheduledNodesRef = useRef<AudioNodes[]>([])
  const baseAudioTimeRef = useRef<number | null>(null)
  const offsetSecRef = useRef(0)
  const tempoScaleRef = useRef(1)
  const isPlayingRef = useRef(false)
  const playbackGenerationRef = useRef(0)

  // Rolling-scheduler state, all reset on every startAudio.
  const notesRef = useRef<FallingNote[]>([])
  const muteRef = useRef(false)
  const scheduleCursorRef = useRef(0)
  const activeEndsRef = useRef<number[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /**
   * Initialize audio context
   */
  const initializeAudio = useCallback((): boolean => {
    if (audioContextRef.current) return true

    // Create audio context with compatibility. Some browsers and test/webview
    // environments expose neither constructor; playback must stay stopped
    // instead of throwing after the UI has already entered its playing state.
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return false

    try {
      audioContextRef.current = new AudioContextClass()

      // Create master gain node
      masterGainRef.current = audioContextRef.current.createGain()
      masterGainRef.current.gain.value = 0.1 // Reasonable volume level
      masterGainRef.current.connect(audioContextRef.current.destination)
      return true
    } catch (error) {
      console.warn('Web Audio initialization failed:', error)
      audioContextRef.current = null
      masterGainRef.current = null
      return false
    }
  }, [])

  /**
   * Create audio nodes for a single note.
   *
   * The oscillator carries a harmonic spectrum from `@/utils/pianoTimbre` rather
   * than a bare sine. A sine has one partial, which left the lowpass with
   * nothing to remove and left bass notes with no pitch definition — the "low
   * notes sound like bass noise" report. Partials are supplied as a
   * `PeriodicWave` so the whole spectrum still costs one oscillator, which
   * matters because `VOICE_LIMIT` caps concurrent voices, not partials.
   */
  const createNoteAudio = useCallback((
    midi: number,
    audioContext: AudioContext,
    masterGain: GainNode
  ): AudioNodes => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    const lowPassFilter = audioContext.createBiquadFilter()

    const frequency = midiToFreq(midi)
    oscillator.frequency.value = frequency

    // `createPeriodicWave` takes cosine/sine coefficients indexed by harmonic,
    // with index 0 the DC term, which must stay 0 to avoid a constant offset.
    const amplitudes = harmonicAmplitudes(midi)
    const real = new Float32Array(amplitudes.length + 1)
    const imag = new Float32Array(amplitudes.length + 1)
    for (let n = 0; n < amplitudes.length; n++) {
      imag[n + 1] = amplitudes[n]
    }

    try {
      // Already normalised in pianoTimbre, so skip the browser's own pass —
      // normalising twice would undo the deliberate bass/treble weighting.
      oscillator.setPeriodicWave(
        audioContext.createPeriodicWave(real, imag, { disableNormalization: true })
      )
    } catch (error) {
      // Test doubles and older engines may not implement PeriodicWave. Falling
      // back to a sine is the pre-existing timbre, not a new failure mode.
      console.warn('PeriodicWave unavailable, falling back to sine:', error)
      oscillator.type = 'sine'
    }

    lowPassFilter.type = 'lowpass'
    lowPassFilter.frequency.value = timbreCutoffHz(midi)
    lowPassFilter.Q.value = 1

    gainNode.gain.value = 0

    // Connect nodes: oscillator -> filter -> gain -> master
    oscillator.connect(lowPassFilter)
    lowPassFilter.connect(gainNode)
    gainNode.connect(masterGain)

    return { osc: oscillator, gain: gainNode, lp: lowPassFilter, end: 0 }
  }, [])

  /**
   * Schedule every note in the song-time window `[fromSong, toSong)`.
   *
   * Timing is derived from a single anchor (`baseAudioTimeRef` maps
   * `offsetSecRef` in song time to an AudioContext time), so the audio clock is
   * computed the same way on every tick. Voice/node bookkeeping persists across
   * ticks via refs, which is what lets a rolling window stay bounded over a
   * multi-minute song instead of being re-derived per call.
   */
  const scheduleWindow = useCallback((
    fromSong: number,
    toSong: number,
    includeSounding: boolean
  ) => {
    const audioContext = audioContextRef.current
    const masterGain = masterGainRef.current
    const baseAudioTime = baseAudioTimeRef.current
    if (!audioContext || !masterGain || baseAudioTime === null || muteRef.current) return

    const tempoScale = tempoScaleRef.current
    const offsetSec = offsetSecRef.current
    const now = audioContext.currentTime
    const clock: PlaybackClockAnchor = {
      audioTimeSec: baseAudioTime,
      songTimeSec: offsetSec,
      tempoScale,
    }

    // Drop voices that have already finished so the polyphony count reflects
    // only notes still sounding, across the whole song rather than one window.
    for (let i = activeEndsRef.current.length - 1; i >= 0; i--) {
      if (activeEndsRef.current[i] <= now) activeEndsRef.current.splice(i, 1)
    }

    const notes = selectNotesInWindow(notesRef.current, fromSong, toSong, includeSounding)

    for (const note of notes) {
      // Map song time to AudioContext time through the single shared anchor.
      const startTime = audioTimeAtSongTime(clock, note.start)
      const endTime = audioTimeAtSongTime(clock, note.start + note.duration)

      // A note captured by includeSounding may start slightly in the past;
      // clamp it just ahead of now so it still articulates without an error.
      const clampedStart = Math.max(startTime, now + 0.005)
      if (endTime <= clampedStart) continue

      // Retire voices that end before this note begins, then honour the limit.
      for (let i = activeEndsRef.current.length - 1; i >= 0; i--) {
        if (activeEndsRef.current[i] <= clampedStart) activeEndsRef.current.splice(i, 1)
      }
      if (activeEndsRef.current.length >= VOICE_LIMIT) continue

      try {
        const nodes = createNoteAudio(note.midi, audioContext, masterGain)

        // Nullish (not `||`) so an explicit velocity of 0 stays silent rather
        // than snapping to the default 0.7 — the canonical contract allows 0.
        const velocity = note.velocity ?? 0.7
        const envelope = envelopeBreakpoints(velocity, endTime - clampedStart)

        // A struck string only loses energy after the hammer, so the note decays
        // across its whole length instead of holding a plateau. The decay is
        // exponential rather than linear because that is how the ear reads a
        // piano's fade; `setTargetAtTime` cannot be used here since it never
        // exactly reaches its target and would leave the release starting from
        // an unknown level.
        const attackEnd = clampedStart + envelope.attackSec
        nodes.gain.gain.setValueAtTime(0, clampedStart)
        nodes.gain.gain.linearRampToValueAtTime(envelope.peak, attackEnd)

        // exponentialRamp cannot pass through or land on zero.
        const decayFloor = Math.max(envelope.sustain, 1e-4)
        if (envelope.peak > 0) {
          nodes.gain.gain.exponentialRampToValueAtTime(
            decayFloor,
            Math.max(attackEnd + 0.001, endTime)
          )
        }

        // Release
        nodes.gain.gain.setValueAtTime(decayFloor, endTime)
        nodes.gain.gain.linearRampToValueAtTime(0, endTime + envelope.releaseSec)

        // Start and stop oscillator
        nodes.osc.start(clampedStart)
        nodes.osc.stop(endTime + envelope.releaseSec)

        nodes.end = endTime + envelope.releaseSec
        // Count the voice as active through its release tail (nodes.end), not
        // just to endTime — the oscillator is still sounding during release, so
        // pruning at endTime would let more than VOICE_LIMIT voices overlap.
        activeEndsRef.current.push(nodes.end)
        scheduledNodesRef.current.push(nodes)
      } catch (error) {
        console.warn('Failed to schedule note:', error)
      }
    }

    // Release handles for voices whose sound has fully completed so the array
    // does not grow without bound over a long song.
    scheduledNodesRef.current = scheduledNodesRef.current.filter((n) => n.end > now)
  }, [createNoteAudio])

  /**
   * Stop the rolling schedule timer.
   */
  const stopTick = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  /**
   * One rolling-scheduler tick: top up the queue out to the look-ahead horizon.
   */
  const tick = useCallback(() => {
    const audioContext = audioContextRef.current
    const baseAudioTime = baseAudioTimeRef.current
    if (!audioContext || baseAudioTime === null || !isPlayingRef.current) return

    const tempoScale = tempoScaleRef.current
    const songNow = songTimeAtAudioTime({
      audioTimeSec: baseAudioTime,
      songTimeSec: offsetSecRef.current,
      tempoScale,
    }, audioContext.currentTime)

    const win = nextScheduleWindow(songNow, scheduleCursorRef.current, tempoScale)
    if (!win) return

    // On a delayed tick the window skips the overdue range; re-articulate a note
    // still sounding at the new playhead instead of dropping it silently.
    scheduleWindow(win.from, win.to, win.skippedStale)
    scheduleCursorRef.current = win.cursor
  }, [scheduleWindow])

  /**
   * Start audio playback from the given song-time offset.
   *
   * seek / tempo / mute changes all funnel through here: the previous schedule
   * and timer are torn down and a fresh anchor is established, so no stale
   * future node can double-fire and the cursor restarts from the new position.
   */
  const startAudio = useCallback(async (
    notes: FallingNote[],
    offsetSec: number,
    tempoScale: number,
    mute: boolean
  ): Promise<boolean> => {
    if (!initializeAudio()) return false

    const audioContext = audioContextRef.current
    if (!audioContext || !masterGainRef.current) return false

    // Invalidate any older start request before awaiting `resume()`. This also
    // prevents a delayed resume from restarting playback after stop/unmount or
    // after a newer seek/tempo request has taken ownership of the clock.
    const generation = ++playbackGenerationRef.current

    // Tear down any currently playing audio and its timer.
    stopTick()
    stopAudioNodes(scheduledNodesRef.current)
    scheduledNodesRef.current = []
    activeEndsRef.current = []
    isPlayingRef.current = false
    baseAudioTimeRef.current = null

    // A suspended AudioContext is not a usable clock. Await the browser's
    // user-gesture-gated resume result and report failure to the player instead
    // of entering a visual-only "playing" state with a frozen playhead.
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume()
      } catch (error) {
        console.warn('AudioContext resume failed:', error)
        return false
      }
    }

    if (generation !== playbackGenerationRef.current || audioContext.state !== 'running') {
      return false
    }

    // Store current state
    notesRef.current = notes
    muteRef.current = mute
    tempoScaleRef.current = tempoScale
    isPlayingRef.current = true

    // Establish the single timing anchor: songTime `offsetSec` maps to this
    // AudioContext time. A small lead keeps the first notes just in the future.
    const baseAudioTime = audioContext.currentTime + 0.05
    baseAudioTimeRef.current = baseAudioTime
    offsetSecRef.current = offsetSec
    scheduleCursorRef.current = offsetSec

    // Schedule the first window immediately (including any note already sounding
    // at the offset), then keep filling ahead on a timer.
    const first = nextScheduleWindow(offsetSec, offsetSec, tempoScale)
    if (first) {
      scheduleWindow(first.from, first.to, true)
      scheduleCursorRef.current = first.cursor
    }

    if (!mute) {
      tickRef.current = setInterval(tick, TICK_MS)
    }

    return true
  }, [initializeAudio, stopTick, scheduleWindow, tick])

  /**
   * Stop all audio playback
   */
  const stopAudio = useCallback(() => {
    playbackGenerationRef.current += 1
    isPlayingRef.current = false
    stopTick()
    stopAudioNodes(scheduledNodesRef.current)
    scheduledNodesRef.current = []
    activeEndsRef.current = []
    baseAudioTimeRef.current = null
  }, [stopTick])

  /**
   * Get current playback time with precise synchronization
   */
  const getCurrentTime = useCallback((): number => {
    const context = audioContextRef.current
    const baseTime = baseAudioTimeRef.current

    if (context && baseTime !== null && isPlayingRef.current) {
      return songTimeAtAudioTime({
        audioTimeSec: baseTime,
        songTimeSec: offsetSecRef.current,
        tempoScale: tempoScaleRef.current,
      }, context.currentTime)
    }

    return offsetSecRef.current
  }, [])

  /**
   * Update tempo scale
   */
  const updateTempoScale = useCallback((tempoScale: number) => {
    tempoScaleRef.current = tempoScale
  }, [])

  /**
   * Set offset time (for seeking)
   */
  const setOffsetTime = useCallback((time: number) => {
    offsetSecRef.current = time
  }, [])

  /**
   * Reset audio state
   */
  const reset = useCallback(() => {
    stopAudio()
    offsetSecRef.current = 0
    tempoScaleRef.current = 1
  }, [stopAudio])

  /**
   * Get timing info for synchronization debugging
   */
  const getTimingInfo = useCallback(() => {
    return {
      isPlaying: isPlayingRef.current,
      offsetSec: offsetSecRef.current,
      tempoScale: tempoScaleRef.current,
      audioContextTime: audioContextRef.current?.currentTime || 0,
      baseAudioTime: baseAudioTimeRef.current
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stopAudio])

  return {
    startAudio,
    stopAudio,
    getCurrentTime,
    updateTempoScale,
    setOffsetTime,
    reset,
    getTimingInfo
  }
}

/**
 * Helper function to stop audio nodes
 */
function stopAudioNodes(nodes: AudioNodes[]) {
  for (const { osc, gain } of nodes) {
    try {
      // Fade out quickly to avoid clicks
      const now = osc.context.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + 0.02)

      // Stop oscillator after fade out
      osc.stop(now + 0.02)
    } catch {
      // Ignore errors for already stopped nodes
    }
  }
}
