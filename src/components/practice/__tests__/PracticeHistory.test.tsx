import { render, screen, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import PracticeHistory from '../PracticeHistory'
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
const session = useSession as jest.Mock
beforeEach(() => { session.mockReturnValue({ status: 'authenticated', data: { user: { id: 'reader' } } }); global.fetch = jest.fn() })
it('does not request records for a guest', () => {
  session.mockReturnValue({ status: 'unauthenticated', data: null })
  render(<PracticeHistory />)
  expect(screen.getByRole('link', { name: '로그인하고 기록 보기' })).toHaveAttribute('href', '/auth/signin?callbackUrl=%2Fpractice')
  expect(fetch).not.toHaveBeenCalled()
})
it('explains an empty history and offers a way to choose a song', async () => {
  ;(fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ cursor: 'snapshot-start', nextCursor: null, items: [] }) })
  render(<PracticeHistory />)
  expect(await screen.findByText('아직 연습 기록이 없습니다')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '연습할 곡 찾기' })).toHaveAttribute('href', '/explore')
})
it('hides old account data immediately when the session changes', async () => {
  ;(fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ cursor: 'snapshot-start', nextCursor: null, items: [{ sheetId: 1, title: '이전 계정의 곡', composer: '작곡가', count: 1, totalSeconds: 30, bestPercentage: 20, lastPracticedAt: '2026-10-04T01:00:00Z' }] }) })
  const { rerender } = render(<PracticeHistory />)
  await screen.findByText('이전 계정의 곡')
  ;(fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))
  session.mockReturnValue({ status: 'authenticated', data: { user: { id: 'new-reader' } } })
  rerender(<PracticeHistory />)
  expect(screen.queryByText('이전 계정의 곡')).not.toBeInTheDocument()
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
})
