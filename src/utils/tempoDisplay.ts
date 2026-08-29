import {
  DEFAULT_TIMING_REFERENCE_BPM,
  type TempoDisplay,
  type TempoDisplayInput,
} from '@/types/animationContract'

/** Formats the tempo and its provenance for both player implementations. */
export function getTempoDisplay({
  tempo,
  tempoSource,
  timingReferenceBpm,
  scoreTempo,
}: TempoDisplayInput): TempoDisplay {
  if (tempo === null) {
    return {
      primary: '빠르기 미상',
      secondary: `♩=${timingReferenceBpm ?? DEFAULT_TIMING_REFERENCE_BPM} 기준으로 계산됨`,
    }
  }

  if (tempoSource === 'score') {
    return { primary: `♩=${tempo} (악보에서 읽음)` }
  }

  if (tempoSource === 'user') {
    return {
      primary: `♩=${tempo} (직접 입력)`,
      ...(scoreTempo !== null && scoreTempo !== undefined && scoreTempo !== tempo
        ? { secondary: `악보 표기: ♩=${scoreTempo}` }
        : {}),
    }
  }

  return { primary: `♩=${tempo} (출처 미상)` }
}
