/**
 * 홈 샘플은 운영 악보와 **같은 계약**을 통과해야 한다.
 *
 * 샘플만 다른 모양이면 홈에서는 멀쩡히 재생되는데 실제 변환 결과에서는 깨지는 상황이 생기고,
 * 그 차이를 발견하는 곳이 사용자의 첫 업로드가 된다.
 */
import { normalizeAnimationData } from '@/utils/animationContract'
import { MIDI_MAX, MIDI_MIN } from '@/types/animationContract'
import { HOME_SAMPLE_ANIMATION } from '@/fixtures/homeSample'

describe('HOME_SAMPLE_ANIMATION', () => {
  it('passes the canonical animation contract', () => {
    expect(() => normalizeAnimationData(HOME_SAMPLE_ANIMATION)).not.toThrow()
  })

  it('survives a JSON round trip — it is stored data, not a live object', () => {
    const roundTripped = JSON.parse(JSON.stringify(HOME_SAMPLE_ANIMATION))
    expect(() => normalizeAnimationData(roundTripped)).not.toThrow()
  })

  it('keeps every note on an 88-key piano', () => {
    for (const note of HOME_SAMPLE_ANIMATION.notes) {
      expect(note.midi).toBeGreaterThanOrEqual(MIDI_MIN)
      expect(note.midi).toBeLessThanOrEqual(MIDI_MAX)
    }
  })

  it('uses both hands — a one-handed sample would not show what the app does', () => {
    const hands = new Set(HOME_SAMPLE_ANIMATION.notes.map((note) => note.hand))
    expect(hands).toEqual(new Set(['L', 'R']))
  })

  it('declares a duration that actually covers the notes', () => {
    const lastOffset = Math.max(
      ...HOME_SAMPLE_ANIMATION.notes.map((note) => note.start + note.duration)
    )
    expect(HOME_SAMPLE_ANIMATION.duration).toBeGreaterThanOrEqual(lastOffset)
  })

  it('does not claim the tempo came from a score (D-013)', () => {
    // 손으로 쓴 샘플이다. `'score'`는 "악보에서 읽음"을, `'unknown'`은 "출처 미상"을 뜻하는데
    // 둘 다 사실이 아니다.
    expect(HOME_SAMPLE_ANIMATION.tempoSource).toBe('user')
    expect(HOME_SAMPLE_ANIMATION.tempo).not.toBeNull()
  })

  it('names a real piece instead of a file name (DS0-4)', () => {
    expect(HOME_SAMPLE_ANIMATION.title).not.toMatch(/\.(pdf|xml|mxl|json)$/i)
    expect(HOME_SAMPLE_ANIMATION.title).not.toMatch(/_/)
    expect(HOME_SAMPLE_ANIMATION.composer.trim().length).toBeGreaterThan(1)
  })
})
