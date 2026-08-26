import {
  SAMPLE_MIDI_NOTES,
  nearestSampleMidi,
  playbackRateForMidi,
  sampleUrl,
} from './pianoSamples'

/**
 * Fetches and decodes the recorded piano samples for one AudioContext.
 *
 * Kept separate from `./pianoSamples` for the reason the rest of the audio code
 * is split this way: which sample plays a note is a decision that can be tested
 * without a browser, while fetching and decoding cannot. This file holds only
 * the part that genuinely needs the platform.
 *
 * Three properties matter more than speed here:
 *
 * - **It never throws and never rejects.** A failed sample leaves that note on
 *   the synthesised fallback in `./pianoTimbre`. A failed set leaves the whole
 *   keyboard there. The worst case is the tone that shipped before this change,
 *   not silence and not an error surfaced during playback.
 * - **It is usable while still loading.** Samples land one at a time and each is
 *   playable the moment it decodes, so playback never waits on the full set.
 * - **It is bound to the AudioContext that will play it.** An `AudioBuffer`
 *   belongs to the context that decoded it, so a bank cannot outlive its
 *   context; `disposePianoSampleBank` exists to break that link explicitly.
 */

export interface SampleVoice {
  buffer: AudioBuffer
  /** Rate that transposes `buffer` to the requested note. */
  playbackRate: number
}

export class PianoSampleBank {
  private readonly context: AudioContext
  private readonly buffers = new Map<number, AudioBuffer>()
  private readonly abort = new AbortController()
  private loading: Promise<void> | null = null
  private disposed = false

  constructor(context: AudioContext) {
    this.context = context
  }

  /**
   * Fetch and decode every sample. Safe to call repeatedly: the first call owns
   * the work and later callers await the same promise.
   */
  load(): Promise<void> {
    if (this.loading) return this.loading

    if (typeof fetch !== 'function') {
      // No way to retrieve the samples at all. Reported once here rather than
      // as thirty identical per-sample failures below.
      console.warn('fetch unavailable; piano samples disabled, using synthesis')
      this.loading = Promise.resolve()
      return this.loading
    }

    this.loading = Promise.all(
      SAMPLE_MIDI_NOTES.map((midi) => this.loadOne(midi))
    ).then(() => undefined)

    return this.loading
  }

  private async loadOne(sampleMidi: number): Promise<void> {
    try {
      const response = await fetch(sampleUrl(sampleMidi), {
        signal: this.abort.signal,
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const encoded = await response.arrayBuffer()
      // `decodeAudioData` is expensive and synchronous inside the browser's
      // audio thread; awaiting each one individually is what keeps a decode from
      // blocking the samples that have already arrived.
      const decoded = await this.context.decodeAudioData(encoded)

      // A dispose (or a context close) can land mid-decode. Dropping the result
      // rather than storing it keeps a stale bank from holding buffers that
      // belong to a context nothing will play through again.
      if (!this.disposed) {
        this.buffers.set(sampleMidi, decoded)
      }
    } catch (error) {
      if (this.abort.signal.aborted) return
      // One warning per sample, not per note: a missing sample would otherwise
      // log on every keystroke for the rest of the session.
      console.warn(`Piano sample ${sampleMidi} unavailable, using synthesis:`, error)
    }
  }

  /**
   * The buffer and rate that play `midi`, or `null` when its sample has not
   * loaded — in which case the caller synthesises the note instead.
   */
  voiceFor(midi: number): SampleVoice | null {
    if (this.disposed) return null

    const sampleMidi = nearestSampleMidi(midi)
    const buffer = this.buffers.get(sampleMidi)
    if (!buffer) return null

    return { buffer, playbackRate: playbackRateForMidi(midi, sampleMidi) }
  }

  /** How many samples are playable, for a loading indicator. */
  get readyCount(): number {
    return this.buffers.size
  }

  get totalCount(): number {
    return SAMPLE_MIDI_NOTES.length
  }

  dispose(): void {
    this.disposed = true
    this.abort.abort()
    this.buffers.clear()
  }
}

/**
 * One bank per AudioContext, shared across every caller.
 *
 * Score playback and the on-screen keyboard each own their audio path but must
 * not each decode their own 20 MB of buffers — and, more audibly, must not end
 * up playing two different pianos. Keying on the context rather than exporting a
 * singleton keeps a bank from outliving the context whose buffers it holds.
 *
 * A `WeakMap` so a closed context and its buffers can be collected without any
 * caller having to remember to unregister it.
 */
const banks = new WeakMap<AudioContext, PianoSampleBank>()

export function getPianoSampleBank(context: AudioContext): PianoSampleBank {
  const existing = banks.get(context)
  if (existing) return existing

  const bank = new PianoSampleBank(context)
  banks.set(context, bank)
  // Loading starts on first request rather than in the constructor so that
  // simply asking for the bank is enough — no caller can forget to start it.
  void bank.load()
  return bank
}

export function disposePianoSampleBank(context: AudioContext): void {
  banks.get(context)?.dispose()
  banks.delete(context)
}
