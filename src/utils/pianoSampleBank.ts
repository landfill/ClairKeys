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
 * - **It never throws and never rejects.** It resolves to an explicit readiness
 *   result so playback can continue on synthesis without presenting that
 *   fallback as successful sample playback.
 * - **It is bound to the AudioContext that will play it.** An `AudioBuffer`
 *   belongs to the context that decoded it, so a bank cannot outlive its
 *   context; `disposePianoSampleBank` exists to break that link explicitly.
 */

export interface SampleVoice {
  buffer: AudioBuffer
  /** Rate that transposes `buffer` to the requested note. */
  playbackRate: number
}

export type PianoSampleLoadStatus = 'ready' | 'degraded' | 'failed'

export interface PianoSampleLoadResult {
  status: PianoSampleLoadStatus
  readyCount: number
  totalCount: number
}

export class PianoSampleBank {
  private readonly context: AudioContext
  private readonly buffers = new Map<number, AudioBuffer>()
  private readonly abort = new AbortController()
  private loading: Promise<PianoSampleLoadResult> | null = null
  private disposed = false
  /** Holds prefetched requests, so disposing it has to stop them too. */
  private claimedPrefetch = false

  constructor(context: AudioContext) {
    this.context = context
  }

  /**
   * Fetch and decode every sample. Safe to call repeatedly: the first call owns
   * the work and later callers await the same promise.
   */
  load(): Promise<PianoSampleLoadResult> {
    if (this.loading) return this.loading
    bankHasLoaded = true

    if (typeof fetch !== 'function') {
      // No way to retrieve the samples at all. Reported once here rather than
      // as thirty identical per-sample failures below.
      console.warn('fetch unavailable; piano samples disabled, using synthesis')
      this.loading = Promise.resolve(this.loadResult())
      return this.loading
    }

    this.loading = Promise.all(
      SAMPLE_MIDI_NOTES.map((midi) => this.loadOne(midi))
    ).then(() => this.loadResult())

    return this.loading
  }

  private loadResult(): PianoSampleLoadResult {
    const readyCount = this.readyCount
    const totalCount = this.totalCount
    return {
      status: readyCount === totalCount
        ? 'ready'
        : readyCount === 0
          ? 'failed'
          : 'degraded',
      readyCount,
      totalCount,
    }
  }

  private async loadOne(sampleMidi: number): Promise<void> {
    try {
      const claimed = takePrefetched(sampleMidi)
      if (claimed) this.claimedPrefetch = true
      const encoded = (await claimed) ?? (await this.fetchOne(sampleMidi))
      // Disposed while the bytes were on their way: the context is gone.
      if (this.disposed) return
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

  private async fetchOne(sampleMidi: number): Promise<ArrayBuffer> {
    const response = await fetch(sampleUrl(sampleMidi), {
      signal: this.abort.signal,
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.arrayBuffer()
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
    if (this.claimedPrefetch) abortPrefetch()
    this.buffers.clear()
  }
}

/**
 * Encoded sample bytes fetched before any AudioContext exists (issue #185).
 *
 * The bank is created by the first 재생 click, because an AudioContext needs a
 * user gesture to run; fetching only then meant a first visit on a slow
 * connection spent the whole SAMPLE_LOAD_WAIT_MS downloading and played the
 * synthesised fallback anyway. Fetching needs no context, so the player starts
 * it while the reader is still looking at the page and the bank only decodes.
 *
 * Each entry is handed out once: `decodeAudioData` detaches the buffer it is
 * given, so a second bank has to fetch its own copy (the samples are served
 * `immutable`, so that is a cache hit). A failed prefetch resolves to `null` and
 * the bank fetches the sample itself, keeping its own failure reporting.
 */
const prefetched = new Map<number, Promise<ArrayBuffer | null>>()
/**
 * Set by the first bank load. A reader can press 재생 before the idle prefetch
 * runs; the bank then fetches for itself, and a prefetch arriving afterwards
 * would download the whole set again into bytes nothing decodes.
 */
let bankHasLoaded = false
/** Stops the prefetch requests once the bank that claimed them is disposed. */
let prefetchAbort: AbortController | null = null

export function prefetchPianoSamples(): void {
  if (bankHasLoaded || prefetched.size > 0 || typeof fetch !== 'function') return

  const abort = new AbortController()
  prefetchAbort = abort
  for (const midi of SAMPLE_MIDI_NOTES) {
    prefetched.set(
      midi,
      fetch(sampleUrl(midi), { signal: abort.signal })
        .then((response) => (response.ok ? response.arrayBuffer() : null))
        .catch(() => null)
    )
  }
}

function takePrefetched(sampleMidi: number): Promise<ArrayBuffer | null> | undefined {
  const entry = prefetched.get(sampleMidi)
  prefetched.delete(sampleMidi)
  return entry
}

function abortPrefetch(): void {
  prefetchAbort?.abort()
  prefetchAbort = null
  prefetched.clear()
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
