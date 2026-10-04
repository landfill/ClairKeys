import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SheetPage from '../page'
jest.mock('next/navigation', () => ({ useParams: () => ({ id: '6' }) }))
jest.mock('next-auth/react', () => ({ useSession: () => ({ status: 'unauthenticated', data: null }) }))
jest.mock('@/components/layout', () => ({ MainLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>, Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }))
jest.mock('@/components/auth/LoginButton', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }))
jest.mock('@/components/animation/FallingNotesPlayer', () => ({ __esModule: true, default: ({ onSessionChange }: { onSessionChange: (active: boolean) => void }) => <div data-testid="player-root"><button onClick={() => onSessionChange(true)}>재생 시작</button></div> }))
const animation = { version: '1.1', title: '내 곡', composer: '작곡가', duration: 2, tempo: null, tempoSource: 'unknown', timingReferenceBpm: 60, notes: [{ midi: 60, start: 0, duration: 2 }] }
const originalFetch = global.fetch
beforeAll(() => { global.fetch = jest.fn() })
afterAll(() => { global.fetch = originalFetch })
let fetchMock: jest.SpyInstance
beforeEach(() => {
  fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async () => ({ ok: true, status: 200, json: async () => ({ sheetMusic: { id: '6', title: '내 곡', composer: '작곡가', category: null, isPublic: true, provenance: 'omr', createdAt: '2026-10-04', hasScore: false, animationDataUrl: '/intro.json' } }), text: async () => JSON.stringify(animation) } as Response))
})
afterEach(() => jest.restoreAllMocks())
it('places the introduction outside the player and combines playback duration', async () => {
  render(<SheetPage />)
  const intro = await screen.findByRole('region', { name: '이 곡 소개' })
  expect(screen.getByTestId('player-root').contains(intro)).toBe(false)
  expect(screen.getAllByText('재생 시간')).toHaveLength(1)
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/sheet/6', '/intro.json'])
  fireEvent.click(screen.getByRole('button', { name: '재생 시작' }))
  expect(screen.queryByRole('region', { name: '이 곡 소개' })).toBeNull()
})
it('does not disclose introduction or request animation after private access denial', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 403 } as Response)
  render(<SheetPage />)
  await screen.findByText('이 악보에 접근할 권한이 없습니다.')
  expect(screen.queryByRole('region', { name: '이 곡 소개' })).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
it('shows no introduction while data is still loading', async () => {
  fetchMock.mockImplementation(() => new Promise(() => {}))
  render(<SheetPage />)
  await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  expect(screen.queryByRole('region', { name: '이 곡 소개' })).toBeNull()
})
