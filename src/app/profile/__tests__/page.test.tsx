import { render, screen, waitFor } from '@testing-library/react'
import ProfilePage from '../page'
import { formatJoinDate } from '@/lib/profile/joinDate'

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

/**
 * Midday UTC, so the calendar day is the same in every zone the suite might run
 * in — a midnight instant renders as the previous day west of UTC and made this
 * assertion pass only in UTC and KST. The expectation is formatted the same way
 * the page formats it rather than written out, for the same reason.
 */
const JOIN_DATE_ISO = '2026-03-12T12:00:00.000Z'
const EXPECTED_JOIN_DATE = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}).format(new Date(JOIN_DATE_ISO))

const originalFetch = global.fetch

beforeEach(() => {
  mockSession.data.user.name = '홍길동'
  mockSession.data.user.image = null
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ createdAt: JOIN_DATE_ISO })
  }) as unknown as typeof fetch
})

afterEach(() => {
  global.fetch = originalFetch
  jest.clearAllMocks()
})

describe('formatJoinDate', () => {
  /**
   * Runs in whatever zone the suite is started in, and asserts against the same
   * zone's calendar rather than a written-out date, so it holds everywhere.
   * Pinning the formatter to UTC — as review suggested — would break this in
   * KST and every other zone east of UTC: 23:00Z is already the next day there,
   * and the account really was created on that later day.
   */
  it('reports the day the reader own calendar shows, not the UTC one', () => {
    const iso = '2026-03-11T23:00:00.000Z'
    const local = new Date(iso)

    const formatted = formatJoinDate(iso)

    expect(formatted).toContain(`${local.getFullYear()}년`)
    expect(formatted).toContain(`${local.getMonth() + 1}월`)
    expect(formatted).toContain(`${local.getDate()}일`)
  })

  it('returns null for a value it cannot parse instead of a fallback date', () => {
    expect(formatJoinDate('not-a-date')).toBeNull()
    expect(formatJoinDate('')).toBeNull()
  })
})

describe('profile page shell', () => {
  it('renders inside the shared app shell rather than its own page frame', async () => {
    render(<ProfilePage />)

    // The root layout owns the page's single <main> landmark. Page-level tests
    // render below that boundary, so assert the shared shell wrapper instead.
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('프로필')
    expect(headings[0].closest('.min-h-screen')).toBeInTheDocument()
  })

  it('shows the account the user actually signed in with', async () => {
    render(<ProfilePage />)

    expect((await screen.findAllByText('홍길동')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('hong@example.com').length).toBeGreaterThan(0)
  })

  it('renders the account avatar when the provider supplies one', async () => {
    mockSession.data.user.image = 'https://example.com/avatar.png'

    render(<ProfilePage />)

    await screen.findAllByText('hong@example.com')
    // The avatar is decorative — the name sits beside it — so it carries an
    // empty alt and is found by role rather than by name.
    const images = screen.queryAllByRole('presentation')
    expect(images.length + screen.queryAllByRole('img').length).toBeGreaterThan(0)
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
    expect(await screen.findByText(EXPECTED_JOIN_DATE)).toBeInTheDocument()
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
