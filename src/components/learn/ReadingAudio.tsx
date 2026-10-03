'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui'
import { useFallingNotesAudio } from '@/hooks/useFallingNotesAudio'

const AudioPreview = createContext<((midis: readonly number[]) => Promise<void>) | null>(null)

export function ReadingAudioProvider({ children }: { children: ReactNode }) {
  const { playNoteNow } = useFallingNotesAudio()
  const [failed, setFailed] = useState(false)
  const run = useRef(0)
  const cancelWait = useRef<(() => void) | null>(null)
  useEffect(() => () => { run.current++; cancelWait.current?.() }, [])
  const preview = useCallback(async (midis: readonly number[]) => {
    cancelWait.current?.()
    const token = ++run.current
    setFailed(false)
    for (let index = 0; index < midis.length && run.current === token; index++) {
      try {
        const played = await playNoteNow(midis[index])
        if (run.current !== token) return
        if (!played) setFailed(true)
      } catch (error) {
        if (run.current !== token) return
        console.warn('Reading note audio unavailable:', error)
        setFailed(true)
      }
      if (index < midis.length - 1 && run.current === token) await new Promise<void>(resolve => {
        const finish = () => { clearTimeout(timer); cancelWait.current = null; resolve() }
        const timer = setTimeout(finish, 1200)
        cancelWait.current = finish
      })
    }
  }, [playNoteNow])
  return <AudioPreview.Provider value={preview}>{children}{failed && <p role="status" className="mt-3 text-sm text-ink-muted">소리를 재생하지 못했어요. 악보와 글, 건반은 계속 사용할 수 있어요.</p>}</AudioPreview.Provider>
}

export function ListenButton({ midis, label }: { midis: readonly number[]; label: string }) {
  const preview = useContext(AudioPreview)
  if (!preview) throw new Error('ReadingAudioProvider is required')
  return <Button variant="outline" className="mt-3" onClick={() => { void preview(midis) }}>{label}</Button>
}
