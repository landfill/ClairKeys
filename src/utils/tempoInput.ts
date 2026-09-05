import type { CanonicalAnimationData } from '@/types/animationContract'

export const TEMPO_UNITS = {
  quarter: { label: '♩ 4분음표', multiplier: 1 },
  'dotted-quarter': { label: '♩. 점4분음표', multiplier: 1.5 },
  eighth: { label: '♪ 8분음표', multiplier: 0.5 },
  half: { label: '𝅗𝅥 2분음표', multiplier: 2 },
} as const
export type TempoUnit = keyof typeof TEMPO_UNITS
export const TEMPO_ERROR = '4분음표 기준 빠르기는 20에서 400 사이로 입력해 주세요.'

/** The wire contract always uses quarter notes per minute. Blank is optional. */
export function quarterBpm(value: string, unit: TempoUnit): number | null {
  if (!value.trim()) return null
  const bpm = Number(value) * TEMPO_UNITS[unit].multiplier
  if (!Number.isFinite(bpm) || bpm < 20 || bpm > 400) throw new Error(TEMPO_ERROR)
  return bpm
}

/** Scale score time uniformly, preserving relative changes already in seconds. */
export function retimeAnimation(data: CanonicalAnimationData, bpm: number): CanonicalAnimationData {
  quarterBpm(String(bpm), 'quarter')
  const scale = data.timingReferenceBpm / bpm
  return {
    ...data,
    version: '1.1',
    tempo: bpm,
    tempoSource: 'user',
    timingReferenceBpm: bpm,
    duration: data.duration * scale,
    notes: data.notes.map(note => ({ ...note, start: note.start * scale, duration: note.duration * scale })),
  }
}
