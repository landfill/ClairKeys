/**
 * 사용자 대면 실패 4종 (D-026 결정 7).
 *
 * 여기서 거는 것은 문구의 취향이 아니라 계약이다 — 네 종류가 서로 **다른 복구 행동**을 갖는가,
 * 그리고 서버가 보낸 문자열이 이 경로로 새어 나올 수 있는가.
 */
import type { PdfRejectionReason } from '../pdfInspection'
import {
  classifyUploadResponse,
  describeConversionFailure,
  describeFileRejection,
  describeJobLost,
  describeServiceUnavailable,
  type UploadFailure,
} from '../uploadFailures'

const ALL_KINDS = ['file-rejected', 'conversion-failed', 'job-lost', 'service-unavailable'] as const

const REJECTION_REASONS: PdfRejectionReason[] = [
  'not-pdf',
  'empty',
  'too-large',
  'encrypted',
  'duplicate',
  'unreadable',
]

describe('실패 4종', () => {
  const samples: UploadFailure[] = [
    describeFileRejection('not-pdf'),
    describeConversionFailure(),
    describeJobLost(),
    describeServiceUnavailable(),
  ]

  it('D-026이 정한 네 종류를 모두 덮는다', () => {
    expect(samples.map((failure) => failure.kind).sort()).toEqual([...ALL_KINDS].sort())
  })

  it('네 종류가 서로 다른 문구와 복구 행동을 갖는다', () => {
    expect(new Set(samples.map((failure) => failure.title)).size).toBe(samples.length)
    expect(new Set(samples.map((failure) => failure.action)).size).toBe(samples.length)
  })

  it('모든 실패가 사용자가 실행할 수 있는 행동을 갖는다', () => {
    for (const failure of samples) {
      expect(failure.title.trim().length).toBeGreaterThan(0)
      expect(failure.detail.trim().length).toBeGreaterThan(0)
      expect(failure.action.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('파일 거부', () => {
  it.each(REJECTION_REASONS)('%s 마다 다른 복구 행동을 준다', (reason) => {
    const failure = describeFileRejection(reason)
    expect(failure.kind).toBe('file-rejected')
    expect(failure.action.trim().length).toBeGreaterThan(0)
  })

  it('거부 사유마다 문구가 다르다', () => {
    const actions = REJECTION_REASONS.map((reason) => describeFileRejection(reason).detail)
    expect(new Set(actions).size).toBe(REJECTION_REASONS.length)
  })

  it('완료 조건이 이름을 지목한 세 가지에 각각 행동이 있다', () => {
    // "잘못된 파일 · 용량 초과 · 암호화 PDF 각각에 대해 사용자가 취할 행동이 화면에 있다"
    for (const reason of ['not-pdf', 'too-large', 'encrypted'] as const) {
      expect(describeFileRejection(reason).action).toMatch(/주세요/)
    }
  })
})

describe('변환 실패', () => {
  it('서버가 보낸 원인 문자열을 받을 수 있는 통로 자체가 없다', () => {
    // 이슈 #47. 인자를 받게 해 두면 언젠가 스택 트레이스가 화면에 닿는다.
    expect(describeConversionFailure).toHaveLength(0)
  })

  it('더 선명한 PDF로 다시 시도하라고 말한다', () => {
    expect(describeConversionFailure().action).toContain('선명')
  })
})

describe('서비스 불가', () => {
  it('저장된 상태가 유지된다는 것을 알린다', () => {
    // D-026 Directive: 503은 실패가 아니다. 화면도 그렇게 말해야 한다.
    expect(describeServiceUnavailable().detail).toContain('그대로 유지')
    expect(describeServiceUnavailable().action).toContain('잠시 후')
  })

  it('설정되지 않은 서비스는 기다리라고 하지 않고 관리자에게 보낸다', () => {
    const failure = describeServiceUnavailable(true)
    expect(failure.kind).toBe('service-unavailable')
    expect(failure.action).toContain('관리자')
  })
})

describe('classifyUploadResponse', () => {
  it.each([
    [503, 'OMR_SERVICE_NOT_CONFIGURED'],
    [503, 'OMR_CALLBACK_NOT_CONFIGURED'],
  ])('%i %s를 설정 문제로 분류한다', (status, code) => {
    expect(classifyUploadResponse(status, code).action).toContain('관리자')
  })

  it('닿지 못한 서비스(503)를 재시도 가능한 실패로 분류한다', () => {
    const failure = classifyUploadResponse(503, 'OMR_SERVICE_UNAVAILABLE')
    expect(failure.kind).toBe('service-unavailable')
    expect(failure.action).toContain('잠시 후')
  })

  it('변환을 시작하지 못한 서비스 오류(502)도 재시도 가능한 실패다', () => {
    expect(classifyUploadResponse(502, 'OMR_SERVICE_ERROR').kind).toBe('service-unavailable')
  })

  it('400은 파일 거부로 분류한다', () => {
    expect(classifyUploadResponse(400).kind).toBe('file-rejected')
  })

  it('예상하지 못한 상태 코드도 사용자가 할 수 있는 행동으로 끝난다', () => {
    for (const status of [409, 418, 500, 504]) {
      const failure = classifyUploadResponse(status)
      expect(ALL_KINDS).toContain(failure.kind)
      expect(failure.action.trim().length).toBeGreaterThan(0)
    }
  })

  it('code가 문자열이 아니어도 무너지지 않는다', () => {
    expect(classifyUploadResponse(503, undefined).kind).toBe('service-unavailable')
    expect(classifyUploadResponse(503, { code: 'nested' }).kind).toBe('service-unavailable')
  })
})
