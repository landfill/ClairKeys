import { act, renderHook, waitFor } from '@testing-library/react'
import { useScoreProvenance } from '../useScoreProvenance'
import { clearScoreArtifactCache, loadScoreArtifact } from '@/utils/scoreArtifactCache'
const xml = '<score-partwise><part><measure><attributes><time><beats>3</beats><beat-type>4</beat-type></time><key><fifths>-1</fifths></key></attributes><note><rest/><duration>3</duration></note></measure></part></score-partwise>'
const artifact = { version: 1, musicxml: xml, timingReferenceBpm: 60, measures: [], notes: [] }
beforeEach(() => { clearScoreArtifactCache(); global.fetch = jest.fn() })

it('shares the player download and clears facts when the URL changes or disappears', async () => {
  ;(fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => artifact })
  const { result, rerender } = renderHook(({ url }: { url?: string }) => useScoreProvenance(url), { initialProps: { url: '/score/1' } as { url?: string } })
  await act(async () => { await loadScoreArtifact('/score/1') })
  await waitFor(() => expect(result.current).toEqual({ meter: '3/4', key: '플랫 1개' }))
  expect(fetch).toHaveBeenCalledTimes(1)
  ;(fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))
  rerender({ url: '/score/2' })
  expect(result.current).toEqual({})
  rerender({ url: undefined })
  expect(result.current).toEqual({})
})
it('ignores a late response from the previous sheet', async () => {
  let resolve!: (value: unknown) => void
  ;(fetch as jest.Mock).mockImplementationOnce(() => new Promise(done => { resolve = done }))
    .mockResolvedValue({ ok: false })
  const { result, rerender } = renderHook(({ url }) => useScoreProvenance(url), { initialProps: { url: '/score/old' } })
  rerender({ url: '/score/new' })
  await act(async () => { resolve({ ok: true, json: async () => artifact }) })
  expect(result.current).toEqual({})
})
it('hides failed or invalid score data without falling back to animation defaults', async () => {
  ;(fetch as jest.Mock).mockResolvedValue({ ok: false })
  const { result } = renderHook(() => useScoreProvenance('/score/failure'))
  await act(async () => {})
  expect(result.current).toEqual({})
})
