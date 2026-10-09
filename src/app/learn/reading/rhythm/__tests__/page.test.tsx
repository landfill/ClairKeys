import { render, screen, within } from '@testing-library/react'
import ReadingRhythmPage, { metadata } from '../page'
import { LEARN_LESSONS } from '@/lib/learn/lessons'

jest.mock('@/components/learn/ScoreExample', () => ({ __esModule: true, default: () => <div>악보 예시</div> }))

it('opens the published rhythm lesson with one h1, 4 sections and 4 panels', () => {
  expect(LEARN_LESSONS.find(lesson => lesson.id === 'reading-rhythm')?.available).toBe(true)
  render(<ReadingRhythmPage />)
  expect(metadata.title).toBe('악보 읽기 2: 길이와 박자 | ClairKeys')
  expect(metadata.description).toBeTruthy()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: '악보 읽기 2' })).toBeInTheDocument()

  // Breadcrumbs & steps
  const breadcrumbs = screen.getByRole('navigation', { name: '현재 위치' })
  expect(within(breadcrumbs).getByRole('link', { name: '배우기' })).toHaveAttribute('href', '/learn')
  expect(within(breadcrumbs).getByText('악보 읽기 2')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('5단계 중 3단계')).toBeInTheDocument()

  const expectedHeadings = ['음표의 길이', '쉼표', '점음표', '박자표']
  const expectedIds = ['note-lengths', 'rest-lengths', 'dotted-lengths', 'meters']

  const h2s = screen.getAllByRole('heading', { level: 2 })
  expect(h2s.map(node => node.textContent)).toEqual(expectedHeadings)
  expect(h2s.map(node => node.getAttribute('id'))).toEqual(expectedIds)

  // TOC assertions: 1:1 match with h2s
  const aside = document.querySelector('aside')!
  const toc = within(aside).getByRole('navigation', { name: '이 레슨의 내용' })
  const tocLinks = within(toc).getAllByRole('link')
  expect(tocLinks).toHaveLength(expectedHeadings.length)
  expect(tocLinks.map(a => a.textContent)).toEqual(expectedHeadings)
  expect(tocLinks.map(a => a.getAttribute('href'))).toEqual(expectedIds.map(id => `#${id}`))

  // Table should NOT be present (table was replaced by panels)
  expect(screen.queryByRole('table')).toBeNull()

  // 4 rhythm panels with respective group labels and button counts: 4, 4, 2, 3
  const panels = [
    { label: '음표 길이 비교', expectedButtons: 4 },
    { label: '쉼표 예시', expectedButtons: 4 },
    { label: '점음표 예시', expectedButtons: 2 },
    { label: '박자표 예시', expectedButtons: 3 },
  ]

  for (const { label, expectedButtons } of panels) {
    const group = screen.getByRole('group', { name: label })
    expect(group).toBeInTheDocument()
    const buttons = within(group).getAllByRole('button')
    expect(buttons).toHaveLength(expectedButtons)
  }

  // Accessible names for buttons with beats (exact string matching requirement)
  const buttonsWithBeats = [
    '온음표, 4박',
    '2분음표, 2박',
    '4분음표, 1박',
    '8분음표, 반 박',
    '점2분음표, 3박',
    '점4분음표, 1박 반',
  ]
  for (const name of buttonsWithBeats) {
    expect(screen.getByRole('button', { name })).toHaveAccessibleName(name)
  }

  // Buttons without beats keep title as accessible name
  expect(screen.getByRole('button', { name: '온쉼표' })).toHaveAccessibleName('온쉼표')
  expect(screen.getByRole('button', { name: '4분의 4박자' })).toHaveAccessibleName('4분의 4박자')

  // Body links: 2 links in concluding paragraph
  expect(screen.getByRole('link', { name: '손 레슨' })).toHaveAttribute('href', '/learn/hands')
  expect(screen.getByRole('link', { name: '연습 방법 레슨' })).toHaveAttribute('href', '/learn/practice')
  expect(screen.queryByRole('link', { name: '건반 레슨' })).toBeNull()

  // Lesson nav links
  const nav = screen.getByRole('navigation', { name: '레슨 이동' })
  expect(within(nav).getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
  expect(within(nav).getByRole('link', { name: '이전 레슨: 악보 읽기 1' })).toHaveAttribute('href', '/learn/reading')
  expect(within(nav).getByRole('link', { name: '다음 레슨: 손' })).toHaveAttribute('href', '/learn/hands')

  // Glossary term links
  const glossaryLinks = document.querySelectorAll<HTMLAnchorElement>('a[href^="/learn/glossary#term-"]')
  expect(Array.from(glossaryLinks).map(a => a.getAttribute('href'))).toEqual([
    '/learn/glossary#term-quarter-note',
    '/learn/glossary#term-whole-note',
    '/learn/glossary#term-half-note',
    '/learn/glossary#term-eighth-note',
    '/learn/glossary#term-rests',
    '/learn/glossary#term-barline',
    '/learn/glossary#term-measure',
    '/learn/glossary#term-time-signature',
  ])
})
