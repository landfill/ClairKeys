import { getTempoDisplay } from '../tempoDisplay'

describe('tempo provenance display', () => {
  it.each([
    [
      'score',
      { tempo: 60, tempoSource: 'score' as const, timingReferenceBpm: 60 },
      { primary: '♩=60 (악보에서 읽음)' },
    ],
    [
      'user',
      { tempo: 72, tempoSource: 'user' as const, timingReferenceBpm: 72, scoreTempo: 60 },
      { primary: '♩=72 (직접 입력)', secondary: '악보 표기: ♩=60' },
    ],
    [
      'legacy unknown',
      { tempo: 120, tempoSource: 'unknown' as const, timingReferenceBpm: 120 },
      { primary: '♩=120 (출처 미상)' },
    ],
    [
      'unknown tempo',
      { tempo: null, tempoSource: 'unknown' as const, timingReferenceBpm: 60 },
      { primary: '빠르기 미상', secondary: '♩=60 기준으로 계산됨' },
    ],
  ])('%s tempo is distinguishable', (_name, input, expected) => {
    expect(getTempoDisplay(input)).toEqual(expected)
  })

  it('does not repeat the score tempo when user input matches it', () => {
    expect(
      getTempoDisplay({
        tempo: 60,
        tempoSource: 'user',
        timingReferenceBpm: 60,
        scoreTempo: 60,
      })
    ).toEqual({ primary: '♩=60 (직접 입력)' })
  })
})
