'use client'

import { useEffect, useRef } from 'react'

/** Runs shorter than this are a listen or a misclick, not practice. */
export const MIN_REPORT_SEC = 10

export interface PracticeRun {
  durationSeconds: number
  completedPercentage: number
}

/**
 * Measures one practice run and hands it over when it ends (D-085): the wall
 * time spent sounding (pauses excluded) and the furthest point reached. A page
 * that is hidden mid-run reports what it has so far, since it may never come
 * back; the counters then restart so the rest of the run is not counted twice.
 */
export function usePracticeReport({
  isPlaying,
  isSessionActive,
  currentTime,
  totalLength,
  onReport,
}: {
  isPlaying: boolean
  isSessionActive: boolean
  currentTime: number
  totalLength: number
  onReport?: (run: PracticeRun, context: { leavingPage: boolean }) => void
}) {
  const run = useRef({ playedMs: 0, playingSince: null as number | null, furthest: 0, active: false })
  const report = useRef(onReport)
  report.current = onReport
  const length = useRef(totalLength)
  length.current = totalLength

  const flush = useRef((leavingPage: boolean) => {
    const state = run.current
    const now = performance.now()
    const playedMs = state.playedMs + (state.playingSince !== null ? now - state.playingSince : 0)
    const seconds = playedMs / 1000
    if (seconds >= MIN_REPORT_SEC && length.current > 0) {
      report.current?.({
        durationSeconds: Math.round(seconds),
        completedPercentage: Math.min(100, Math.round((state.furthest / length.current) * 10000) / 100),
      }, { leavingPage })
    }
    state.playedMs = 0
    state.playingSince = state.playingSince !== null ? now : null
  })

  useEffect(() => {
    const state = run.current
    if (isSessionActive) state.furthest = Math.max(state.furthest, currentTime)
  }, [isSessionActive, currentTime])

  useEffect(() => {
    const state = run.current
    const now = performance.now()
    if (isPlaying && state.playingSince === null) state.playingSince = now
    if (!isPlaying && state.playingSince !== null) {
      state.playedMs += now - state.playingSince
      state.playingSince = null
    }
    if (!isSessionActive && state.active) {
      flush.current(false)
      state.furthest = 0
    }
    state.active = isSessionActive
  }, [isPlaying, isSessionActive])

  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === 'hidden' && run.current.active) flush.current(true)
    }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [])
}
