import { clearScoreArtifactCache, loadScoreArtifact } from '../scoreArtifactCache'

const valid = {
  version: 1,
  musicxml: '<score-partwise version="4.0"></score-partwise>',
  timingReferenceBpm: 60,
  measures: [{ partIndex: 0, measureIndex: 0, start: 0, end: 4, startQuarter: 0, endQuarter: 4 }],
  notes: [],
}

describe('loadScoreArtifact', () => {
  beforeEach(() => clearScoreArtifactCache())

  it('downloads a score once for every reader of the same url', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => valid }) as unknown as typeof fetch
    const [a, b] = await Promise.all([loadScoreArtifact('/api/sheet/1/score'), loadScoreArtifact('/api/sheet/1/score')])
    expect(a).toBe(b)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith('/api/sheet/1/score', { cache: 'no-store' })
  })

  it('forgets a failure so a later reader can try again', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => valid }) as unknown as typeof fetch
    await expect(loadScoreArtifact('/api/sheet/2/score')).rejects.toThrow('Score unavailable')
    await expect(loadScoreArtifact('/api/sheet/2/score')).resolves.toEqual(valid)
  })

  it('rejects a response that is not a score artifact', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 2 }) }) as unknown as typeof fetch
    await expect(loadScoreArtifact('/api/sheet/3/score')).rejects.toThrow('Invalid score')
  })
})
