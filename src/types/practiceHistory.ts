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
  page: number
  hasMore: boolean
  items: PracticeHistoryItem[]
}
