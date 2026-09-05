import { quarterBpm, retimeAnimation } from '../tempoInput'
import { normalizeAnimationData } from '../animationContract'

describe('tempo units and stored score timing', () => {
  it('turns the printed dotted-quarter 46 into quarter BPM 69', () => {
    expect(quarterBpm('46', 'dotted-quarter')).toBe(69)
    expect(quarterBpm('120', 'eighth')).toBe(60)
    expect(quarterBpm('40', 'half')).toBe(80)
    expect(quarterBpm('', 'quarter')).toBeNull()
  })

  it.each(['abc', 'Infinity', '-10', '0', '401'])('rejects invalid quarter BPM %s', value => {
    expect(() => quarterBpm(value, 'quarter')).toThrow()
  })

  it('validates the converted value, not just the printed number', () => {
    expect(() => quarterBpm('300', 'dotted-quarter')).toThrow()
    expect(quarterBpm('15', 'half')).toBe(30)
  })

  it('rescales every timestamp without changing pitches or source fingering', () => {
    const original = normalizeAnimationData({
      version: '1.1', title: 'score', composer: 'composer', tempo: 46,
      tempoSource: 'user', timingReferenceBpm: 46, scoreTempo: 69, duration: 12,
      timeSignature: '9/8', notes: [
        { midi: 60, start: 3, duration: 6, hand: 'L', finger: 5, staff: 2, voice: 5 },
        { midi: 72, start: 9, duration: 3, hand: 'R', finger: 1 },
      ],
    })
    const before = JSON.stringify(original)
    const result = retimeAnimation(original, 69)
    expect(result).toMatchObject({ tempo: 69, timingReferenceBpm: 69, scoreTempo: 69, tempoSource: 'user', duration: 8 })
    expect(result.notes).toEqual([
      { ...original.notes[0], start: 2, duration: 4 },
      { ...original.notes[1], start: 6, duration: 2 },
    ])
    expect(JSON.stringify(original)).toBe(before)
    expect(retimeAnimation(result, 46).notes).toEqual(original.notes)
  })
})
