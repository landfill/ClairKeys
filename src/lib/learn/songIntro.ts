import type { CanonicalAnimationData, TempoDisplay } from '@/types/animationContract'
import type { FallingNote } from '@/types/fallingNotes'
import { getTempoDisplay } from '@/utils/tempoDisplay'
import { midiToSolfege } from './keyboard'

export interface IntroItem<T> {
  kind: 'range' | 'duration' | 'hands' | 'tempo' | 'meter' | 'key'
  status: 'known' | 'unknown' | 'inferred'
  value?: T
  source?: string
}
export interface SongRange { minMidi: number; maxMidi: number; low: string; high: string; middleC: string }
export interface SongIntroData {
  range: IntroItem<SongRange>
  duration: IntroItem<number>
  hands: IntroItem<{ label: string; partial: boolean }>
  tempo: IntroItem<TempoDisplay>
  meter: IntroItem<string>
  key: IntroItem<string>
}
const pitchName = (midi: number) => {
  const pitch = midiToSolfege(midi)
  return `${pitch.name}(${pitch.octave}옥타브)`
}
function middleCPosition(low: number, high: number) {
  if (low === 60 && high === 60) return '가운데 도만 있어요.'
  if (high < 60) return '모두 가운데 도보다 낮아요.'
  if (low > 60) return '모두 가운데 도보다 높아요.'
  if (low === 60) return '가운데 도와 그보다 높은 음이 있어요.'
  if (high === 60) return '가운데 도와 그보다 낮은 음이 있어요.'
  return '가운데 도보다 낮은 음과 높은 음이 함께 있어요.'
}

/** Only facts available to the sheet page; player-private score artifacts are not fetched here. */
export function analyzeSongIntro(data: CanonicalAnimationData, converted: readonly FallingNote[]): SongIntroData {
  let range: SongIntroData['range'] = { kind: 'range', status: 'unknown' }
  let lastEnd = 0
  let low = Infinity
  let high = -Infinity
  for (const note of data.notes) {
    low = Math.min(low, note.midi); high = Math.max(high, note.midi)
    lastEnd = Math.max(lastEnd, note.start + note.duration)
  }
  if (data.notes.length) range = { kind: 'range', status: 'known', source: 'animation.notes', value: { minMidi: low, maxMidi: high, low: pitchName(low), high: pitchName(high), middleC: middleCPosition(low, high) } }
  const original = converted.filter(note => note.handSource === 'source' && note.hand)
  let hands: SongIntroData['hands'] = { kind: 'hands', status: 'unknown' }
  if (original.length) {
    const left = original.some(note => note.hand === 'L')
    const right = original.some(note => note.hand === 'R')
    const partial = original.length !== converted.length
    const label = left && right ? '양손' : right ? `오른손${partial ? '' : '만'}` : `왼손${partial ? '' : '만'}`
    hands = { kind: 'hands', status: 'known', value: { label, partial }, source: 'notes.handSource=source' }
  } else if (converted.some(note => note.handSource === 'inferred')) hands = { kind: 'hands', status: 'inferred', source: 'notes.handSource=inferred' }
  return {
    range,
    duration: { kind: 'duration', status: 'known', value: Math.max(data.duration, lastEnd), source: lastEnd > data.duration ? 'animation.notes' : 'animation.duration' },
    hands,
    tempo: data.tempo !== null && (data.tempoSource === 'score' || data.tempoSource === 'user')
      ? { kind: 'tempo', status: 'known', value: getTempoDisplay(data), source: data.tempoSource }
      : { kind: 'tempo', status: 'unknown' },
    // JSON meter defaults to 4/4; a key name does not distinguish relative major/minor.
    meter: { kind: 'meter', status: 'unknown' },
    key: { kind: 'key', status: 'unknown' },
  }
}
