'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import SimplePianoKeyboard from '@/components/piano/SimplePianoKeyboard'
import { buildKeyLayout } from '@/utils/pianoLayout'
import { revealKeyboardKey } from '@/utils/keyboardScroll'
import { midiToSolfege, VISIBLE_RANGE } from '@/lib/learn/keyboard'
import { staffPosition, type ReadingExample } from '@/lib/learn/reading'
import ScoreExample from './ScoreExample'
import { ListenButton } from './ReadingAudio'

const layout = buildKeyLayout(44, VISIBLE_RANGE)
const whiteMidis = [...layout.byMidi.entries()].filter(([, key]) => !key.black).map(([midi]) => midi)
const learningKeys = new Map([...layout.byMidi.keys()].map(midi => {
  const note = midiToSolfege(midi)
  return [midi, { label: note.middleC ? '가운데 도' : note.name, accessibleName: note.accessibleName, disabled: layout.byMidi.get(midi)?.black }]
}))

export default function ReadingExplorer() {
  const keyboardRegion = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(60)
  useLayoutEffect(() => {
    revealKeyboardKey(keyboardRegion.current, layout.byMidi.get(60))
  }, [])
  const clef = selected < 60 ? 'F' : 'G'
  const note = midiToSolfege(selected)
  const example: ReadingExample = { id: 'selected-note', title: '선택한 음', clef, midis: [selected] }
  const select = (midi: number, reveal = false) => {
    if (!whiteMidis.includes(midi)) return
    setSelected(midi)
    // 건반을 직접 누르면 누른 자리가 튀지 않도록 현재 스크롤을 유지한다.
    if (reveal) revealKeyboardKey(keyboardRegion.current, layout.byMidi.get(midi))
  }
  return (
    <div className="mt-4 space-y-4" data-testid="reading-explorer">
      <p className="text-sm text-ink-muted">도(C3)부터 도(C5)까지 흰 건반 음을 골라 보세요. 가운데 도보다 낮은 음은 낮은음자리표로, 가운데 도부터는 높은음자리표로 보여 줘요. 이 예시에서는 흰 건반 음만 골라요.</p>
      <div role="group" aria-label="음 선택" className="flex flex-wrap gap-2">
        {whiteMidis.map(midi => {
          const item = midiToSolfege(midi)
          return <Button key={midi} size="sm" variant={midi === selected ? 'primary' : 'outline'}
            aria-label={`음 선택: ${item.accessibleName}`} aria-pressed={midi === selected} onClick={() => select(midi, true)}>{item.middleC ? '가운데 도' : item.name} {item.octave}</Button>
        })}
      </div>
      <ScoreExample example={example} />
      {selected === 60 && <ScoreExample example={{ ...example, id: 'selected-middle-bass', clef: 'F' }} />}
      <p role="status" aria-live="polite" aria-atomic="true" aria-label="선택한 음" className="text-sm text-ink">
        {note.middleC ? '가운데 도' : note.name} · {note.octave}옥타브 · {clef === 'G' ? '높은음자리표' : '낮은음자리표'} · {staffPosition(selected, clef).name}
      </p>
      <div ref={keyboardRegion} role="region" aria-label="음높이 학습 건반 (좌우 스크롤)" tabIndex={0} className="max-w-full overflow-x-auto rounded border border-rule">
        <div className="h-44" style={{ width: layout.totalWidth }}>
          <SimplePianoKeyboard layout={layout} learningKeys={learningKeys} activeKeys={new Set([selected])} onKeyPress={select} />
        </div>
      </div>
      <ListenButton midis={[selected]} label="선택한 음 들어 보기" />
    </div>
  )
}
