import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GlossaryExplorer from '../GlossaryExplorer'
import { GLOSSARY_GROUPS } from '@/lib/learn/glossary'

describe('GlossaryExplorer', () => {
  beforeEach(() => {
    jest.spyOn(Storage.prototype, 'setItem')
    jest.spyOn(Storage.prototype, 'getItem')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders initial state with 전체 selected, 25 terms, correct term ids and lesson links', () => {
    render(<GlossaryExplorer groups={GLOSSARY_GROUPS} />)

    // 1. Storage not accessed
    expect(localStorage.setItem).not.toHaveBeenCalled()

    // 2. Initial chips state
    const chipGroup = screen.getByRole('group', { name: '용어 분류' })
    const allChip = within(chipGroup).getByRole('button', { name: '전체' })
    expect(allChip).toHaveAttribute('aria-pressed', 'true')

    const categoryChips = ['건반과 음높이', '음표와 박자', '손과 손가락', '재생과 연습']
    for (const title of categoryChips) {
      const chip = within(chipGroup).getByRole('button', { name: title })
      expect(chip).toHaveAttribute('aria-pressed', 'false')
    }

    // 3. Status text
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('용어 25개')

    // 4. Term id and lesson links
    const waitTerm = document.getElementById('term-wait-mode')
    expect(waitTerm).not.toBeNull()
    const waitLink = within(waitTerm!).getByRole('link', {
      name: '기다리기 모드: 연습 방법 레슨에서 보기',
    })
    expect(waitLink).toHaveAttribute('href', '/learn/practice#wait-mode')
    expect(waitLink).toHaveTextContent('연습 방법 →')

    // Verify aria-hidden arrow
    const arrow = waitLink.querySelector('span[aria-hidden="true"]')
    expect(arrow).not.toBeNull()
    expect(arrow?.textContent).toContain('→')
  })

  it('updates term list and status on search input without saving to localStorage', async () => {
    const user = userEvent.setup()
    render(<GlossaryExplorer groups={GLOSSARY_GROUPS} />)

    const searchInput = screen.getByRole('searchbox', { name: '용어 찾기' })
    await user.type(searchInput, '박자')

    expect(screen.getByRole('status')).toHaveTextContent('용어 4개')
    expect(document.getElementById('term-time-signature')).toBeInTheDocument()
    expect(document.getElementById('term-measure')).toBeInTheDocument()
    expect(document.getElementById('term-metronome')).toBeInTheDocument()
    expect(document.getElementById('term-count-in')).toBeInTheDocument()

    // Term not matching is gone
    expect(document.getElementById('term-middle-c')).toBeNull()

    expect(Storage.prototype.setItem).not.toHaveBeenCalled()
  })

  it('switches category chips and filters terms accordingly without saving to storage', async () => {
    const user = userEvent.setup()
    render(<GlossaryExplorer groups={GLOSSARY_GROUPS} />)

    const chipGroup = screen.getByRole('group', { name: '용어 분류' })
    const practiceChip = within(chipGroup).getByRole('button', { name: '재생과 연습' })
    const allChip = within(chipGroup).getByRole('button', { name: '전체' })

    await user.click(practiceChip)
    expect(practiceChip).toHaveAttribute('aria-pressed', 'true')
    expect(allChip).toHaveAttribute('aria-pressed', 'false')

    expect(screen.getByRole('status')).toHaveTextContent('용어 6개')
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 2, name: '재생과 연습' })).toBeInTheDocument()
    expect(Storage.prototype.setItem).not.toHaveBeenCalled()
  })

  it('filters by category chip and search query together', async () => {
    const user = userEvent.setup()
    render(<GlossaryExplorer groups={GLOSSARY_GROUPS} />)

    const chipGroup = screen.getByRole('group', { name: '용어 분류' })
    const practiceChip = within(chipGroup).getByRole('button', { name: '재생과 연습' })
    await user.click(practiceChip)

    const searchInput = screen.getByRole('searchbox', { name: '용어 찾기' })
    await user.type(searchInput, '박자')

    expect(screen.getByRole('status')).toHaveTextContent('용어 2개')
    expect(document.getElementById('term-metronome')).toBeInTheDocument()
    expect(document.getElementById('term-count-in')).toBeInTheDocument()
    expect(document.getElementById('term-time-signature')).toBeNull()
    expect(Storage.prototype.setItem).not.toHaveBeenCalled()
  })

  it('shows empty state message and hides group headings when 0 terms match', async () => {
    const user = userEvent.setup()
    render(<GlossaryExplorer groups={GLOSSARY_GROUPS} />)

    const searchInput = screen.getByRole('searchbox', { name: '용어 찾기' })
    await user.type(searchInput, '없는말')

    expect(screen.getByRole('status')).toHaveTextContent('용어 0개')
    expect(screen.getByText('찾는 용어가 없어요. 다른 말로 찾아보세요.')).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)

    // Clear search and restore 25 terms
    await user.clear(searchInput)
    expect(screen.getByRole('status')).toHaveTextContent('용어 25개')
    expect(screen.queryByText('찾는 용어가 없어요. 다른 말로 찾아보세요.')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4)
  })
})
