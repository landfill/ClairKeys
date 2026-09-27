'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RESUME_MARGIN_SEC,
  clearResume,
  readResume,
  shouldOfferResume,
  writeResume,
  type SavedResume,
} from '@/utils/practiceResume'

/** Seconds between position saves while a piece is sounding. */
const SAVE_EVERY_SEC = 5

/**
 * Remembers where the reader is in a piece and offers it back on the next
 * visit (D-084). Writes happen every few seconds of playback, on pause and
 * when the page is hidden. A stop resets the playhead to zero, which must not
 * overwrite the place the reader actually reached; a run that reached the end
 * is forgotten instead.
 */
export function usePracticeResume(
  key: string | undefined,
  { currentTime, isPlaying, isSessionActive, totalLength }: {
    currentTime: number
    isPlaying: boolean
    isSessionActive: boolean
    totalLength: number
  }
) {
  const [offer, setOffer] = useState<SavedResume | null>(null)
  useEffect(() => {
    if (!key) return
    const saved = readResume(key)
    setOffer(shouldOfferResume(saved, totalLength) ? saved : null)
  }, [key, totalLength])

  // Once a run starts, the offer is out of date whichever way it started.
  useEffect(() => {
    if (isSessionActive) setOffer(null)
  }, [isSessionActive])

  const last = useRef({ time: 0, bucket: -1, active: false, playing: false })
  useEffect(() => {
    if (!key) return
    const state = last.current
    if (isSessionActive && currentTime > 0) {
      const bucket = Math.floor(currentTime / SAVE_EVERY_SEC)
      const paused = state.playing && !isPlaying
      if (bucket !== state.bucket || paused) {
        writeResume(key, currentTime)
        state.bucket = bucket
      }
      state.time = currentTime
    } else if (!isSessionActive && state.active) {
      if (state.time >= totalLength - RESUME_MARGIN_SEC) clearResume(key)
      state.bucket = -1
    }
    state.active = isSessionActive
    state.playing = isPlaying
  }, [key, currentTime, isPlaying, isSessionActive, totalLength])

  useEffect(() => {
    if (!key) return
    const save = () => {
      if (document.visibilityState !== 'hidden') return
      const state = last.current
      if (state.active && state.time > 0) writeResume(key, state.time)
    }
    document.addEventListener('visibilitychange', save)
    return () => document.removeEventListener('visibilitychange', save)
  }, [key])

  const dismiss = useCallback(() => {
    if (key) clearResume(key)
    setOffer(null)
  }, [key])
  const accept = useCallback(() => setOffer(null), [])

  return { offer, dismiss, accept }
}
