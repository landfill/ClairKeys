'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
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
  DEFAULT_TREBLE_ROLLOFF,
} from '@/utils/pianoTimbre'
import { SAMPLE_PEAK_GAIN, damperReleaseSec } from '@/utils/pianoSamples'
import {
  getPianoSampleBank,
  disposePianoSampleBank,
  type PianoSampleBank,
  type PianoSampleLoadResult,
} from '@/utils/pianoSampleBank'

/**
 * Audio nodes for a single note
 */
interface AudioNodes {
  /**
   * The voice's sound source. `AudioScheduledSourceNode` rather than
   * `OscillatorNode` because a note is now either a recorded sample
   * (`AudioBufferSourceNode`) or the synthesised fallback — both expose the
   * `start(when)` / `stop(when)` this scheduler is built on, which is what let
   * samples land without touching the playback clock or the look-ahead window.
   */
  source: AudioScheduledSourceNode
  /**
   * The same node as `source` when this voice is a recording, typed so its
   * `start(when, offset)` overload is reachable. Seeking into a note that is
   * already sounding has to resume the buffer partway in; starting it from zero
   * replays the recorded hammer strike, which is plainly audible in a way the
   * synthesised path's 4 ms attack never was.
   */
  bufferSource?: AudioBufferSourceNode
  /** Rate `bufferSource` plays at, needed to convert elapsed output time to a buffer offset. */
  playbackRate?: number
  gain: GainNode
  /** Absent on the sample path: a recording carries its own spectrum. */
  lp?: BiquadFilterNode
  /**
   * Whether this voice is a recording. It selects the envelope: a sample
   * already contains the strike and the decay, so applying the synthesised
   * envelope on top would decay it a second time.
   */
  isSample: boolean
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
/**
 * Default master output level. See the `initializeAudio` comment for why this
 * value: normalising the harmonic PeriodicWave to sum 1 lowered per-note RMS, so
 * the bus is turned up to compensate. Exported so the playback UI can seed its
 * volume control from the same source of truth rather than a duplicated literal.
 */
export const DEFAULT_MASTER_GAIN = 0.22

/**
 * Ceiling the runtime volume control clamps to.
 *
 * A voice peaks near `PEAK_GAIN` (0.3), so a realistic dense passage of ~8
 * overlapping voices sums to ~2.4 pre-master; at 0.35 that lands near the ±1
 * ceiling with little margin, so this is the top of the useful tuning range
 * rather than a target. `VOICE_LIMIT` (24) is the absolute worst case, but 24
 * notes at full velocity and aligned phase does not occur in real playback —
 * pinning the ceiling to it would make every ordinary passage far too quiet.
 */
export const MAX_MASTER_GAIN = 0.35

/**
 * How long the first play waits for the recorded samples, in milliseconds.
 *
 * Without a wait the opening notes synthesise while the set is still decoding
 * and the timbre changes audibly a second or two into the piece — measured in a
 * real browser as 5 sampled voices against 3 synthesised ones, because the bank
 * only starts loading when `initializeAudio` runs, which is the play click.
 *
 * The whole set fetches and decodes in ~415 ms from a local server, so this is
 * a ceiling for a slow connection rather than an expected cost: once the service
 * worker has the files, `load()` is already resolved and the wait is a microtask.
 * Bounded so a bad network delays the first note instead of withholding it.
 */
export const SAMPLE_LOAD_WAIT_MS = 2500

export type PianoSamplePlaybackStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'degraded'
  | 'failed'

export function useFallingNotesAudio() {
  const [sampleStatus, setSampleStatus] = useState<PianoSamplePlaybackStatus>('idle')
  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  // Current master level, kept in a ref so a runtime change survives the next
  // AudioContext (re)initialisation and is applied the moment the bus exists.
  const masterGainValueRef = useRef(DEFAULT_MASTER_GAIN)
  // Treble rolloff for new notes. Unlike the master gain this cannot retune
  // already-scheduled notes: their PeriodicWave is baked at creation, so a
  // change takes effect from the next note the scheduler builds.
  const trebleRolloffRef = useRef(DEFAULT_TREBLE_ROLLOFF)
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
  // Recorded piano samples for the current context, or null where the platform
  // cannot fetch or decode them. Null means every note synthesises, which is the
  // tone that shipped before samples existed.
  const sampleBankRef = useRef<PianoSampleBank | null>(null)
  // Chosen once per startAudio call. The scheduler must never consult the
  // bank's changing contents note-by-note or one piece can change instrument
  // while background decoding continues.
  const useSamplesForPlaybackRef = useRef(false)

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

      // Create master gain node.
      //
      // DEFAULT_MASTER_GAIN was raised from 0.1 after the first deployed timbre
      // was judged too quiet. The cause is the move to a harmonic PeriodicWave
      // normalised so its partial amplitudes sum to 1: spreading energy across
      // partials drops the waveform's RMS well below the old unit-amplitude
      // sine, so the same per-note peak gain sounds softer. This compensates
      // globally, and the playback UI can retune it live from here.
      //
      // Headroom: a note peaks at velocity(≤1) * PEAK_GAIN(0.3) ≈ 0.3 before
      // this stage, and VOICE_LIMIT caps concurrent voices at 24. Real playback
      // never aligns all 24 at full velocity and matching phase, so the default
      // keeps a comfortable margin below the ±1 clip point for any realistic
      // chord. The runtime control clamps to the same safe ceiling.
      masterGainRef.current = audioContextRef.current.createGain()
      masterGainRef.current.gain.value = masterGainValueRef.current
      masterGainRef.current.connect(audioContextRef.current.destination)

      // Start loading the recorded samples alongside the bus. startAudio waits
      // for the complete result (bounded by SAMPLE_LOAD_WAIT_MS) and freezes one
      // instrument choice for the whole playback.
      //
      // The guard is `decodeAudioData` specifically, because that is what
      // separates a real AudioContext from the doubles used in tests and from
      // engines too old to decode at all. Whether `fetch` exists is the bank's
      // problem, not this one — it reports that once rather than once per note.
      if (typeof audioContextRef.current.decodeAudioData === 'function') {
        sampleBankRef.current = getPianoSampleBank(audioContextRef.current)
      }

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
   * Two possible voices, in preference order:
   *
   * 1. A recorded sample from `@/utils/pianoSampleBank`, resampled to pitch.
   * 2. The synthesised fallback below, used until the sample has decoded and
   *    permanently if the samples cannot be fetched at all.
   *
   * The synthesised branch is not dead code and is not a placeholder. It is what
   * plays during the first seconds of a session and on any client where the
   * fetch fails, so it stays a real tone rather than a beep of last resort.
   *
   * Why samples at all: that branch gives every partial of a note one shared
   * gain envelope, so all 24 of them decay at the same rate. A real string's
   * upper partials die in a few hundred milliseconds while the fundamental rings
   * on, and no rolloff exponent can express that difference — which is why
   * tuning it by ear across three rounds never stopped it sounding electronic.
   */
  const createNoteAudio = useCallback((
    midi: number,
    audioContext: AudioContext,
    masterGain: GainNode
  ): AudioNodes => {
    const voice = useSamplesForPlaybackRef.current
      ? sampleBankRef.current?.voiceFor(midi) ?? null
      : null

    if (voice) {
      const source = audioContext.createBufferSource()
      const sampleGain = audioContext.createGain()

      source.buffer = voice.buffer
      // An AudioBufferSourceNode has no pitch control, so transposing means
      // resampling — which shortens the buffer by the same factor. The build
      // script's per-register trim is sized against that: the bass keeps 6.0s,
      // which the widest possible shift (one semitone up) reduces to 5.67s of
      // output — a whole note at quarter=42 or faster.
      //
      // A note longer than that runs off the end of its buffer and simply stops
      // early. It does not click: the build applies a 0.5s fade at every trim
      // point, so the recording is already at silence by then, which is also
      // roughly where a real string of that register has faded to.
      source.playbackRate.value = voice.playbackRate

      // No lowpass: the recording already has the spectrum a filter would be
      // shaping, and `timbreCutoffHz` was derived from the synthesised partials.
      sampleGain.gain.value = 0
      source.connect(sampleGain)
      sampleGain.connect(masterGain)

      return {
        source,
        bufferSource: source,
        playbackRate: voice.playbackRate,
        gain: sampleGain,
        isSample: true,
        end: 0,
      }
    }

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    const lowPassFilter = audioContext.createBiquadFilter()

    const frequency = midiToFreq(midi)
    oscillator.frequency.value = frequency

    // `createPeriodicWave` takes cosine/sine coefficients indexed by harmonic,
    // with index 0 the DC term, which must stay 0 to avoid a constant offset.
    const amplitudes = harmonicAmplitudes(midi, trebleRolloffRef.current)
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

    return { source: oscillator, gain: gainNode, lp: lowPassFilter, isSample: false, end: 0 }
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

        let releaseSec: number

        if (nodes.isSample) {
          // A recording needs no attack, decay or sustain: the hammer strike and
          // the string's fall-off are in the audio. The only envelope a sampled
          // piano wants is the damper landing when the note ends. Shaping it
          // further would decay an already-decaying sound twice, which is
          // audible as a note that dies too early.
          //
          // SAMPLE_PEAK_GAIN scales the loudest sample in the set to the same
          // peak the synthesised path produces, so the headroom analysis behind
          // DEFAULT_MASTER_GAIN and MAX_MASTER_GAIN keeps holding unchanged.
          releaseSec = damperReleaseSec(note.midi)
          const peak = Math.max(0, velocity) * SAMPLE_PEAK_GAIN

          // Stepping straight to peak is safe where a synthesised oscillator
          // would click: the buffer's own first samples are silence, so the
          // recorded attack does the ramp.
          nodes.gain.gain.setValueAtTime(peak, clampedStart)
          nodes.gain.gain.setValueAtTime(peak, endTime)
          nodes.gain.gain.linearRampToValueAtTime(0, endTime + releaseSec)
        } else {
          const envelope = envelopeBreakpoints(velocity, endTime - clampedStart)
          releaseSec = envelope.releaseSec

          // A struck string only loses energy after the hammer, so the note decays
          // across its whole length instead of holding a plateau. The decay is
          // exponential rather than linear because that is how the ear reads a
          // piano's fade; `setTargetAtTime` cannot be used here since it never
          // exactly reaches its target and would leave the release starting from
          // an unknown level.
          const attackEnd = clampedStart + envelope.attackSec
          nodes.gain.gain.setValueAtTime(0, clampedStart)

          if (envelope.peak > 0) {
            nodes.gain.gain.linearRampToValueAtTime(envelope.peak, attackEnd)

            // `exponentialRamp` can neither pass through nor land on zero, so the
            // decay target is floored. That floor must not escape this branch: a
            // velocity-0 note has to stay at exactly zero, and scheduling the
            // floor for it would give a silent note an audible tail — the very
            // guarantee PR #26 introduced `??` to protect.
            const decayFloor = Math.max(envelope.sustain, 1e-4)
            nodes.gain.gain.exponentialRampToValueAtTime(
              decayFloor,
              Math.max(attackEnd + 0.001, endTime)
            )

            // Release
            nodes.gain.gain.setValueAtTime(decayFloor, endTime)
            nodes.gain.gain.linearRampToValueAtTime(0, endTime + envelope.releaseSec)
          }
          // A zero-peak note schedules nothing beyond the initial 0: the gain node
          // is already silent and every later event could only raise it.
        }

        // Start and stop the voice. Both source kinds honour absolute
        // AudioContext times, which is what kept the sample path off the
        // playback clock entirely.
        if (nodes.bufferSource && nodes.playbackRate) {
          // `clampedStart` is later than `startTime` only for a note that was
          // already sounding when playback began — the seek case. Resume the
          // recording that far in rather than restarting it, so the listener
          // hears the note continuing rather than being struck again.
          //
          // Output time maps to buffer position by the playback rate: playing
          // 5% fast means 1s of output consumed 1.05s of buffer. Clamped to the
          // buffer length because `start` throws on an offset past the end.
          const skippedSec = Math.max(0, clampedStart - startTime)
          const bufferDuration = nodes.bufferSource.buffer?.duration ?? 0
          const offsetSecIntoBuffer = Math.min(
            skippedSec * nodes.playbackRate,
            bufferDuration
          )
          nodes.bufferSource.start(clampedStart, offsetSecIntoBuffer)
        } else {
          nodes.source.start(clampedStart)
        }
        nodes.source.stop(endTime + releaseSec)

        nodes.end = endTime + releaseSec
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
    if (!initializeAudio()) {
      setSampleStatus('failed')
      return false
    }

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

    // Wait for the recorded samples before anchoring the clock, so a piece does
    // not open on the synthesised fallback and switch instruments mid-phrase.
    // Bounded: a slow or failed load must delay the first note, never withhold
    // it, and the fallback still covers whatever has not arrived.
    const bank = sampleBankRef.current
    setSampleStatus('loading')
    let loadResult: PianoSampleLoadResult | 'timeout'
    if (bank) {
      let timer: ReturnType<typeof setTimeout> | undefined
      loadResult = await Promise.race([
        bank.load(),
        new Promise<'timeout'>((resolve) => {
          timer = setTimeout(() => resolve('timeout'), SAMPLE_LOAD_WAIT_MS)
        }),
      ])
      if (timer !== undefined) clearTimeout(timer)
    } else {
      loadResult = {
        status: 'failed',
        readyCount: 0,
        totalCount: 0,
      }
    }

    // Covers both awaits above: a stop, unmount, or newer seek during either the
    // resume or the sample wait has already taken ownership of the clock.
    if (generation !== playbackGenerationRef.current || audioContext.state !== 'running') {
      return false
    }

    useSamplesForPlaybackRef.current = loadResult !== 'timeout' && loadResult.status === 'ready'
    setSampleStatus(loadResult === 'timeout' ? 'degraded' : loadResult.status)

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
   * Set the master output level live, clamped to a headroom-safe ceiling.
   *
   * Applied immediately if the bus exists and remembered for the next
   * AudioContext, so dragging the control mid-playback is heard at once. The
   * ceiling matches the clipping analysis in `initializeAudio`: a note peaks
   * near `PEAK_GAIN` and up to `VOICE_LIMIT` voices can overlap, so the master
   * level is bounded rather than left free to drive the bus into hard clipping.
   *
   * Returns the value actually applied after clamping, so the caller's UI state
   * reflects the real bus level rather than the raw request — the readout is the
   * whole point of the control.
   */
  const setVolume = useCallback((value: number): number => {
    const clamped = Math.min(MAX_MASTER_GAIN, Math.max(0, value))
    masterGainValueRef.current = clamped
    const gain = masterGainRef.current
    const context = audioContextRef.current
    if (gain && context) {
      // A short ramp instead of a step avoids a click on an audible bus.
      gain.gain.setTargetAtTime(clamped, context.currentTime, 0.015)
    }
    return clamped
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
        // Release the decoded buffers before closing: they are ~20 MB and belong
        // to this context, so nothing can play them again once it is closed.
        disposePianoSampleBank(audioContextRef.current)
        sampleBankRef.current = null
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
    setVolume,
    sampleStatus,
    reset,
    getTimingInfo
  }
}

/**
 * Helper function to stop audio nodes
 */
function stopAudioNodes(nodes: AudioNodes[]) {
  for (const { source, gain } of nodes) {
    try {
      // Fade out quickly to avoid clicks
      const now = source.context.currentTime
      const currentGain = gain.gain.value

      // cancelScheduledValues() may restore the value from before an active
      // ramp, producing a discontinuity before this fade even begins. Modern
      // engines can hold the computed automation value directly; older ones
      // need that value captured before cancellation and restored afterwards.
      if (typeof gain.gain.cancelAndHoldAtTime === 'function') {
        try {
          gain.gain.cancelAndHoldAtTime(now)
        } catch {
          gain.gain.cancelScheduledValues(now)
          gain.gain.setValueAtTime(currentGain, now)
        }
      } else {
        gain.gain.cancelScheduledValues(now)
        gain.gain.setValueAtTime(currentGain, now)
      }
      gain.gain.linearRampToValueAtTime(0, now + 0.02)

      // Stop the source after fade out. This is the only thing that ends a note
      // whose scheduled stop is still far in the future, so every voice the
      // scheduler creates has to reach this list — sample voices included.
      source.stop(now + 0.02)
    } catch {
      // Ignore errors for already stopped nodes
    }
  }
}
