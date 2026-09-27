/**
 * Where the reader left a piece, kept in this browser only (D-084). It is a
 * convenience: storage can be unavailable or cleared, and the page must work
 * the same without it.
 */
export interface SavedResume {
  /** Song seconds. */
  time: number
  savedAt: string
}

/** Positions this close to either end are not worth offering. */
export const RESUME_MARGIN_SEC = 5

export function resumeKeyFor(sheetId: number | string): string {
  return `clairkeys.resume.${sheetId}`
}

export function readResume(key: string): SavedResume | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const { time, savedAt } = parsed as Record<string, unknown>
    if (typeof time !== 'number' || !Number.isFinite(time) || time < 0) return null
    return { time, savedAt: typeof savedAt === 'string' ? savedAt : '' }
  } catch {
    return null
  }
}

export function writeResume(key: string, time: number, now: Date = new Date()): void {
  if (!Number.isFinite(time) || time < 0) return
  try {
    localStorage.setItem(key, JSON.stringify({ time: Math.round(time * 10) / 10, savedAt: now.toISOString() }))
  } catch {
    // Private windows and blocked storage only lose the convenience.
  }
}

export function clearResume(key: string): void {
  try { localStorage.removeItem(key) } catch { /* storage disabled */ }
}

/**
 * Offer a saved position only when returning to it saves real work: not at
 * the very start, not at the end of a finished run, and not past the end of
 * a piece that has since become shorter.
 */
export function shouldOfferResume(saved: SavedResume | null, duration: number): boolean {
  if (!saved) return false
  return saved.time >= RESUME_MARGIN_SEC && saved.time <= duration - RESUME_MARGIN_SEC
}
