export interface PracticeHistoryItem {
  sheetId: number
  title: string
  composer: string
  count: number
  totalSeconds: number
  bestPercentage: number | null
  lastPracticedAt: string | null
}
export interface PracticeHistoryResponse {
  cursor: string
  nextCursor: string | null
  items: PracticeHistoryItem[]
}
