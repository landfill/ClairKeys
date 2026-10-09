'use client'

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui'
import { DEFAULT_MASTER_GAIN, useFallingNotesAudio } from '@/hooks/useFallingNotesAudio'
import { rhythmTimeline, type RhythmExample } from '@/lib/learn/rhythm'

// 샘플 로딩 상한(2500ms)에 여유를 주되, 오디오 장치가 없어도 글 진행을 시작한다.
const RHYTHM_AUDIO_START_WAIT_MS = 4000
const AUDIO_FAILURE_NOTICE = '소리를 재생하지 못했어요. 악보와 글, 건반은 계속 사용할 수 있어요.'

type PreviewRequest = { midis: readonly number[]; rhythm?: never } | { rhythm: RhythmExample; midis?: never }
type Progress = { buttonId: string; index: number; count: number; label: string }
const AudioPreview = createContext<{
  preview: (request: PreviewRequest, buttonId: string) => Promise<void>
  stop: (buttonId: string) => void
  failedButton: string | null
  progress: Progress | null
  preparingButton: string | null
} | null>(null)

export function ReadingAudioProvider({ children }: { children: ReactNode }) {
  const { playNoteNow, startAudio, stopAudio, stopTappedNotes, setVolume, getCurrentTime } = useFallingNotesAudio()
  const [failedButton, setFailedButton] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [preparingButton, setPreparingButton] = useState<string | null>(null)
  const run = useRef(0)
  const previewActive = useRef(false)
  const activeButton = useRef<string | null>(null)
  const cancelWait = useRef<(() => void) | null>(null)
  const cancel = useCallback(() => {
    run.current++
    cancelWait.current?.()
    activeButton.current = null
    if (previewActive.current) {
      stopAudio()
      stopTappedNotes()
      setVolume(DEFAULT_MASTER_GAIN)
      previewActive.current = false
    }
  }, [stopAudio, stopTappedNotes, setVolume])
  useEffect(() => cancel, [cancel])

  const stop = useCallback((buttonId: string) => {
    if (activeButton.current === buttonId) {
      cancel()
      setProgress(null)
      setPreparingButton(null)
    }
    setFailedButton(current => current === buttonId ? null : current)
  }, [cancel])

  const wait = (milliseconds: number) => new Promise<void>(resolve => {
    const finish = () => { clearTimeout(timer); cancelWait.current = null; resolve() }
    const timer = setTimeout(finish, milliseconds)
    cancelWait.current = finish
  })
  const preview = useCallback(async (request: PreviewRequest, buttonId: string) => {
    cancel()
    const token = run.current
    activeButton.current = buttonId
    setFailedButton(null)
    setProgress(null)
    setPreparingButton(buttonId)
    previewActive.current = true
    if (request.rhythm) {
      const timeline = rhythmTimeline(request.rhythm)
      const notes = timeline.events.flatMap(event => event.midi === null ? [] : [{ midi: event.midi, start: event.startMs / 1000, duration: event.durationMs / 1000, velocity: event.velocity! }])
      // 기존 피아노 일정 재생기로 길이를 연주하고, 쉼표에서는 같은 버스의 소리만 끈다.
      setVolume(timeline.events[0].midi === null ? 0 : DEFAULT_MASTER_GAIN)
      let sounding = false
      if (notes.length) {
        let abandoned = false
        const starting = (async () => {
          try { return await startAudio(notes, 0, 1, false) }
          catch (error) {
            if (token === run.current) console.warn('Reading rhythm audio unavailable:', error)
            return false
          }
        })().then(played => {
          // 취소는 이미 오디오 세대를 무효화했다. 새 예시의 소리는 멈추지 않는다.
          if (abandoned && token === run.current) stopAudio()
          return played
        })
        sounding = await Promise.race([starting, wait(RHYTHM_AUDIO_START_WAIT_MS).then(() => false)])
        abandoned = true
        if (token !== run.current) return
        cancelWait.current?.()
        if (!sounding) {
          stopAudio()
          setPreparingButton(null)
          setFailedButton(buttonId)
        }
      }
      const wallStart = performance.now()
      const clock = () => sounding ? getCurrentTime() * 1000 : performance.now() - wallStart
      const waitUntil = async (target: number) => {
        while (token === run.current && target - clock() > 1) await wait(target - clock())
      }
      for (let index = 0; index < timeline.events.length && token === run.current; index++) {
        const event = timeline.events[index]
        await waitUntil(event.startMs)
        if (token !== run.current) return
        setPreparingButton(null)
        setProgress({ buttonId, index, count: timeline.events.length, label: event.label })
        setVolume(event.midi === null ? 0 : DEFAULT_MASTER_GAIN)
      }
      await waitUntil(timeline.totalMs)
      if (token !== run.current) return
      stopAudio()
      setVolume(DEFAULT_MASTER_GAIN)
      previewActive.current = false
      activeButton.current = null
      setProgress(null)
      return
    }
    // 음높이 예시는 기존 탭 소리와 1200ms 간격을 그대로 쓴다.
    for (let index = 0; index < request.midis.length && run.current === token; index++) {
      try {
        const played = await playNoteNow(request.midis[index])
        if (run.current !== token) return
        setPreparingButton(null)
        if (!played) setFailedButton(buttonId)
      } catch (error) {
        if (run.current !== token) return
        setPreparingButton(null)
        console.warn('Reading note audio unavailable:', error)
        setFailedButton(buttonId)
      }
      if (index < request.midis.length - 1 && run.current === token) await wait(1200)
    }
    if (run.current === token) {
      activeButton.current = null
    }
  }, [cancel, playNoteNow, startAudio, stopAudio, setVolume, getCurrentTime])
  return <AudioPreview.Provider value={{ preview, stop, failedButton, progress, preparingButton }}>{children}</AudioPreview.Provider>
}

type ListenButtonProps = PreviewRequest & { label: string; reserveStatus?: boolean }
export function ListenButton({ midis, rhythm, label, reserveStatus }: ListenButtonProps) {
  const audio = useContext(AudioPreview)
  const buttonId = useId()
  const noticeRef = useRef<HTMLParagraphElement>(null)
  const stopRef = useRef(audio?.stop)
  stopRef.current = audio?.stop
  const failed = audio?.failedButton === buttonId
  const current = audio?.progress?.buttonId === buttonId ? audio.progress : null

  useEffect(() => {
    return () => {
      stopRef.current?.(buttonId)
    }
  }, [buttonId])

  useEffect(() => {
    if (failed) noticeRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  }, [failed])
  if (!audio) throw new Error('ReadingAudioProvider is required')
  return <div className="mt-3">
    <Button variant="outline" className="min-h-11" onClick={() => { void audio.preview(rhythm ? { rhythm } : { midis: midis! }, buttonId) }}>{label}</Button>
    {reserveStatus ? (
      <div className="mt-2 grid">
        <span aria-hidden="true" className="invisible select-none col-start-1 row-start-1 text-sm">{AUDIO_FAILURE_NOTICE}</span>
        {failed && <p ref={noticeRef} role="status" aria-live="polite" className="col-start-1 row-start-1 text-sm text-ink-muted">{AUDIO_FAILURE_NOTICE}</p>}
        {audio.preparingButton === buttonId && <p role="status" aria-label="소리 준비 상태" aria-live="polite" className="col-start-1 row-start-1 text-sm text-ink-muted">소리를 준비하고 있어요.</p>}
        {current && <p role="status" aria-label="리듬 재생 차례" aria-live="polite" className="col-start-1 row-start-1 text-sm text-ink-muted">{current.index + 1}/{current.count} · {current.label}</p>}
      </div>
    ) : (
      <>
        {failed && <p ref={noticeRef} role="status" aria-live="polite" className="mt-2 text-sm text-ink-muted">{AUDIO_FAILURE_NOTICE}</p>}
        {audio.preparingButton === buttonId && <p role="status" aria-label="소리 준비 상태" aria-live="polite" className="mt-2 text-sm text-ink-muted">소리를 준비하고 있어요.</p>}
        {current && <p role="status" aria-label="리듬 재생 차례" aria-live="polite" className="mt-2 text-sm text-ink-muted">{current.index + 1}/{current.count} · {current.label}</p>}
      </>
    )}
  </div>
}
