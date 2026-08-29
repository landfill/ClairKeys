/**
 * DS-1의 공통 셸 계약을 고정한다.
 *
 * 두 종류의 단언이 섞여 있다.
 *
 * - 시각 변경(A)이 깨뜨리면 안 되는 것: `playback-chrome` 클래스. 재생 중 Header·Footer를 숨기는
 *   `globals.css`의 규칙이 이 클래스에 걸려 있어서, 셸을 다시 그리다 클래스를 잃으면 재생 화면이
 *   조용히 좁아진다 (D-019, D-024 Directive).
 * - 도달 경로 변경(B)이 만든 것: 내비게이션 3개 구성과 죽은 링크 부재 (D-026 G1-4, DS0-3, DS0-5).
 */
import { render, screen, within } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import Header from '../Header'
import Footer from '../Footer'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

const signedOut = { data: null, status: 'unauthenticated' as const, update: jest.fn() }
const signedIn = {
  data: { user: { id: 'u1', name: 'Tester', email: 't@example.com' }, expires: '' },
  status: 'authenticated' as const,
  update: jest.fn(),
}

describe('Header — 재생 계약', () => {
  it('keeps the playback-chrome hook that hides it during playback', () => {
    mockUseSession.mockReturnValue(signedOut as never)
    const { container } = render(<Header />)

    // globals.css: body.playback-active .playback-chrome { display: none }
    expect(container.querySelector('header')).toHaveClass('playback-chrome')
  })
})

describe('Header — 내비게이션 구성 (D-026 G1-4)', () => {
  it('offers only 탐색 to signed-out visitors', () => {
    mockUseSession.mockReturnValue(signedOut as never)
    render(<Header />)

    const nav = screen.getAllByRole('navigation')[0]
    expect(within(nav).getByRole('link', { name: '탐색' })).toHaveAttribute('href', '/explore')
    expect(within(nav).queryByRole('link', { name: '내 악보' })).toBeNull()
    expect(within(nav).queryByRole('link', { name: '새 악보' })).toBeNull()
  })

  it('offers exactly 내 악보 / 새 악보 / 탐색 to signed-in users', () => {
    mockUseSession.mockReturnValue(signedIn as never)
    render(<Header />)

    const nav = screen.getAllByRole('navigation')[0]
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent?.trim())

    expect(labels).toEqual(['내 악보', '새 악보', '탐색'])
  })

  it('drops the 처리 상태 entry — /processing is gone (D-026 G1-4)', () => {
    mockUseSession.mockReturnValue(signedIn as never)
    const { container } = render(<Header />)

    expect(screen.queryByRole('link', { name: '처리 상태' })).toBeNull()
    expect(container.querySelector('a[href="/processing"]')).toBeNull()
  })

  it('carries no emoji in the wordmark or navigation', () => {
    mockUseSession.mockReturnValue(signedIn as never)
    const { container } = render(<Header />)

    // 이슈 #76: 이모지를 제거하고 일관된 선형 아이콘을 쓴다.
    expect(container.textContent ?? '').not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe('Footer', () => {
  beforeEach(() => mockUseSession.mockReturnValue(signedOut as never))

  it('keeps the playback-chrome hook', () => {
    const { container } = render(<Footer />)
    expect(container.querySelector('footer')).toHaveClass('playback-chrome')
  })

  it('has no dead links (DS0-5)', () => {
    const { container } = render(<Footer />)
    expect(container.querySelectorAll('a[href="#"]')).toHaveLength(0)
  })

  it('does not claim a stale copyright year (DS0-5)', () => {
    const { container } = render(<Footer />)
    expect(container.textContent).toContain(String(new Date().getFullYear()))
    expect(container.textContent).not.toContain('2024')
  })

  it('carries no emoji', () => {
    const { container } = render(<Footer />)
    expect(container.textContent ?? '').not.toMatch(/\p{Extended_Pictographic}/u)
  })
})
