import { musicXmlPitch } from './reading'

export type NoteValue = 'whole' | 'half' | 'quarter' | 'eighth'
export type Meter = '4/4' | '3/4' | '6/8'
export interface RhythmItem { kind: 'note' | 'rest'; value: NoteValue; dotted?: boolean }
export interface RhythmExample { kind: 'rhythm'; id: string; title: string; meter: Meter; items: readonly RhythmItem[] }
export const RHYTHM_BPM = 80
export const RHYTHM_MIDI = 67
const LENGTHS: Record<NoteValue, number> = { whole: 4, half: 2, quarter: 1, eighth: 0.5 }
const NAMES: Record<NoteValue, string> = { whole: '온', half: '2분', quarter: '4분', eighth: '8분' }
const METERS: Record<Meter, { beats: number; unit: number }> = { '4/4': { beats: 4, unit: 4 }, '3/4': { beats: 3, unit: 4 }, '6/8': { beats: 6, unit: 8 } }

export function quarterBeats(value: NoteValue, dotted = false): number {
  if (!(value in LENGTHS)) throw new RangeError('지원하지 않는 음표 길이입니다.')
  return LENGTHS[value] * (dotted ? 1.5 : 1)
}
export function measureQuarterBeats(meter: Meter): number {
  const time = METERS[meter]
  if (!time) throw new RangeError('지원하지 않는 박자표입니다.')
  return time.beats * 4 / time.unit
}
export function rhythmItemName(item: RhythmItem): string {
  return `${item.dotted ? '점' : ''}${NAMES[item.value]}${item.kind === 'rest' ? '쉼표' : '음표'}`
}
function validate(example: RhythmExample) {
  const total = example.items.reduce((sum, item) => {
    if (item.kind !== 'note' && item.kind !== 'rest') throw new RangeError('음표 또는 쉼표가 필요합니다.')
    const length = quarterBeats(item.value, item.dotted)
    if (!Number.isInteger(length * 2)) throw new RangeError('이 예시는 정수 길이 단위로 적을 수 있어야 합니다.')
    return sum + length
  }, 0)
  if (!example.items.length || total !== measureQuarterBeats(example.meter)) throw new RangeError('예시 한 마디의 길이가 박자표와 같아야 합니다.')
}
const note = (value: NoteValue, dotted = false): RhythmItem => ({ kind: 'note', value, ...(dotted ? { dotted } : {}) })
const rest = (value: NoteValue): RhythmItem => ({ kind: 'rest', value })
const repeat = (item: RhythmItem, count: number) => Array.from({ length: count }, () => ({ ...item }))
const example = (id: string, title: string, meter: Meter, items: RhythmItem[]): RhythmExample => ({ kind: 'rhythm', id, title, meter, items })
export const RHYTHM_EXAMPLES: readonly RhythmExample[] = [
  example('note-whole', '온음표', '4/4', [note('whole')]),
  example('note-half', '2분음표', '4/4', repeat(note('half'), 2)),
  example('note-quarter', '4분음표', '4/4', repeat(note('quarter'), 4)),
  example('note-eighth', '8분음표', '4/4', [note('eighth'), note('eighth'), rest('quarter'), rest('half')]),
  example('rest-whole', '온쉼표', '4/4', [rest('whole')]),
  example('rest-half', '2분쉼표', '4/4', repeat(rest('half'), 2)),
  example('rest-quarter', '4분쉼표', '4/4', repeat(rest('quarter'), 4)),
  example('rest-eighth', '8분쉼표', '4/4', repeat(rest('eighth'), 8)),
  example('note-dotted-half', '점2분음표', '4/4', [note('half', true), note('quarter')]),
  example('note-dotted-quarter', '점4분음표', '4/4', [note('quarter', true), note('eighth'), note('half')]),
  example('meter-four', '4분의 4박자', '4/4', repeat(note('eighth'), 8)),
  example('meter-three', '4분의 3박자', '3/4', repeat(note('eighth'), 6)),
  example('meter-six', '8분의 6박자', '6/8', repeat(note('eighth'), 6)),
]

export function describeRhythm(example: RhythmExample): string {
  validate(example)
  const time = METERS[example.meter]
  const runs: { name: string; count: number }[] = []
  for (const item of example.items) {
    const name = rhythmItemName(item)
    const last = runs.at(-1)
    if (last?.name === name) last.count++
    else runs.push({ name, count: 1 })
  }
  return `${time.unit}분의 ${time.beats}박자예요. ${runs.map(run => `${run.name} ${run.count}개`).join(', ')}예요. 한 마디의 길이는 4분음표 ${measureQuarterBeats(example.meter)}개와 같아요.${example.meter === '6/8' ? ' 8분음표를 3개씩 두 묶음으로 세요.' : ''}`
}

export function rhythmMusicXml(example: RhythmExample): string {
  validate(example)
  const time = METERS[example.meter]
  const beamGroup = example.meter === '6/8' ? 1.5 : 1
  const beams = new Map<number, string>()
  let at = 0
  let run: number[] = []
  let group = -1
  const finish = () => {
    if (run.length > 1) run.forEach((index, position) => beams.set(index, position === 0 ? 'begin' : position === run.length - 1 ? 'end' : 'continue'))
    run = []
  }
  example.items.forEach((item, index) => {
    const nextGroup = Math.floor(at / beamGroup)
    if (nextGroup !== group || item.kind !== 'note' || item.value !== 'eighth' || item.dotted) finish()
    if (item.kind === 'note' && item.value === 'eighth' && !item.dotted) run.push(index)
    group = nextGroup
    at += quarterBeats(item.value, item.dotted)
  })
  finish()
  const notes = example.items.map((item, index) => `<note>${item.kind === 'rest' ? `<rest${example.items.length === 1 && item.value === 'whole' ? ' measure="yes"' : ''}/>` : musicXmlPitch(RHYTHM_MIDI)}<duration>${quarterBeats(item.value, item.dotted) * 2}</duration><type>${item.value}</type>${item.dotted ? '<dot/>' : ''}${beams.has(index) ? `<beam number="1">${beams.get(index)}</beam>` : ''}</note>`).join('')
  return `<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>리듬</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>2</divisions><key><fifths>0</fifths></key><time symbol="normal"><beats>${time.beats}</beats><beat-type>${time.unit}</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${notes}</measure></part></score-partwise>`
}

// A lesson illustration of bar/group accents, with rests left silent.
export function rhythmVelocity(meter: Meter, item: RhythmItem, startQuarterBeats: number): number | null {
  if (item.kind === 'rest') return null
  if (startQuarterBeats === 0) return 0.85
  const groupLength = meter === '6/8' ? 1.5 : 1
  return startQuarterBeats % groupLength === 0 ? 0.65 : 0.45
}

export function rhythmTimeline(example: RhythmExample) {
  validate(example)
  let at = 0
  const events = example.items.map(item => {
    const durationMs = quarterBeats(item.value, item.dotted) * 60000 / RHYTHM_BPM
    const event = { startMs: at, durationMs, midi: item.kind === 'rest' ? null : RHYTHM_MIDI, label: rhythmItemName(item), velocity: rhythmVelocity(example.meter, item, at * RHYTHM_BPM / 60000) }
    at += durationMs
    return event
  })
  return { events, totalMs: at }
}
