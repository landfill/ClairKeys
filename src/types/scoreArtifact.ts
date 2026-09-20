/** Compact playback anchors; MusicXML remains the sole notation document. */
export interface ScoreArtifact {
  version: 1
  musicxml: string
  timingReferenceBpm: number
  measures: Array<{
    /** Zero-based document-order part and measure indices, never printed measure numbers. */
    partIndex: number
    measureIndex: number
    start: number
    end: number
    startQuarter: number
    endQuarter: number
  }>
  notes: Array<{ xmlId: string; noteIndex: number }>
}

export const MAX_SCORE_ARTIFACT_BYTES = 10 * 1024 * 1024

export function isScoreArtifact(value: unknown): value is ScoreArtifact {
  if (!value || typeof value !== 'object') return false
  const a = value as Record<string, unknown>
  const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0
  const index = (n: unknown) => positive(n) && Number.isInteger(n)
  if (a.version !== 1 || typeof a.musicxml !== 'string' || !a.musicxml.includes('<score-partwise') ||
      /<!DOCTYPE|<!ENTITY/i.test(a.musicxml) || !positive(a.timingReferenceBpm) || a.timingReferenceBpm === 0 ||
      !Array.isArray(a.measures) || !Array.isArray(a.notes)) return false
  if (a.musicxml.length > MAX_SCORE_ARTIFACT_BYTES || a.measures.length > 20000 || a.notes.length > 100000) return false
  return a.measures.every(m => m && index(m.partIndex) && index(m.measureIndex) &&
    positive(m.start) && positive(m.end) && m.end >= m.start &&
    positive(m.startQuarter) && positive(m.endQuarter) && m.endQuarter >= m.startQuarter) &&
    a.notes.every(n => n && typeof n.xmlId === 'string' && /^[A-Za-z_][\w.-]{0,127}$/.test(n.xmlId) && index(n.noteIndex))
}
