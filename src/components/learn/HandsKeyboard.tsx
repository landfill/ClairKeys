'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import SimplePianoKeyboard from '@/components/piano/SimplePianoKeyboard'
import { useFallingNotesAudio } from '@/hooks/useFallingNotesAudio'
import { buildKeyLayout } from '@/utils/pianoLayout'
import { revealKeyboardKey } from '@/utils/keyboardScroll'
import { midiToSolfege, VISIBLE_RANGE } from '@/lib/learn/keyboard'
import { FINGER_NAMES, FIVE_FINGER_POSITIONS, fingerForKey, type LessonHand } from '@/lib/learn/hands'

const layout = buildKeyLayout(44, VISIBLE_RANGE)
const HAND_NAMES = { right: '오른손', left: '왼손' }

export default function HandsKeyboard() {
  const [hand, setHand] = useState<LessonHand>('right')
  const [selected, setSelected] = useState<number | null>(null)
  const [pressCount, setPressCount] = useState(0)
  const [audioFailed, setAudioFailed] = useState(false)
  const keyboardRegion = useRef<HTMLDivElement>(null)
  const { playNoteNow } = useFallingNotesAudio()
  const learningKeys = useMemo(() => new Map([...layout.byMidi.keys()].map(midi => {
    const note = midiToSolfege(midi)
    const finger = fingerForKey(hand, midi)
    return [midi, {
      label: finger ? `${note.name} ${finger}` : note.middleC ? '가운데 도' : note.name,
      accessibleName: finger ? `${HAND_NAMES[hand]} ${note.accessibleName}, 손가락 ${finger} ${FINGER_NAMES[finger]}` : note.accessibleName,
    }]
  })), [hand])

  useLayoutEffect(() => {
    const positions = FIVE_FINGER_POSITIONS[hand]
    const first = layout.byMidi.get(positions[0].midi)!
    const last = layout.byMidi.get(positions[positions.length - 1].midi)!
    // 다섯 건반의 전체 폭을 하나의 대상으로 삼아 같은 공용 스크롤 규칙을 적용한다.
    revealKeyboardKey(keyboardRegion.current, { x: first.x, w: last.x + last.w - first.x })
  }, [hand])

  const press = (midi: number) => {
    if (!layout.byMidi.has(midi)) return
    setSelected(midi)
    setPressCount(count => count + 1)
    try {
      void Promise.resolve(playNoteNow(midi)).then(played => setAudioFailed(!played)).catch(error => {
        console.warn('Hands lesson audio unavailable:', error)
        setAudioFailed(true)
      })
    } catch (error) {
      console.warn('Hands lesson audio unavailable:', error)
      setAudioFailed(true)
    }
  }
  const note = selected === null ? null : midiToSolfege(selected)
  const finger = selected === null ? undefined : fingerForKey(hand, selected)
  return (
    <div className="mt-4 space-y-4">
      <div role="group" aria-label="연습할 손" className="flex gap-2">
        {(['right', 'left'] as const).map(value => <Button key={value} variant={hand === value ? 'primary' : 'outline'}
          className="border border-rule" aria-pressed={hand === value} onClick={() => { setHand(value); setSelected(null) }}>{HAND_NAMES[value]}</Button>)}
      </div>
      <p className="text-sm text-ink-muted">번호가 있는 다섯 건반을 클릭하거나 터치해 보세요. 키보드에서는 Tab으로 이동한 뒤 Enter 또는 Space로 눌러요.</p>
      <div ref={keyboardRegion} role="region" aria-label="다섯 손가락 자리 건반 (좌우 스크롤)" tabIndex={0} className="max-w-full overflow-x-auto rounded border border-rule">
        <div className="h-44" style={{ width: layout.totalWidth }}>
          <SimplePianoKeyboard layout={layout} learningKeys={learningKeys} activeKeys={new Set(selected === null ? [] : [selected])} onKeyPress={press} />
        </div>
      </div>
      <p role="status" aria-label="누른 건반" aria-live="polite" aria-atomic="true" className="text-sm text-ink">
        <span key={pressCount}>{note ? `${note.middleC ? '가운데 도' : note.name} · ${note.octave}옥타브 · ${finger ? `${HAND_NAMES[hand]} ${finger}번 ${FINGER_NAMES[finger]}` : '현재 다섯 손가락 자리 밖의 음이에요.'}` : '건반을 누르면 계이름과 손가락 번호가 나와요.'}</span>
      </p>
      {audioFailed && <p className="text-sm text-ink-muted">소리를 재생하지 못했어요. 건반 이름과 손가락 번호는 계속 확인할 수 있어요.</p>}
    </div>
  )
}
