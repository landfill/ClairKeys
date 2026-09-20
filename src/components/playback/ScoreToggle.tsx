'use client'
import { useEffect, useState } from 'react'

export const SCORE_PREFERENCE_KEY = 'clairkeys.score.visible'
export const SCORE_DESKTOP_QUERY = '(min-width: 1024px) and (pointer: fine)'

export default function ScoreToggle({ available, onChange }: { available: boolean; onChange: (enabled: boolean) => void }) {
  const [desktop, setDesktop] = useState(false)
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const query = window.matchMedia(SCORE_DESKTOP_QUERY)
    const sync = () => setDesktop(query.matches)
    sync()
    query.addEventListener?.('change', sync)
    try { setEnabled(localStorage.getItem(SCORE_PREFERENCE_KEY) === 'true') } catch { /* Browser storage can be disabled. */ }
    return () => query.removeEventListener?.('change', sync)
  }, [])
  useEffect(() => { onChange(available && desktop && enabled) }, [available, desktop, enabled, onChange])
  if (!available || !desktop) return null
  return <button type="button" aria-label="악보 보기" aria-pressed={enabled}
    className="mb-2 ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    onClick={() => {
      const next = !enabled
      setEnabled(next)
      try { localStorage.setItem(SCORE_PREFERENCE_KEY, String(next)) } catch { /* Keep this session usable. */ }
    }}>
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 5h18M3 9h18M3 13h18M3 17h18M15 5v13" />
      <ellipse cx="12.5" cy="18" rx="2.5" ry="1.8" fill="currentColor" />
    </svg>
  </button>
}
