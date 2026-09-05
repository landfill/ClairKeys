import type { CanonicalAnimationMetadata } from '@/types/animationContract'

/** Optional converter diagnostics are untrusted metadata, not a score repair. */
export default function ScoreTimingNotice({ metadata }: { metadata?: CanonicalAnimationMetadata }) {
  const warnings = Array.isArray(metadata?.timingWarnings) ? metadata.timingWarnings : []
  const measures = new Set<string>()
  let navigation = false
  for (const warning of warnings) {
    if (!warning || typeof warning !== 'object') continue
    if (warning.code === 'unexpanded-navigation') navigation = true
    if (warning.code === 'measure-overflow' && typeof warning.measure === 'string'
      && typeof warning.expectedQuarters === 'number' && Number.isFinite(warning.expectedQuarters)
      && typeof warning.actualQuarters === 'number' && Number.isFinite(warning.actualQuarters)
      && warning.expectedQuarters > 0 && warning.actualQuarters > warning.expectedQuarters) {
      measures.add(warning.measure)
    }
  }
  if (measures.size === 0 && !navigation) return null
  return <div role="status" className="mb-4 rounded-xl border border-state-warning/40 bg-surface-muted p-3 text-sm text-ink">
    <p className="font-medium">리듬 확인이 필요합니다</p>
    {measures.size > 0 && <p className="mt-1 text-xs">
      인식한 박자와 음표 길이가 맞지 않는 곳이 {measures.size}개 마디 있습니다.
      {' '}확인할 곳: {[...measures].slice(0, 6).map(measure => `${measure.slice(0, 24)}마디`).join(', ')}{measures.size > 6 ? ' 외' : ''}.
    </p>}
    {navigation && <p className="mt-1 text-xs">도돌이표 등의 지시가 반복 재생 순서에 반영되지 않았습니다.</p>}
    <p className="mt-1 text-xs">원본 악보와 비교한 뒤 연습해 주세요. 이 안내는 인식 오류를 자동으로 고친 결과가 아닙니다.</p>
  </div>
}
