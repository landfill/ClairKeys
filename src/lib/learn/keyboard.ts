import { A0_MIDI, C8_MIDI, type KeyboardRange } from '@/utils/pianoLayout'

// 두 옥타브의 반복을 비교하고 세 곳의 도를 찾도록 마지막 도까지 보여 준다.
export const VISIBLE_RANGE: KeyboardRange = { minMidi: 48, maxMidi: 72 }

// 한 건반에 이름을 두 개 주면 처음 배우는 사람이 헷갈리므로 검은 건반은 샵으로 통일한다.
const NAMES = ['도', '도#', '레', '레#', '미', '파', '파#', '솔', '솔#', '라', '라#', '시']

export function midiToSolfege(midi: number) {
  if (!Number.isInteger(midi) || midi < A0_MIDI || midi > C8_MIDI) throw new RangeError('88건반 범위의 정수 MIDI 번호가 필요합니다.')
  const name = NAMES[midi % 12]
  const octave = Math.floor(midi / 12) - 1
  const middleC = midi === 60
  return { name, octave, middleC, accessibleName: `${middleC ? '가운데 도' : name.replace('#', ' 샵')} (${octave}옥타브)` }
}

export function chooseDoTarget(range: KeyboardRange, random: () => number = Math.random, previous?: number | null): number {
  const candidates: number[] = []
  for (let midi = Math.max(A0_MIDI, Math.ceil(range.minMidi)); midi <= Math.min(C8_MIDI, range.maxMidi); midi++) {
    if (midi % 12 === 0) candidates.push(midi)
  }
  if (!candidates.length) throw new RangeError('이 범위에는 도가 없습니다.')
  const choices = candidates.length > 1 ? candidates.filter(midi => midi !== previous) : candidates
  return choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)))]
}

export function judgeDo(target: number, pressed: number): 'correct' | 'retry' {
  return target % 12 === 0 && target === pressed ? 'correct' : 'retry'
}
