import {
  PianoSampleBank,
  getPianoSampleBank,
  disposePianoSampleBank,
} from '../pianoSampleBank'
import { SAMPLE_MIDI_NOTES, sampleUrl } from '../pianoSamples'

/**
 * The loader's contract is mostly about what it does when things go wrong:
 * playback must degrade to the synthesised tone rather than throw, go silent, or
 * surface an error while the user is listening.
 */

type FetchMock = jest.Mock<Promise<unknown>, [string]>

/** A stand-in AudioBuffer, tagged so a test can tell which sample it came from. */
function taggedBuffer(url: string): AudioBuffer {
  return { url } as unknown as AudioBuffer
}

function makeContext() {
  return {
    decodeAudioData: jest.fn(async (encoded: ArrayBuffer) =>
      taggedBuffer((encoded as unknown as { url: string }).url)
    ),
  } as unknown as AudioContext
}

/** `fetch` that succeeds for every URL except those in `failing`. */
function makeFetch(failing: Set<string> = new Set()): FetchMock {
  return jest.fn(async (url: string) => {
    if (failing.has(url)) {
      return { ok: false, status: 404 }
    }
    return {
      ok: true,
      arrayBuffer: async () => ({ url }) as unknown as ArrayBuffer,
    }
  }) as FetchMock
}

const originalFetch = global.fetch

describe('PianoSampleBank', () => {
  let warn: jest.SpyInstance

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    global.fetch = originalFetch
    warn.mockRestore()
  })

  it('makes every sample playable once loaded', async () => {
    global.fetch = makeFetch() as unknown as typeof fetch
    const context = makeContext()
    const bank = new PianoSampleBank(context)

    await bank.load()

    expect(bank.readyCount).toBe(SAMPLE_MIDI_NOTES.length)
    expect(bank.totalCount).toBe(SAMPLE_MIDI_NOTES.length)

    const voice = bank.voiceFor(60)
    expect(voice).not.toBeNull()
    // 60 is itself a sampled note, so it plays its own buffer untransposed.
    expect((voice!.buffer as unknown as { url: string }).url).toBe(sampleUrl(60))
    expect(voice!.playbackRate).toBe(1)
  })

  it('transposes a note to its nearest sample', async () => {
    global.fetch = makeFetch() as unknown as typeof fetch
    const bank = new PianoSampleBank(makeContext())
    await bank.load()

    // 61 is one semitone above the sample at 60.
    const voice = bank.voiceFor(61)
    expect((voice!.buffer as unknown as { url: string }).url).toBe(sampleUrl(60))
    expect(voice!.playbackRate).toBeCloseTo(Math.pow(2, 1 / 12), 10)
  })

  it('leaves only the failed note on synthesis when one sample 404s', async () => {
    // A partial failure must not take the rest of the keyboard down with it.
    global.fetch = makeFetch(new Set([sampleUrl(60)])) as unknown as typeof fetch
    const bank = new PianoSampleBank(makeContext())

    await expect(bank.load()).resolves.toBeUndefined()

    expect(bank.voiceFor(60)).toBeNull()
    expect(bank.readyCount).toBe(SAMPLE_MIDI_NOTES.length - 1)
    expect(bank.voiceFor(72)).not.toBeNull()
  })

  it('resolves rather than rejects when every sample fails', async () => {
    // The caller schedules notes off this promise; a rejection would surface as
    // an unhandled error during playback instead of a quieter tone.
    global.fetch = jest.fn(async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch
    const bank = new PianoSampleBank(makeContext())

    await expect(bank.load()).resolves.toBeUndefined()

    expect(bank.readyCount).toBe(0)
    expect(bank.voiceFor(60)).toBeNull()
  })

  it('reports a missing fetch once, not once per sample', async () => {
    // Thirty identical warnings would bury whatever else the console holds.
    global.fetch = undefined as unknown as typeof fetch
    const bank = new PianoSampleBank(makeContext())

    await expect(bank.load()).resolves.toBeUndefined()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(bank.readyCount).toBe(0)
  })

  it('does the work once however many callers ask for it', async () => {
    const fetchMock = makeFetch()
    global.fetch = fetchMock as unknown as typeof fetch
    const bank = new PianoSampleBank(makeContext())

    await Promise.all([bank.load(), bank.load(), bank.load()])

    expect(fetchMock).toHaveBeenCalledTimes(SAMPLE_MIDI_NOTES.length)
  })

  it('stops handing out voices once disposed', async () => {
    global.fetch = makeFetch() as unknown as typeof fetch
    const bank = new PianoSampleBank(makeContext())
    await bank.load()
    expect(bank.voiceFor(60)).not.toBeNull()

    bank.dispose()

    expect(bank.voiceFor(60)).toBeNull()
    expect(bank.readyCount).toBe(0)
  })

  it('does not warn when a load is cut short by dispose', async () => {
    // Aborting is the caller's own doing, not a failure worth reporting.
    global.fetch = jest.fn(async () => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    }) as unknown as typeof fetch
    const bank = new PianoSampleBank(makeContext())

    bank.dispose()
    await bank.load()

    expect(warn).not.toHaveBeenCalled()
  })

  describe('getPianoSampleBank', () => {
    it('shares one bank per AudioContext', async () => {
      global.fetch = makeFetch() as unknown as typeof fetch
      const context = makeContext()

      const first = getPianoSampleBank(context)
      const second = getPianoSampleBank(context)

      // Score playback and the on-screen keyboard must not each decode their own
      // copy of the set, nor end up playing two different pianos.
      expect(second).toBe(first)

      disposePianoSampleBank(context)
    })

    it('builds a fresh bank after the previous one is disposed', async () => {
      global.fetch = makeFetch() as unknown as typeof fetch
      const context = makeContext()

      const first = getPianoSampleBank(context)
      disposePianoSampleBank(context)
      const second = getPianoSampleBank(context)

      expect(second).not.toBe(first)
      disposePianoSampleBank(context)
    })
  })
})
