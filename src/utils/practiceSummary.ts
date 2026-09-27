/** The signed-in reader's history for one sheet, as `/api/sheet/[id]/practice` returns it. */
export interface PracticeSummary {
  count: number
  totalSeconds: number
  bestPercentage: number | null
  lastPracticedAt: string | null
}

export function formatPracticeSummary(summary: PracticeSummary): string {
  if (summary.count === 0) return '아직 연습 기록이 없습니다'
  const minutes = Math.floor(summary.totalSeconds / 60)
  const parts = [
    `${summary.count}회`,
    minutes > 0 ? `총 ${minutes}분` : '총 1분 미만',
  ]
  if (summary.bestPercentage !== null) parts.push(`최고 ${Math.round(summary.bestPercentage)}%`)
  if (summary.lastPracticedAt) {
    parts.push(`마지막 ${new Date(summary.lastPracticedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}`)
  }
  return parts.join(' · ')
}
