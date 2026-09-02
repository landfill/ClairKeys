import { render, screen, waitFor } from '@testing-library/react'
import ProfilePage from '../page'

const mockSession = {
  data: {
    user: {
      id: 'user-1',
      name: '홍길동',
      email: 'hong@example.com',
      image: null as string | null
    }
  },
  status: 'authenticated' as const
}

jest.mock('next-auth/react', () => ({
  useSession: () => mockSession
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn()
}))

const originalFetch = global.fetch

beforeEach(() => {
  mockSession.data.user.name = '홍길동'
  mockSession.data.user.image = null
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ createdAt: '2026-03-12T00:00:00.000Z' })
  }) as unknown as typeof fetch
})

afterEach(() => {
  global.fetch = originalFetch
  jest.clearAllMocks()
})

describe('profile page shell', () => {
  it('renders inside the shared app shell rather than its own page frame', async () => {
    render(<ProfilePage />)

    // MainLayout is what puts the page inside a <main> landmark; the old page
    // built its own bg-gray-50 wrapper and never entered the shell.
    const main = await screen.findByRole('main')

    // PageHeader renders the title as the page's only h1, inside that shell.
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('프로필')
    expect(main).toContainElement(headings[0])
  })

  it('shows the account the user actually signed in with', async () => {
    render(<ProfilePage />)

    expect((await screen.findAllByText('홍길동')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('hong@example.com').length).toBeGreaterThan(0)
  })

  it('falls back to a readable label when the account has no name', async () => {
    mockSession.data.user.name = null as unknown as string

    render(<ProfilePage />)

    expect((await screen.findAllByText('hong@example.com')).length).toBeGreaterThan(0)
  })
})

describe('the profile page says only what it knows', () => {
  /**
   * Every one of these was on the page with no handler behind it. A control that
   * does nothing is worse than an absent one: the user believes the account was
   * deleted, or the notification preference saved.
   */
  it.each([
    ['비밀번호 변경', /비밀번호/],
    ['이메일 알림 토글', /이메일 알림/],
    ['푸시 알림 토글', /푸시 알림/],
    ['계정 삭제', /계정 삭제/],
    ['위험 구역', /위험 구역/]
  ])('does not offer %s, which nothing implements', async (_label, pattern) => {
    render(<ProfilePage />)

    await screen.findAllByText('hong@example.com')
    expect(screen.queryByText(pattern)).not.toBeInTheDocument()
  })

  it('never shows a hardcoded join date', async () => {
    render(<ProfilePage />)

    await screen.findAllByText('hong@example.com')
    expect(screen.queryByText(/2024년 1월 1일/)).not.toBeInTheDocument()
  })

  it('reads the join date from the account rather than inventing one', async () => {
    render(<ProfilePage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/profile')
    })
    expect(await screen.findByText(/2026년 3월 12일/)).toBeInTheDocument()
  })

  it('omits the join date rather than guessing when the request fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Unauthorized' })
    }) as unknown as typeof fetch

    render(<ProfilePage />)

    await screen.findAllByText('hong@example.com')
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.queryByText('가입일')).not.toBeInTheDocument()
  })

  it('has no button that does nothing when pressed', async () => {
    render(<ProfilePage />)

    await screen.findAllByText('hong@example.com')
    for (const button of screen.queryAllByRole('button')) {
      // Every remaining button must carry an accessible name and a handler; a
      // bare decorative button is what the camera and 저장 buttons were.
      expect(button).toHaveAccessibleName()
    }
  })
})
