import { act, fireEvent, render, screen } from '@testing-library/react'
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

beforeEach(() => {
  mockSession.data.user.name = 'BYOUNG KWANG KIM'
  mockSession.data.user.email = 'letthelightsurroundyou@gmail.com'
  mockSession.data.user.image = null
})

afterEach(() => {
  jest.clearAllMocks()
})

/**
 * The admin check fires on mount and resolves immediately, so rendering outside
 * act() leaves a setState pending after the test body. Flushing it here keeps a
 * real act violation introduced later from hiding under the noise.
 */
const renderProfile = async (props: Parameters<typeof UserProfile>[0] = {}) => {
  await act(async () => {
    render(<UserProfile {...props} />)
  })
}

const trigger = () => screen.getByRole('button', { name: /계정 메뉴/ })
const openMenu = () => fireEvent.click(trigger())

/**
 * The account this was reported against: a 16-character display name and a
 * 32-character address, which overflowed the fixed 12rem dropdown.
 */
describe('the account menu holds a long name and address', () => {
  it('lets the address wrap instead of running past the menu', async () => {
    await renderProfile()
    openMenu()

    const email = screen.getByText('letthelightsurroundyou@gmail.com')
    // A single unbroken token only wraps if it is allowed to break mid-word.
    expect(email.className).toMatch(/\bbreak-all\b/)
  })

  it('keeps the header trigger from growing with the name', async () => {
    await renderProfile()

    const label = screen.getByTestId('account-menu-label')
    expect(label.className).toMatch(/\btruncate\b/)
    expect(label.className).toMatch(/max-w-/)
  })

  it('wraps a long name in the identity block rather than clipping it', async () => {
    mockSession.data.user.name = 'Alexandra Konstantinopoulos-Whitfield'

    await renderProfile()
    openMenu()

    // This block exists to say which account is signed in; truncating it there
    // defeats the point, and the address beside it already wraps.
    const name = screen.getByTestId('account-menu-name')
    expect(name.className).not.toMatch(/\btruncate\b/)
    expect(name).toHaveTextContent('Alexandra Konstantinopoulos-Whitfield')
  })

  it('falls back to the address when the account has no name', async () => {
    mockSession.data.user.name = null as unknown as string

    await renderProfile()
    openMenu()

    // Previously rendered an empty <div> where the name would be.
    expect(screen.queryByTestId('account-menu-name')).not.toBeInTheDocument()
    expect(
      screen.getAllByText('letthelightsurroundyou@gmail.com').length
    ).toBeGreaterThan(0)
  })
})

describe('the account menu uses the design system', () => {
  it('paints itself with tokens rather than the default palette', async () => {
    await renderProfile()
    openMenu()

    const menu = screen.getByTestId('account-menu')
    const classes = [menu, ...menu.querySelectorAll('*')]
      .map(element => element.className)
      .filter((value): value is string => typeof value === 'string')
      .join(' ')

    // bg-white and the gray/blue/orange/red ramps are what this menu used
    // while every other part of the header was already on tokens.
    expect(classes).not.toMatch(/\bbg-white\b/)
    expect(classes).not.toMatch(/\b(?:text|bg|border|ring)-(?:gray|blue|orange|red)-\d/)
  })

  it('gives the menu border an explicit colour', async () => {
    await renderProfile()
    openMenu()

    // A bare `border` inherits currentColor, which rendered the menu outlined
    // in full-strength ink instead of the hairline every other surface uses.
    expect(screen.getByTestId('account-menu').className).toMatch(/\bborder-rule\b/)
  })

  it('does not override the global focus ring', async () => {
    await renderProfile()

    // Button.tsx: a per-component ring colour makes focus look different from
    // screen to screen. globals.css owns :focus-visible.
    expect(trigger().className).not.toMatch(/\bfocus:ring-/)
  })

  it('does not clip the focus ring it defers to', async () => {
    await renderProfile()
    openMenu()

    // globals.css draws focus as an outline with a positive offset, which lands
    // outside each full-width item's border box. `overflow-hidden` on the menu
    // would cut it away — deleting the trigger's own ring and then hiding the
    // global one leaves keyboard users worse off than before.
    expect(screen.getByTestId('account-menu').className).not.toMatch(
      /\boverflow-hidden\b/
    )
  })
})

describe('the account menu can be operated from the keyboard', () => {
  it('announces expansion without promising menu navigation, and keeps the visible name', async () => {
    await renderProfile()

    // aria-haspopup="true" means "menu", which would re-make the promise that
    // dropping role="menu" was meant to withdraw.
    expect(trigger()).not.toHaveAttribute('aria-haspopup')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    // WCAG 2.5.3: the accessible name must contain the visible text, or voice
    // control cannot address the control the user is looking at.
    expect(trigger()).toHaveAccessibleName(
      expect.stringContaining('BYOUNG KWANG KIM') as unknown as string
    )

    openMenu()
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes on Escape, which the backdrop click alone never covered', async () => {
    await renderProfile()
    openMenu()
    expect(screen.getByTestId('account-menu')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByTestId('account-menu')).not.toBeInTheDocument()
  })

  it('returns focus to the trigger when Escape closes the menu', async () => {
    await renderProfile()
    openMenu()

    // Focus has moved into the menu, as it would after one Tab.
    const firstItem = screen.getByRole('link', { name: '프로필' })
    firstItem.focus()
    expect(document.activeElement).toBe(firstItem)

    fireEvent.keyDown(document, { key: 'Escape' })

    // Without this the focused element unmounts and focus falls to <body>, so
    // the next Tab restarts from the top of the document.
    expect(document.activeElement).toBe(trigger())
  })

  it('does not claim to be an ARIA menu it has not implemented', async () => {
    await renderProfile()
    openMenu()

    // role="menu" obliges arrow-key navigation and a roving tabindex, and it
    // also requires every child to be a menuitem — which silently dropped the
    // identity block and the logout button for screen-reader users.
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0)
  })
})

describe('every account action stays reachable', () => {
  it('offers logout in the dropdown', async () => {
    await renderProfile()
    openMenu()

    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
  })

  it('offers logout in the compact variant too', async () => {
    // The mobile menu renders this variant, and it was the only account UI
    // there — so a phone had no way to sign out at all.
    await renderProfile({ showDropdown: false })

    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
  })

})

describe('the compact variant used by the mobile menu', () => {
  it('shows the account without a dropdown', async () => {
    await renderProfile({ showDropdown: false })

    expect(screen.queryByRole('button', { name: /계정 메뉴/ })).not.toBeInTheDocument()
    expect(screen.getByText('BYOUNG KWANG KIM')).toBeInTheDocument()
  })

  it('keeps a long address from widening the mobile menu', async () => {
    mockSession.data.user.name = null as unknown as string

    await renderProfile({ showDropdown: false })

    expect(screen.getByTestId('account-menu-label').className).toMatch(/\btruncate\b/)
  })
})
