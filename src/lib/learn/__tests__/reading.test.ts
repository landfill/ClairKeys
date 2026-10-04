import { staffPosition, exampleMusicXml, READING_EXAMPLES, describeExample } from '../reading'
import { midiToSolfege } from '../keyboard'

it.each([
  ['G', [64, 67, 71, 74, 77], ['미', '솔', '시', '레', '파']],
  ['F', [43, 47, 50, 53, 57], ['솔', '시', '레', '파', '라']],
] as const)('%s lines follow the literal teaching standard', (clef, midis, names) => {
  midis.forEach((midi, index) => {
    expect(staffPosition(midi, clef)).toEqual({ kind: 'line', number: index + 1, name: ['첫째 줄', '둘째 줄', '셋째 줄', '넷째 줄', '다섯째 줄'][index] })
    expect(midiToSolfege(midi).name).toBe(names[index])
  })
})
it.each([
  ['G', [65, 69, 72, 76], ['파', '라', '도', '미']],
  ['F', [45, 48, 52, 55], ['라', '도', '미', '솔']],
] as const)('%s spaces follow the literal teaching standard', (clef, midis, names) => {
  midis.forEach((midi, index) => {
    expect(staffPosition(midi, clef)).toEqual({ kind: 'space', number: index + 1, name: ['첫째 칸', '둘째 칸', '셋째 칸', '넷째 칸'][index] })
    expect(midiToSolfege(midi).name).toBe(names[index])
  })
})
it('puts middle C on one ledger line on each side', () => {
  expect(staffPosition(60, 'G')).toEqual({ kind: 'ledger-line', side: 'below', number: 1, name: '아래 덧줄 하나' })
  expect(staffPosition(60, 'F')).toEqual({ kind: 'ledger-line', side: 'above', number: 1, name: '위 덧줄 하나' })
})
it.each([20, 109, 61, 60.5, NaN])('rejects unsupported note %s', midi => {
  expect(() => staffPosition(midi, 'G')).toThrow(RangeError)
})
it('writes one measure of quarter notes with exact pitch and clef XML', () => {
  const xml = new DOMParser().parseFromString(exampleMusicXml({ id: 'test', title: 'test', clef: 'G', midis: [60, 62, 64] }), 'text/xml')
  expect(xml.querySelector('parsererror')).toBeNull()
  expect(xml.querySelectorAll('measure')).toHaveLength(1)
  expect([...xml.querySelectorAll('pitch')].map(pitch => [pitch.querySelector('step')?.textContent, pitch.querySelector('octave')?.textContent])).toEqual([['C', '4'], ['D', '4'], ['E', '4']])
  expect(xml.querySelector('clef sign')?.textContent).toBe('G')
  expect(xml.querySelector('clef line')?.textContent).toBe('2')
  expect(xml.querySelector('key fifths')?.textContent).toBe('0')
  expect([...xml.querySelectorAll('note type')].map(node => node.textContent)).toEqual(['quarter', 'quarter', 'quarter'])
  expect(xml.querySelectorAll('alter, accidental, rest')).toHaveLength(0)
  const bass = new DOMParser().parseFromString(exampleMusicXml({ id: 'bass', title: 'bass', clef: 'F', midis: [43, 60] }), 'text/xml')
  expect(bass.querySelector('clef line')?.textContent).toBe('4')
  expect([...bass.querySelectorAll('pitch')].map(node => node.textContent)).toEqual(['G2', 'C4'])
})
it('keeps example data consistent with the explicit standard arrays', () => {
  expect(READING_EXAMPLES.map(({ id, clef, midis }) => [id, clef, midis])).toEqual([
    ['treble-lines', 'G', [64, 67, 71, 74, 77]], ['treble-spaces', 'G', [65, 69, 72, 76]],
    ['bass-lines', 'F', [43, 47, 50, 53, 57]], ['bass-spaces', 'F', [45, 48, 52, 55]],
    ['middle-treble', 'G', [60]], ['middle-bass', 'F', [60]],
  ])
  READING_EXAMPLES.forEach(example => example.midis.forEach(midi => {
    expect(midiToSolfege(midi).name).not.toContain('#')
    expect(staffPosition(midi, example.clef).name).toBeTruthy()
  }))
})


it('writes the exact pitch/octave for every teaching example', () => {
  const expected = [
    [['E', '4'], ['G', '4'], ['B', '4'], ['D', '5'], ['F', '5']],
    [['F', '4'], ['A', '4'], ['C', '5'], ['E', '5']],
    [['G', '2'], ['B', '2'], ['D', '3'], ['F', '3'], ['A', '3']],
    [['A', '2'], ['C', '3'], ['E', '3'], ['G', '3']],
    [['C', '4']], [['C', '4']],
  ]
  READING_EXAMPLES.forEach((example, index) => {
    const xml = new DOMParser().parseFromString(exampleMusicXml(example), 'text/xml')
    expect([...xml.querySelectorAll('pitch')].map(pitch => [pitch.querySelector('step')?.textContent, pitch.querySelector('octave')?.textContent])).toEqual(expected[index])
  })
})


it.each([
  [57, 'G', { kind: 'ledger-line', side: 'below', number: 2, name: '아래 덧줄 2개' }],
  [64, 'F', { kind: 'ledger-line', side: 'above', number: 2, name: '위 덧줄 2개' }],
  [62, 'G', { kind: 'outside-space', side: 'below', number: 1, name: '오선 바로 아래 칸' }],
  [79, 'G', { kind: 'outside-space', side: 'above', number: 1, name: '오선 바로 위 칸' }],
  [59, 'F', { kind: 'outside-space', side: 'above', number: 1, name: '오선 바로 위 칸' }],
  [41, 'F', { kind: 'outside-space', side: 'below', number: 1, name: '오선 바로 아래 칸' }],
] as const)('names boundary MIDI %i in clef %s from literal standards', (midi, clef, expected) => {
  expect(staffPosition(midi, clef)).toEqual(expected)
})

it('describes every example with the complete literal standard text', () => {
  expect(READING_EXAMPLES.map(describeExample)).toEqual([
    '높은음자리표 오선. 첫째 줄에 미(4옥타브), 둘째 줄에 솔(4옥타브), 셋째 줄에 시(4옥타브), 넷째 줄에 레(5옥타브), 다섯째 줄에 파(5옥타브).',
    '높은음자리표 오선. 첫째 칸에 파(4옥타브), 둘째 칸에 라(4옥타브), 셋째 칸에 도(5옥타브), 넷째 칸에 미(5옥타브).',
    '낮은음자리표 오선. 첫째 줄에 솔(2옥타브), 둘째 줄에 시(2옥타브), 셋째 줄에 레(3옥타브), 넷째 줄에 파(3옥타브), 다섯째 줄에 라(3옥타브).',
    '낮은음자리표 오선. 첫째 칸에 라(2옥타브), 둘째 칸에 도(3옥타브), 셋째 칸에 미(3옥타브), 넷째 칸에 솔(3옥타브).',
    '높은음자리표 오선. 아래 덧줄 하나에 가운데 도(4옥타브).',
    '낮은음자리표 오선. 위 덧줄 하나에 가운데 도(4옥타브).',
  ])
})
