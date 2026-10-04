import { analyzeSongIntro } from '../songIntro'
import { normalizeAnimationData } from '@/utils/animationContract'
import { canonicalToFallingNotes } from '@/utils/dataConverter'
const doc = (extra = {}) => normalizeAnimationData({ version: '1.1', title: '예시', composer: '작곡가', duration: 10, tempo: null, tempoSource: 'unknown', timingReferenceBpm: 60, timeSignature: '4/4', notes: [{ midi: 60, start: 0, duration: 10 }], ...extra })
const analyze = (extra = {}) => { const data = doc(extra); return analyzeSongIntro(data, canonicalToFallingNotes(data)) }
it('does not treat default meter or major-key metadata as verified notation', () => {
  expect(analyze({ keySignature: 'C' }).meter).toEqual({ kind: 'meter', status: 'unknown' })
  expect(analyze().key).toEqual({ kind: 'key', status: 'unknown' })
})
it('uses the range and last end of overlapping and merged notes without naming notation types', () => {
  const result = analyze({ duration: 5, notes: [{ midi: 48, start: 0, duration: 12, hand: 'R' }, { midi: 72, start: 3, duration: 2, hand: 'R' }, { midi: 48, start: 4, duration: 10, hand: 'R' }] })
  expect(result.range.value).toEqual({ minMidi: 48, maxMidi: 72, low: '도(3옥타브)', high: '도(5옥타브)', middleC: '가운데 도보다 낮은 음과 높은 음이 함께 있어요.' })
  expect(result.duration).toEqual({ kind: 'duration', status: 'known', value: 14, source: 'animation.notes' })
  expect(Object.keys(result)).toEqual(['range', 'duration', 'hands', 'tempo', 'meter', 'key'])
})
it.each([['양손', ['L', 'R']], ['오른손만', ['R']], ['왼손만', ['L']]])('reports original %s hands', (label, hands) => {
  expect(analyze({ notes: (hands as string[]).map((hand, i) => ({ midi: 48 + i * 12, start: i, duration: 1, hand })) }).hands).toEqual({ kind: 'hands', status: 'known', value: { label, partial: false }, source: 'notes.handSource=source' })
})
it('labels inferred hands and does not call a partly sourced piece one-handed', () => {
  expect(analyze().hands.status).toBe('inferred')
  const data = doc({ notes: [{ midi: 60, start: 0, duration: 1, hand: 'R' }, { midi: 48, start: 1, duration: 1 }] })
  expect(analyzeSongIntro(data, canonicalToFallingNotes(data)).hands.value).toEqual({ label: '오른손', partial: true })
})
it.each([['score', '♩=80 (악보에서 읽음)'], ['user', '♩=80 (직접 입력)']])('keeps %s tempo provenance', (tempoSource, primary) => {
  expect(analyze({ tempo: 80, tempoSource }).tempo).toEqual({ kind: 'tempo', status: 'known', value: { primary }, source: tempoSource })
})
it('does not publish a legacy unknown-source tempo', () => { expect(analyze({ tempo: 120 }).tempo).toEqual({ kind: 'tempo', status: 'unknown' }) })
it('handles empty songs and keeps document duration', () => {
  const result = analyze({ notes: [], duration: 0 })
  expect(result.range.status).toBe('unknown'); expect(result.hands.status).toBe('unknown')
  expect(result.duration.value).toBe(0)
})
it('names both piano boundaries and middle C directly', () => {
  expect(analyze({ notes: [{ midi: 21, start: 0, duration: 1 }, { midi: 108, start: 1, duration: 1 }] }).range.value).toEqual({ minMidi: 21, maxMidi: 108, low: '라(0옥타브)', high: '도(8옥타브)', middleC: '가운데 도보다 낮은 음과 높은 음이 함께 있어요.' })
  expect(analyze().range.value?.middleC).toBe('가운데 도만 있어요.')
})

it('does not promote a normalization default into verified meter or key', () => {
  const original = { version: '1.1', title: '원본', composer: '작곡가', duration: 1, tempo: null, tempoSource: 'unknown', timingReferenceBpm: 60, notes: [{ midi: 60, start: 0, duration: 1 }] }
  expect(original).not.toHaveProperty('timeSignature')
  expect(original).not.toHaveProperty('keySignature')
  const normalized = normalizeAnimationData(original)
  expect(normalized.timeSignature).toBe('4/4')
  const result = analyzeSongIntro(normalized, canonicalToFallingNotes(normalized))
  expect(result.meter).toEqual({ kind: 'meter', status: 'unknown' })
  expect(result.key).toEqual({ kind: 'key', status: 'unknown' })
})
