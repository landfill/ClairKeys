/**
 * 사용자 대면 실패 4종의 문구와 복구 행동 (D-026 결정 7).
 *
 * 이 파일이 실패 문구의 유일한 출처다. 서버가 보낸 `error` 문자열을 화면에 그대로 옮기지 않는
 * 것이 핵심이다 — Audiveris가 실패하면 그 문자열은 Java 스택 트레이스이고, 그것을 보여주는 것이
 * 이슈 #47이다. 서버 응답에서 읽는 것은 **분류에 필요한 코드와 상태뿐**이고, 읽을 문장은 전부
 * 여기서 만든다.
 *
 * 종류를 넷으로 묶은 기준은 원인이 아니라 **사용자가 취할 행동**이다. 그래서 "서비스 미설정"과
 * "서비스 응답 없음"은 문구가 다르지만 같은 `service-unavailable`이다 — 둘 다 사용자가 파일을
 * 고쳐서 될 일이 아니고, 저장된 상태를 건드리지 않는다.
 */

import { MAX_UPLOAD_MB, type PdfRejectionReason } from './pdfInspection'

export type UploadFailureKind =
  | 'file-rejected'
  | 'conversion-failed'
  | 'job-lost'
  | 'service-unavailable'

export interface UploadFailure {
  readonly kind: UploadFailureKind
  /** 무엇이 일어났는지. */
  readonly title: string
  /** 왜 그렇게 됐는지. 서버 문자열을 담지 않는다. */
  readonly detail: string
  /** 지금 무엇을 하면 되는지. 항상 사용자가 실행할 수 있는 행동이다. */
  readonly action: string
}

const FILE_REJECTIONS: Record<PdfRejectionReason, Omit<UploadFailure, 'kind'>> = {
  'not-pdf': {
    title: '이 파일은 올릴 수 없습니다',
    detail: 'PDF 악보만 변환할 수 있습니다.',
    action: '악보를 PDF로 내보낸 뒤 다시 선택해 주세요.',
  },
  empty: {
    title: '파일이 비어 있습니다',
    detail: '내용이 들어 있지 않은 파일입니다.',
    action: '악보가 담긴 PDF를 다시 선택해 주세요.',
  },
  'too-large': {
    title: '파일이 너무 큽니다',
    detail: `한 번에 올릴 수 있는 크기는 ${MAX_UPLOAD_MB}MB까지입니다.`,
    action: '페이지를 나누거나 해상도를 낮춰 다시 내보낸 뒤 선택해 주세요.',
  },
  encrypted: {
    title: '암호가 걸린 PDF입니다',
    detail: '암호나 편집 제한이 걸린 파일은 음표를 읽을 수 없습니다.',
    action: '암호를 푼 사본을 만들어 다시 선택해 주세요.',
  },
  duplicate: {
    title: '이미 올린 파일입니다',
    detail: '같은 이름과 크기의 파일을 이 화면에서 이미 변환하고 있습니다.',
    action: '아래 진행 상태를 확인하거나, 다른 파일을 선택해 주세요.',
  },
  unreadable: {
    title: '파일을 읽지 못했습니다',
    detail: '브라우저가 이 파일을 여는 데 실패했습니다.',
    action: '파일이 옮겨지거나 지워지지 않았는지 확인한 뒤 다시 선택해 주세요.',
  },
}

/** 업로드 전 클라이언트 검증에서 걸러진 파일. */
export function describeFileRejection(reason: PdfRejectionReason): UploadFailure {
  return { kind: 'file-rejected', ...FILE_REJECTIONS[reason] }
}

/**
 * 변환은 시작됐지만 악보를 읽지 못한 경우 (이슈 #46 저해상도 포함).
 *
 * 서비스가 보낸 원인 문자열은 인자로도 받지 않는다. 받을 수 있게 해 두면 언젠가 화면에 닿는다.
 */
export function describeConversionFailure(): UploadFailure {
  return {
    kind: 'conversion-failed',
    title: '악보를 읽지 못했습니다',
    detail: '변환은 시작됐지만 이 PDF에서 음표를 알아보지 못했습니다.',
    action: '스캔한 악보라면 더 선명하게 다시 스캔하거나, 악보 프로그램에서 내보낸 PDF로 다시 시도해 주세요.',
  }
}

/** OMR 서비스 재시작으로 진행 중이던 job이 사라진 경우 (`/status`가 404). */
export function describeJobLost(): UploadFailure {
  return {
    kind: 'job-lost',
    title: '변환 작업이 사라졌습니다',
    detail: '변환 서비스가 다시 시작되면서 진행 중이던 작업이 없어졌습니다.',
    action: '같은 파일을 다시 올려 주세요.',
  }
}

/**
 * 서비스에 닿지 못한 경우.
 *
 * **저장된 상태를 실패로 바꾸지 않는다** (D-026 Directive). 서버는 이미 그렇게 동작하고
 * (`/api/omr/status/[jobId]`는 404에서만 행을 실패로 바꾼다), 화면도 같은 규칙을 지켜야 한다 —
 * 닿지 못한 것과 실패한 것은 다르고, 전자는 폴링을 계속해야 한다.
 */
export function describeServiceUnavailable(notConfigured = false): UploadFailure {
  if (notConfigured) {
    return {
      kind: 'service-unavailable',
      title: '변환 서비스가 준비되지 않았습니다',
      detail: '서비스 설정이 끝나지 않아 변환을 시작할 수 없습니다.',
      action: '관리자에게 문의해 주세요.',
    }
  }

  return {
    kind: 'service-unavailable',
    title: '변환 서비스에 연결할 수 없습니다',
    detail: '서비스가 잠시 응답하지 않습니다. 진행 중이던 작업의 상태는 그대로 유지됩니다.',
    action: '잠시 후 다시 시도해 주세요.',
  }
}

/** 설정 자체가 안 된 것과 일시적으로 닿지 않는 것을 가르는 응답 코드. */
const NOT_CONFIGURED_CODES = new Set(['OMR_SERVICE_NOT_CONFIGURED', 'OMR_CALLBACK_NOT_CONFIGURED'])

/** `/api/omr/status/[jobId]`가 job 유실을 알릴 때 쓰는 코드. */
export const JOB_LOST_CODE = 'OMR_JOB_LOST'

/**
 * `/api/omr/upload`의 실패 응답을 4종 중 하나로 분류한다.
 *
 * 401(세션 만료)과 `INVALID_TEMPO`는 여기서 다루지 않는다. 둘 다 파이프라인 실패가 아니라 폼
 * 자체의 문제이고, 각각 로그인 안내와 입력란 오류로 처리하는 것이 맞는 복구 행동이다.
 */
export function classifyUploadResponse(status: number, code?: unknown): UploadFailure {
  if (typeof code === 'string' && NOT_CONFIGURED_CODES.has(code)) {
    return describeServiceUnavailable(true)
  }

  if (status === 400) {
    // 클라이언트 검증이 이미 같은 것을 막고 있으므로 여기까지 오는 400은 드물다. 서버 문구는
    // 영어라 그대로 쓸 수 없고, 어떤 항목이 문제인지는 응답이 말해 주지 않는다.
    return {
      kind: 'file-rejected',
      title: '이 파일은 올릴 수 없습니다',
      detail: `서버가 이 파일을 받지 않았습니다. PDF 파일, ${MAX_UPLOAD_MB}MB 이하만 올릴 수 있습니다.`,
      action: '파일을 확인한 뒤 다시 선택해 주세요.',
    }
  }

  return describeServiceUnavailable()
}
