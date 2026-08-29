/**
 * 업로드 화면이 보여주는 처리 단계 (D-026 결정 4).
 *
 * 이 표의 `progress` 값은 우리가 정한 눈금이 아니라 **OMR 서비스가 실제로 보내는 지점**이다
 * (`omr-service/app.py`가 0 → 10 → 30 → 60 → 100 순으로 쓴다). 서비스가 그 사이 값을 보내지
 * 않으므로 중간 단계를 지어내지 않는다.
 *
 * 이 단계는 업로드 화면에서만 쓴다. 그 화면만 `jobId`를 갖고 서버는 단계를 저장하지 않으므로,
 * 화면을 떠난 뒤에는 알 방법이 없다. 내 악보 목록은 파생 상태 3종만 쓴다 (D-026 결정 2).
 */

export interface ProcessingStage {
  /** 서비스가 이 단계에 진입할 때 보내는 `progress` 값. */
  readonly progress: number
  /** 화면에 그대로 나가는 문구. */
  readonly label: string
}

export const PROCESSING_STAGES: readonly ProcessingStage[] = [
  { progress: 0, label: '대기 중' },
  { progress: 10, label: 'PDF 분석' },
  { progress: 30, label: '음표 인식' },
  { progress: 60, label: '연주 데이터 생성' },
  { progress: 100, label: '학습 화면 준비' },
] as const

/**
 * 보고된 `progress`가 도달한 마지막 단계의 인덱스.
 *
 * 아직 도달하지 않은 단계로 앞서가지 않는다 — 59는 `음표 인식`이지 `연주 데이터 생성`이 아니다.
 * 서비스가 60을 보내야 그 단계가 시작된 것이고, 그 전까지 우리가 아는 것은 30뿐이다.
 *
 * 숫자가 아니거나 음수인 값(폴링 응답에 `progress`가 없을 때 등)은 첫 단계로 읽는다. 값이 없다는
 * 것은 아직 아무 단계도 보고되지 않았다는 뜻이다.
 */
export function stageIndexForProgress(progress: unknown): number {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return 0

  let index = 0
  for (let i = 0; i < PROCESSING_STAGES.length; i += 1) {
    if (progress >= PROCESSING_STAGES[i].progress) index = i
  }
  return index
}

/** 화면에 노출할 단계 문구. 항상 `PROCESSING_STAGES`의 다섯 중 하나다. */
export function stageLabelForProgress(progress: unknown): string {
  return PROCESSING_STAGES[stageIndexForProgress(progress)].label
}
