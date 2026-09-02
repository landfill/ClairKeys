import { fireEvent, render, screen } from '@testing-library/react'
import UserProfile from '../UserProfile'

const mockSession = {
  data: {
    user: {
      id: 'user-1',
      name: 'BYOUNG KWANG KIM',
      email: 'letthelightsurroundyou@gmail.com',
      image: null as string | null
    }
  },
  status: 'authenticated' as const
}

jest.mock('next-auth/react', () => ({
  useSession: () => mockSession,
  signOut: jest.fn()
}))

const originalFetch = global.fetch

beforeEach(() => {
  mockSession.data.user.name = 'BYOUNG KWANG KIM'
  mockSession.data.user.email = 'letthelightsurroundyou@gmail.com'
  mockSession.data.user.image = null
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ isAdmin: false })
  }) as unknown as typeof fetch
})

afterEach(() => {
  global.fetch = originalFetch
  jest.clearAllMocks()
})

const openMenu = () => {
  fireEvent.click(screen.getByRole('button', { name: /계정 메뉴/ }))
}

/**
 * The account this was reported against: a 16-character display name and a
 * 32-character address, which overflowed the fixed 12rem dropdown.
 */
describe('the account menu holds a long name and address', () => {
  it('lets the address wrap instead of running past the menu', () => {
    render(<UserProfile />)
    openMenu()

    const email = screen.getByText('letthelightsurroundyou@gmail.com')
    // A single unbroken token only wraps if it is allowed to break mid-word.
    expect(email.className).toMatch(/\bbreak-all\b/)
  })

  it('keeps the header trigger from growing with the name', () => {
    render(<UserProfile />)

    const label = screen.getByTestId('account-menu-label')
    expect(label.className).toMatch(/\btruncate\b/)
    expect(label.className).toMatch(/max-w-/)
  })

  it('falls back to the address when the account has no name', () => {
    mockSession.data.user.name = null as unknown as string

    render(<UserProfile />)
    openMenu()

    // Previously rendered an empty <div> where the name would be.
    expect(screen.queryByTestId('account-menu-name')).not.toBeInTheDocument()
    expect(
      screen.getAllByText('letthelightsurroundyou@gmail.com').length
    ).toBeGreaterThan(0)
  })
})

describe('the account menu uses the design system', () => {
  it('paints itself with tokens rather than the default palette', () => {
    render(<UserProfile />)
    openMenu()

    const menu = screen.getByRole('menu')
    const classes = [menu, ...menu.querySelectorAll('*')]
      .map(element => element.className)
      .filter((value): value is string => typeof value === 'string')
      .join(' ')

    // bg-white and the gray/blue/orange/red ramps are what this menu used
    // while every other part of the header was already on tokens.
    expect(classes).not.toMatch(/\bbg-white\b/)
    expect(classes).not.toMatch(/\b(?:text|bg|border|ring)-(?:gray|blue|orange|red)-\d/)
  })

  it('gives the menu border an explicit colour', () => {
    render(<UserProfile />)
    openMenu()

    // A bare `border` inherits currentColor, which rendered the menu outlined
    // in full-strength ink instead of the hairline every other surface uses.
    const menu = screen.getByRole('menu')
    expect(menu.className).toMatch(/\bborder-rule\b/)
  })

  it('does not override the global focus ring', () => {
    render(<UserProfile />)

    // Button.tsx: a per-component ring colour makes focus look different from
    // screen to screen. globals.css owns :focus-visible.
    const trigger = screen.getByRole('button', { name: /계정 메뉴/ })
    expect(trigger.className).not.toMatch(/\bfocus:ring-/)
  })
})

describe('the account menu can be operated from the keyboard', () => {
  it('announces that it opens a menu', () => {
    render(<UserProfile />)

    const trigger = screen.getByRole('button', { name: /계정 메뉴/ })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    openMenu()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes on Escape, which the backdrop click alone never covered', () => {
    render(<UserProfile />)
    openMenu()
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})

describe('the compact variant used by the mobile menu', () => {
  it('shows the account without a dropdown', () => {
    render(<UserProfile showDropdown={false} />)

    expect(screen.queryByRole('button', { name: /계정 메뉴/ })).not.toBeInTheDocument()
    expect(screen.getByText('BYOUNG KWANG KIM')).toBeInTheDocument()
  })

  it('keeps a long address from widening the mobile menu', () => {
    mockSession.data.user.name = null as unknown as string

    render(<UserProfile showDropdown={false} />)

    const label = screen.getByTestId('account-menu-label')
    expect(label.className).toMatch(/\btruncate\b/)
  })
})
