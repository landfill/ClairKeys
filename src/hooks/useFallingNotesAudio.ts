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

  // Rolling-scheduler state, all reset on every startAudio.
  const notesRef = useRef<FallingNote[]>([])
  const muteRef = useRef(false)
  const scheduleCursorRef = useRef(0)
  const activeEndsRef = useRef<number[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /**
   * Initialize audio context
   */
  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current) {
      // Create audio context with compatibility
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      audioContextRef.current = new AudioContextClass()

      // Create master gain node
      masterGainRef.current = audioContextRef.current.createGain()
      masterGainRef.current.gain.value = 0.1 // Reasonable volume level
      masterGainRef.current.connect(audioContextRef.current.destination)
    }
  }, [])

  /**
   * Create audio nodes for a single note
   */
  const createNoteAudio = useCallback((
    midi: number,
    audioContext: AudioContext,
    masterGain: GainNode
  ): AudioNodes => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    const lowPassFilter = audioContext.createBiquadFilter()

    // Configure oscillator
    const frequency = midiToFreq(midi)
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency

    // Configure filter for more realistic piano sound
    lowPassFilter.type = 'lowpass'
    lowPassFilter.frequency.value = frequency * 4
    lowPassFilter.Q.value = 1

    // Configure gain for ADSR envelope
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

    // Drop voices that have already finished so the polyphony count reflects
    // only notes still sounding, across the whole song rather than one window.
    for (let i = activeEndsRef.current.length - 1; i >= 0; i--) {
      if (activeEndsRef.current[i] <= now) activeEndsRef.current.splice(i, 1)
    }

    const notes = selectNotesInWindow(notesRef.current, fromSong, toSong, includeSounding)

    for (const note of notes) {
      // Map song time to AudioContext time through the single shared anchor.
      const startTime = baseAudioTime + (note.start - offsetSec) / tempoScale
      const endTime = baseAudioTime + (note.start + note.duration - offsetSec) / tempoScale

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

        // Configure ADSR envelope
        const attackTime = 0.02
        const decayTime = 0.1
        const sustainLevel = 0.6
        const releaseTime = 0.3

        const velocity = note.velocity || 0.7
        const peakGain = velocity * 0.3

        // Attack
        nodes.gain.gain.setValueAtTime(0, clampedStart)
        nodes.gain.gain.linearRampToValueAtTime(peakGain, clampedStart + attackTime)

        // Decay to sustain
        nodes.gain.gain.linearRampToValueAtTime(
          peakGain * sustainLevel,
          clampedStart + attackTime + decayTime
        )

        // Release
        nodes.gain.gain.setValueAtTime(peakGain * sustainLevel, endTime)
        nodes.gain.gain.linearRampToValueAtTime(0, endTime + releaseTime)

        // Start and stop oscillator
        nodes.osc.start(clampedStart)
        nodes.osc.stop(endTime + releaseTime)

        nodes.end = endTime + releaseTime
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
    const songNow = offsetSecRef.current +
      Math.max(0, audioContext.currentTime - baseAudioTime) * tempoScale

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
  const startAudio = useCallback((
    notes: FallingNote[],
    offsetSec: number,
    tempoScale: number,
    mute: boolean
  ) => {
    initializeAudio()

    if (!audioContextRef.current || !masterGainRef.current) return

    // Tear down any currently playing audio and its timer.
    stopTick()
    stopAudioNodes(scheduledNodesRef.current)
    scheduledNodesRef.current = []
    activeEndsRef.current = []

    // Store current state
    notesRef.current = notes
    muteRef.current = mute
    tempoScaleRef.current = tempoScale
    isPlayingRef.current = true

    // Resume audio context if suspended (required by some browsers)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }

    // Establish the single timing anchor: songTime `offsetSec` maps to this
    // AudioContext time. A small lead keeps the first notes just in the future.
    const baseAudioTime = audioContextRef.current.currentTime + 0.05
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
  }, [initializeAudio, stopTick, scheduleWindow, tick])

  /**
   * Stop all audio playback
   */
  const stopAudio = useCallback(() => {
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
  const getCurrentTime = useCallback((tempoScale: number): number => {
    const context = audioContextRef.current
    const baseTime = baseAudioTimeRef.current

    if (context && baseTime !== null && isPlayingRef.current) {
      // High-precision timing using AudioContext.currentTime
      const audioElapsed = Math.max(0, context.currentTime - baseTime)
      const scaledElapsed = audioElapsed * tempoScale
      return offsetSecRef.current + scaledElapsed
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
