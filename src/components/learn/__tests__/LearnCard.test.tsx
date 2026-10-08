import { render, screen, within } from '@testing-library/react'
import LearnCard from '../LearnCard'

describe('LearnCard', () => {
  it('names its single link from the title only and keeps chips and 시작하기 out of it', () => {
    render(<LearnCard title="악보 읽기" href="/learn/reading" eyebrow="2단계" description="악보를 읽어요." topics={['오선', '박자표']} detail="악보 예시 듣기" />)
    const card = screen.getByRole('heading', { level: 3, name: '악보 읽기' }).closest('[data-learn-card]') as HTMLElement
    expect(card).not.toBeNull()
    expect(within(card).getAllByRole('link')).toHaveLength(1)
    const link = within(card).getByRole('link', { name: '악보 읽기' })
    expect(link).toHaveAttribute('href', '/learn/reading')
    expect(link.textContent).toBe('악보 읽기')
    expect(within(card).getByText('2단계')).toBeInTheDocument()
    expect(within(card).getByText('악보를 읽어요.')).toBeInTheDocument()
    expect(within(card).getByText('악보 예시 듣기')).toBeInTheDocument()
    expect(within(card).getAllByText(/오선/).length).toBeGreaterThan(0)
    const start = within(card).getByText(/시작하기/)
    expect(start.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(link.contains(start)).toBe(false)
    expect(within(card).queryByText('준비 중')).toBeNull()
  })

  it('renders as a list item when asked', () => {
    render(<ul><LearnCard as="li" title="용어 사전" href="/learn/glossary" description="뜻을 찾아봐요." /></ul>)
    expect(screen.getByRole('listitem')).toHaveAttribute('data-learn-card')
    expect(within(screen.getByRole('listitem')).getByRole('link', { name: '용어 사전' })).toBeInTheDocument()
  })

  it('shows 준비 중 without a link or 시작하기 when there is no href', () => {
    render(<LearnCard title="손" description="손 자세를 익혀요." topics={['손가락 번호']} />)
    const card = screen.getByRole('heading', { level: 3, name: '손' }).closest('[data-learn-card]') as HTMLElement
    expect(within(card).queryAllByRole('link')).toHaveLength(0)
    expect(within(card).getByText('준비 중')).toBeInTheDocument()
    expect(within(card).queryByText(/시작하기/)).toBeNull()
  })
})
