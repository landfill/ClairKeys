import { midiToSolfege } from './keyboard'

export type Clef = 'G' | 'F'
export interface ReadingExample {
  id: string
  title: string
  clef: Clef
  midis: readonly number[]
}
export interface StaffPosition {
  kind: 'line' | 'space' | 'ledger-line' | 'outside-space'
  number: number
  side?: 'above' | 'below'
  name: string
}
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11]
const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const ORDINALS = ['첫째', '둘째', '셋째', '넷째', '다섯째']

function whiteIndex(midi: number) {
  midiToSolfege(midi)
  const index = WHITE_PCS.indexOf(midi % 12)
  if (index < 0) throw new RangeError('음높이 예시는 임시표 없는 흰 건반만 사용합니다.')
  return index
}

export function staffPosition(midi: number, clef: Clef): StaffPosition {
  if (clef !== 'G' && clef !== 'F') throw new RangeError('지원하지 않는 음자리표입니다.')
  const degree = Math.floor(midi / 12) * 7 + whiteIndex(midi)
  // 높은음자리표의 맨 아래 줄은 E4, 낮은음자리표는 G2다.
  const offset = degree - (clef === 'G' ? 37 : 25)
  if (offset >= 0 && offset <= 8) {
    const number = Math.floor(offset / 2) + 1
    const kind = offset % 2 === 0 ? 'line' : 'space'
    return { kind, number, name: `${ORDINALS[number - 1]} ${kind === 'line' ? '줄' : '칸'}` }
  }
  const side = offset < 0 ? 'below' : 'above'
  const distance = offset < 0 ? -offset : offset - 8
  const number = Math.ceil(distance / 2)
  if (distance % 2 === 0) return { kind: 'ledger-line', side, number, name: `${side === 'below' ? '아래' : '위'} 덧줄 ${number === 1 ? '하나' : `${number}개`}` }
  return { kind: 'outside-space', side, number, name: number === 1 ? `오선 바로 ${side === 'below' ? '아래' : '위'} 칸` : `오선 ${side === 'below' ? '아래' : '위'} ${number}번째 칸` }
}

export const READING_EXAMPLES: readonly ReadingExample[] = [
  { id: 'treble-lines', title: '높은음자리표 줄 음', clef: 'G', midis: [64, 67, 71, 74, 77] },
  { id: 'treble-spaces', title: '높은음자리표 칸 음', clef: 'G', midis: [65, 69, 72, 76] },
  { id: 'bass-lines', title: '낮은음자리표 줄 음', clef: 'F', midis: [43, 47, 50, 53, 57] },
  { id: 'bass-spaces', title: '낮은음자리표 칸 음', clef: 'F', midis: [45, 48, 52, 55] },
  { id: 'middle-treble', title: '높은음자리표의 가운데 도', clef: 'G', midis: [60] },
  { id: 'middle-bass', title: '낮은음자리표의 가운데 도', clef: 'F', midis: [60] },
]

export function describeExample(example: ReadingExample): string {
  return `${example.clef === 'G' ? '높은음자리표' : '낮은음자리표'} 오선. ${example.midis.map(midi => {
    const note = midiToSolfege(midi)
    return `${staffPosition(midi, example.clef).name}에 ${note.middleC ? '가운데 도' : note.name}(${note.octave}옥타브)`
  }).join(', ')}.`
}

export function exampleMusicXml(example: ReadingExample): string {
  if (!example.midis.length) throw new RangeError('예시에는 음이 하나 이상 필요합니다.')
  if (example.clef !== 'G' && example.clef !== 'F') throw new RangeError('지원하지 않는 음자리표입니다.')
  const notes = example.midis.map(midi => `<note><pitch><step>${STEPS[whiteIndex(midi)]}</step><octave>${midiToSolfege(midi).octave}</octave></pitch><duration>1</duration><type>quarter</type></note>`).join('')
  // 음높이 예시의 모든 음을 한 마디에 담고, 박자표는 예시 렌더러에서 숨긴다.
  return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>예시</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>${example.midis.length}</beats><beat-type>4</beat-type></time><clef><sign>${example.clef}</sign><line>${example.clef === 'G' ? 2 : 4}</line></clef></attributes>${notes}</measure></part></score-partwise>`
}
