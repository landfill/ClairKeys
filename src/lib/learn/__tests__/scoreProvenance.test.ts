import { readScoreProvenance } from '../scoreProvenance'
const note = '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>'
const meter = (beats = '3', unit = '4') => `<time><beats>${beats}</beats><beat-type>${unit}</beat-type></time>`
const key = (fifths = '2') => `<key><fifths>${fifths}</fifths><mode>minor</mode></key>`
const part = (attributes: string, later = '') => `<part id="P1"><measure><attributes>${attributes}</attributes>${note}</measure>${later}</part>`
const xml = (parts: string) => `<score-partwise version="4.0">${parts}</score-partwise>`

it('reads explicit meter and fifths without guessing a major or minor key', () => {
  expect(readScoreProvenance(xml(part(meter() + key())))).toEqual({ meter: '3/4', key: '샵 2개' })
  expect(readScoreProvenance(xml(part(meter('6', '8') + key('-3'))))).toEqual({ meter: '6/8', key: '플랫 3개' })
  expect(readScoreProvenance(xml(part(key('0'))))).toEqual({ key: '샵·플랫 없음' })
})

it('never fills absent or late provenance with defaults', () => {
  expect(readScoreProvenance(xml(part('')))).toEqual({})
  expect(readScoreProvenance(xml(part('', `<measure><attributes>${meter() + key()}</attributes>${note}</measure>`)))).toEqual({})
  expect(readScoreProvenance(xml(`<part><measure>${note}<attributes>${meter() + key()}</attributes></measure></part>`))).toEqual({})
})

it('requires agreement across all parts and changes while keeping independent facts', () => {
  expect(readScoreProvenance(xml(part(meter() + key()) + part(meter('4') + key())))).toEqual({ key: '샵 2개' })
  expect(readScoreProvenance(xml(part(meter() + key(), `<measure><attributes>${key('-1')}</attributes>${note}</measure>`)))).toEqual({ meter: '3/4' })
  expect(readScoreProvenance(xml(part(meter() + key()) + part('')))).toEqual({})
})

it.each([
  meter('3+2'), meter('0'), meter('4','3'), '<time><senza-misura/></time>',
  '<time number="1"><beats>3</beats><beat-type>4</beat-type></time>',
  meter() + meter('4'),
])('omits unsupported meter %s', time => {
  expect(readScoreProvenance(xml(part(time + key())))).toEqual({ key: '샵 2개' })
})
it.each([key('8'), key('1.5'), '<key><key-step>F</key-step><key-alter>1</key-alter></key>', '<key number="1"><fifths>1</fifths></key>', key()+key('-1')])('omits unsupported key %s', signature => {
  expect(readScoreProvenance(xml(part(meter() + signature)))).toEqual({ meter: '3/4' })
})
it.each(['', '<score-partwise><bad>', '<!DOCTYPE score-partwise><score-partwise/>', '<score-timewise/>'])('rejects malformed or unsupported XML', source => {
  expect(readScoreProvenance(source)).toEqual({})
})
