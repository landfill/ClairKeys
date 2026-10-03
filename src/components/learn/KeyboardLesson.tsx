'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import SimplePianoKeyboard from '@/components/piano/SimplePianoKeyboard'
import { Button } from '@/components/ui'
import { useFallingNotesAudio } from '@/hooks/useFallingNotesAudio'
import { useMidiInput } from '@/hooks/useMidiInput'
import { buildKeyLayout, A0_MIDI, C8_MIDI } from '@/utils/pianoLayout'
import { revealKeyboardKey } from '@/utils/keyboardScroll'
import { chooseDoTarget, judgeDo, midiToSolfege, VISIBLE_RANGE } from '@/lib/learn/keyboard'

const layout = buildKeyLayout(44, VISIBLE_RANGE)
const learningKeys = new Map([...layout.byMidi.keys()].map(midi => {
  const note = midiToSolfege(midi)
  return [midi, { label: note.middleC ? '가운데 도' : note.name, accessibleName: note.accessibleName }]
}))
const blackGroups = [...layout.byMidi.keys()].filter(midi => midi % 12 === 0).flatMap(c => [
  { first: c + 1, last: c + 3, title: '검은 건반 2개' },
  { first: c + 6, last: c + 10, title: '검은 건반 3개' },
]).filter(group => layout.byMidi.has(group.first) && layout.byMidi.has(group.last))

export default function KeyboardLesson({ random = Math.random }: { random?: () => number }) {
  const keyboardRegion = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [pressCount, setPressCount] = useState(0)
  const [sound, setSound] = useState(true)
  const [audioFailed, setAudioFailed] = useState(false)
  const [target, setTarget] = useState<number | null>(null)
  const [result, setResult] = useState<'correct' | 'retry' | null>(null)
  const { playNoteNow } = useFallingNotesAudio()

  // 서버와 첫 렌더의 MIDI 안내를 맞추고, 브라우저 지원 여부는 마운트 뒤에 보여 준다.
  useEffect(() => { setMounted(true) }, [])

  useLayoutEffect(() => {
    revealKeyboardKey(keyboardRegion.current, layout.byMidi.get(60))
  }, [])

  const press = (midi: number) => {
    if (!Number.isInteger(midi) || midi < A0_MIDI || midi > C8_MIDI) return
    setSelected(midi)
    setPressCount(count => count + 1)
    if (target !== null) setResult(judgeDo(target, midi))
    // 표시와 판정을 먼저 끝내 소리가 실패해도 학습을 계속할 수 있게 한다.
    if (sound) {
      try {
        void Promise.resolve(playNoteNow(midi)).then(played => setAudioFailed(!played)).catch(error => {
          console.warn('Learning piano audio unavailable:', error)
          setAudioFailed(true)
        })
      } catch (error) {
        console.warn('Learning piano audio unavailable:', error)
        setAudioFailed(true)
      }
    }
  }
  const midi = useMidiInput({ enabled: true, onNoteOn: press })
  const midiStatus = mounted ? midi.status : null
  const note = selected === null ? null : midiToSolfege(selected)

  return (
    <div className="space-y-6">
      <section aria-labelledby="keyboard-heading">
        <h2 id="keyboard-heading" className="text-lg font-semibold text-ink">건반의 이름과 위치</h2>
        <p className="mt-2 text-sm text-ink-muted">검은 건반은 2개와 3개씩 묶여 반복돼요. 2개 묶음의 바로 왼쪽 흰 건반이 도예요. 가운데 도는 C4예요. 아래 건반에 표시되어 있어요.</p>
        <p className="mt-2 text-sm text-ink-muted">3옥타브의 도(C3)부터 5옥타브의 도(C5)까지 보여 줘요. 건반을 클릭하거나 터치해 보세요. 키보드에서는 Tab으로 이동한 뒤 Enter 또는 Space로 누를 수 있어요. 좁은 화면에서는 건반 영역을 좌우로 스크롤할 수 있어요.</p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={sound} onChange={event => setSound(event.target.checked)} />소리 켜기</label>
          <Button variant="outline" onClick={() => { void midi.request() }} disabled={midiStatus === null || midiStatus === 'unsupported' || midiStatus === 'requesting'}>MIDI 연결</Button>
          <p className="text-ink-muted">{midiStatus === null ? 'MIDI 지원 여부를 확인하고 있어요.' : midiStatus === 'unsupported' ? '이 브라우저는 MIDI를 지원하지 않아요.' : midiStatus === 'denied' ? 'MIDI 권한을 허용하면 연결할 수 있어요.' : midiStatus === 'ready' ? (midi.devices.length ? `${midi.devices.join(', ')}에 연결되어 있어요.` : 'MIDI 장치를 연결해 주세요.') : midiStatus === 'requesting' ? 'MIDI를 연결하고 있어요.' : 'MIDI 피아노도 연결할 수 있어요.'}</p>
        </div>
        <div ref={keyboardRegion} role="region" aria-label="학습 건반 (좌우 스크롤)" tabIndex={0} className="mt-4 max-w-full overflow-x-auto rounded border border-rule">
          <div style={{ width: layout.totalWidth }}>
            <div aria-hidden="true" className="relative h-10 text-xs text-ink-muted">
              {blackGroups.map(group => {
                const first = layout.byMidi.get(group.first)!
                const last = layout.byMidi.get(group.last)!
                return <span key={group.first} className="absolute top-2 border-b border-rule text-center" style={{ left: first.x, width: last.x + last.w - first.x }}>{group.title}</span>
              })}
            </div>
            <div className="h-44">
              <SimplePianoKeyboard layout={layout} learningKeys={learningKeys} activeKeys={new Set(selected === null ? [] : [selected])} onKeyPress={press} />
            </div>
          </div>
        </div>
        <p role="status" aria-label="누른 건반" aria-live="polite" aria-atomic="true" className="mt-3 text-ink">
          <span key={pressCount}>{note ? `${note.middleC ? '가운데 도' : note.name} · ${note.octave}옥타브` : '건반을 눌러 이름을 확인해 보세요.'}</span>
        </p>
        {audioFailed && <p className="mt-2 text-sm text-ink-muted">소리를 재생하지 못했어요. 건반 이름과 도 찾기는 계속 사용할 수 있어요.</p>}
      </section>
      <section aria-labelledby="practice-heading" className="border-t border-rule pt-6">
        <h2 id="practice-heading" className="text-lg font-semibold text-ink">도 찾기</h2>
        <p className="mt-2 text-sm text-ink-muted">문제에 나온 옥타브의 도를 찾아 눌러 보세요. 건반의 왼쪽 끝 도는 3옥타브, 가운데 도는 4옥타브, 오른쪽 끝 도는 5옥타브예요. 좁은 화면에서는 좌우로 스크롤해 찾아보세요.</p>
        <Button className="mt-3" onClick={() => { setTarget(chooseDoTarget(VISIBLE_RANGE, random, target)); setResult(null) }}>{target === null ? '도 찾기 시작' : '새 문제'}</Button>
        {target !== null && <p className="mt-3 text-ink" data-testid="do-target">{midiToSolfege(target).octave}옥타브의 도를 눌러 보세요.</p>}
        <p role="status" aria-label="연습 결과" aria-live="polite" aria-atomic="true" className="mt-2 text-ink">
          <span key={pressCount}>{result === 'correct' ? '맞음! 요청한 옥타브의 도를 찾았어요.' : result === 'retry' ? '다시 찾아보세요. 검은 건반 2개 묶음의 왼쪽을 확인해요.' : target !== null ? '도를 골라 주세요.' : ''}</span>
        </p>
      </section>
    </div>
  )
}
