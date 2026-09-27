import { isScoreArtifact, type ScoreArtifact } from '@/types/scoreArtifact'

/**
 * One download per score for the page's lifetime. The score panel and the
 * metronome both read the same artifact (up to 4 MB, served `no-store`), and
 * each fetching it separately would download it twice. A failure is dropped
 * from the cache so a later reader can retry.
 */
const pending = new Map<string, Promise<ScoreArtifact>>()

export function loadScoreArtifact(url: string): Promise<ScoreArtifact> {
  const cached = pending.get(url)
  if (cached) return cached
  const request = fetch(url, { cache: 'no-store' }).then(async response => {
    if (!response.ok) throw new Error('Score unavailable')
    const data: unknown = await response.json()
    if (!isScoreArtifact(data)) throw new Error('Invalid score')
    return data
  })
  pending.set(url, request)
  request.catch(() => { if (pending.get(url) === request) pending.delete(url) })
  return request
}

/** Test seam: forget every cached download. */
export function clearScoreArtifactCache(): void {
  pending.clear()
}
