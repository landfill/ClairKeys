/**
 * 처리 단계 매핑이 D-026 결정 4의 표와 같은지 검사한다.
 *
 * 표를 이 파일에 다시 적은 것은 중복이 아니라 의도다. 구현에서 `PROCESSING_STAGES`를 가져다
 * 비교하면 "구현이 자기 자신과 같다"는 것밖에 확인하지 못한다. 결정 문서가 정한 값을 손으로
 * 옮겨 적어야 구현이 표에서 벗어난 순간 여기서 걸린다.
 */
import { PROCESSING_STAGES, stageIndexForProgress, stageLabelForProgress } from '../processingStages'

/** D-026 결정 4의 표. `docs/recovery/DECISIONS.md`에서 옮겨 적었다. */
const DECISION_TABLE: ReadonlyArray<readonly [number, string]> = [
  [0, '대기 중'],
  [10, 'PDF 분석'],
  [30, '음표 인식'],
  [60, '연주 데이터 생성'],
  [100, '학습 화면 준비'],
]

describe('처리 단계 매핑 (D-026 결정 4)', () => {
  it('결정 문서의 표와 정확히 같다', () => {
    expect(PROCESSING_STAGES.map((stage) => [stage.progress, stage.label])).toEqual(
      DECISION_TABLE.map(([progress, label]) => [progress, label])
    )
  })

  it.each(DECISION_TABLE)('서비스가 보내는 %i에서 "%s"를 보여준다', (progress, label) => {
    expect(stageLabelForProgress(progress)).toBe(label)
  })

  /**
   * 계약을 직접 거는 불변식이다. 구현의 분기를 베끼면 구현이 놓친 값을 함께 놓친다 — 이 저장소가
   * DS-2에서 실제로 겪은 실패 방식이다.
   */
  it('어떤 값을 받아도 표에 있는 다섯 문구 중 하나만 보여준다', () => {
    const allowed = new Set(DECISION_TABLE.map(([, label]) => label))
    const probes: unknown[] = [
      -1000, -1, 0, 1, 9, 10, 11, 29, 30, 31, 59, 60, 61, 99, 100, 101, 1000,
      0.5, 59.9, NaN, Infinity, -Infinity, undefined, null, '30', {},
    ]

    for (const probe of probes) {
      expect(allowed.has(stageLabelForProgress(probe))).toBe(true)
    }
  })

  it('서비스가 아직 보고하지 않은 단계로 앞서가지 않는다', () => {
    // 59는 "음표 인식"이 끝났다는 증거가 아니다. 서비스가 60을 보내야 다음 단계가 시작된 것이다.
    expect(stageLabelForProgress(29)).toBe('PDF 분석')
    expect(stageLabelForProgress(59)).toBe('음표 인식')
    expect(stageLabelForProgress(99)).toBe('연주 데이터 생성')
  })

  it('progress가 커질 때 단계가 뒤로 가지 않는다', () => {
    let previous = 0
    for (let progress = 0; progress <= 120; progress += 1) {
      const index = stageIndexForProgress(progress)
      expect(index).toBeGreaterThanOrEqual(previous)
      previous = index
    }
  })

  it('progress를 모를 때는 첫 단계로 읽는다', () => {
    // 폴링 응답에 `progress`가 없을 수 있다. 없는 것은 "아직 아무 단계도 보고되지 않았다"이지
    // 마지막 단계가 아니다.
    expect(stageIndexForProgress(undefined)).toBe(0)
    expect(stageLabelForProgress(undefined)).toBe('대기 중')
  })
})
