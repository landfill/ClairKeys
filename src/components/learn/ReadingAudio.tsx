'use client'

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui'
import { useFallingNotesAudio } from '@/hooks/useFallingNotesAudio'

const AudioPreview = createContext<{
  preview: (midis: readonly number[], buttonId: string) => Promise<void>
  failedButton: string | null
} | null>(null)

export function ReadingAudioProvider({ children }: { children: ReactNode }) {
  const { playNoteNow } = useFallingNotesAudio()
  const [failedButton, setFailedButton] = useState<string | null>(null)
  const run = useRef(0)
  const cancelWait = useRef<(() => void) | null>(null)
  useEffect(() => () => { run.current++; cancelWait.current?.() }, [])
  const preview = useCallback(async (midis: readonly number[], buttonId: string) => {
    cancelWait.current?.()
    const token = ++run.current
    setFailedButton(null)
    for (let index = 0; index < midis.length && run.current === token; index++) {
      try {
        const played = await playNoteNow(midis[index])
        if (run.current !== token) return
        if (!played) setFailedButton(buttonId)
      } catch (error) {
        if (run.current !== token) return
        console.warn('Reading note audio unavailable:', error)
        setFailedButton(buttonId)
      }
      if (index < midis.length - 1 && run.current === token) await new Promise<void>(resolve => {
        const finish = () => { clearTimeout(timer); cancelWait.current = null; resolve() }
        const timer = setTimeout(finish, 1200)
        cancelWait.current = finish
      })
    }
  }, [playNoteNow])
  return <AudioPreview.Provider value={{ preview, failedButton }}>{children}</AudioPreview.Provider>
}

export function ListenButton({ midis, label }: { midis: readonly number[]; label: string }) {
  const audio = useContext(AudioPreview)
  const buttonId = useId()
  const noticeRef = useRef<HTMLParagraphElement>(null)
  const failed = audio?.failedButton === buttonId
  useEffect(() => {
    if (failed) noticeRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  }, [failed])
  if (!audio) throw new Error('ReadingAudioProvider is required')
  return <div className="mt-3">
    <Button variant="outline" onClick={() => { void audio.preview(midis, buttonId) }}>{label}</Button>
    {failed && <p ref={noticeRef} role="status" aria-live="polite" className="mt-2 text-sm text-ink-muted">소리를 재생하지 못했어요. 악보와 글, 건반은 계속 사용할 수 있어요.</p>}
  </div>
}
