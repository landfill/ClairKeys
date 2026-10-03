import { isBlack } from '@/utils/pianoLayout'
import { midiToSolfege } from './keyboard'

export const NOTE_NAMES_KEY = 'clairkeys.noteNames'

// 한글 한 글자 12px와 좌우 여유 6px, 도만 표시할 때는 10px와 여유 4px를 확보한다.
export function getKeyLabel(midi: number, width: number): { name: string; marker: boolean } | null {
  if (isBlack(midi)) return null
  if (width >= 18 || (midi % 12 === 0 && width >= 14)) return { name: midiToSolfege(midi).name, marker: false }
  return midi === 60 ? { name: midiToSolfege(midi).name, marker: true } : null
}

export function readNoteNames(): boolean {
  try { return localStorage.getItem(NOTE_NAMES_KEY) === 'true' } catch { return false }
}

export function writeNoteNames(value: boolean): void {
  try { localStorage.setItem(NOTE_NAMES_KEY, String(value)) } catch { /* 저장이 막혀도 현재 설정은 유지한다. */ }
}
