import { formatPracticeSummary } from '../practiceSummary'

describe('formatPracticeSummary', () => {
  it('reads as one short line', () => {
    expect(formatPracticeSummary({ count: 3, totalSeconds: 725, bestPercentage: 85.4, lastPracticedAt: '2026-09-27T01:00:00Z' }))
      .toBe('3회 · 총 12분 · 최고 85% · 마지막 9월 27일')
  })

  it('never shows zero minutes for a short history', () => {
    expect(formatPracticeSummary({ count: 1, totalSeconds: 40, bestPercentage: 10, lastPracticedAt: '2026-09-27T01:00:00Z' }))
      .toBe('1회 · 총 1분 미만 · 최고 10% · 마지막 9월 27일')
  })

  it('says plainly when there is nothing yet', () => {
    expect(formatPracticeSummary({ count: 0, totalSeconds: 0, bestPercentage: null, lastPracticedAt: null }))
      .toBe('아직 연습 기록이 없습니다')
  })
})
