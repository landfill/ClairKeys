import { render, screen, within } from '@testing-library/react'
import LessonLayout from '../LessonLayout'
import { LEARN_LESSONS } from '@/lib/learn/lessons'

jest.mock('@/lib/learn/lessons', () => {
  const actual = jest.requireActual('@/lib/learn/lessons')
  return { ...actual, LEARN_LESSONS: actual.LEARN_LESSONS.map((lesson: object) => ({ ...lesson })) }
})

beforeEach(() => { LEARN_LESSONS.forEach(lesson => { lesson.available = true }) })

describe('LessonLayout', () => {
  it.each([
    { id: 'keyboard', title: '건반', neighbour: '다음 레슨: 악보 읽기', href: '/learn/reading', absent: /이전 레슨/ },
    { id: 'practice', title: '연습 방법', neighbour: '이전 레슨: 손', href: '/learn/hands', absent: /다음 레슨/ },
  ])('renders one h1, the body, map and only the published neighbour for $id', ({ id, title, neighbour, href, absent }) => {
    render(<LessonLayout lessonId={id}><h2>음높이</h2></LessonLayout>)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '음높이' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: '레슨 이동' })
    expect(within(nav).getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
    expect(within(nav).getByRole('link', { name: neighbour })).toHaveAttribute('href', href)
    expect(within(nav).queryByRole('link', { name: absent })).toBeNull()
    expect(within(nav).getAllByRole('link')).toHaveLength(3)
  })

  it('names the previous and next links for reading', () => {
    render(<LessonLayout lessonId="reading">레슨 본문</LessonLayout>)
    const nav = screen.getByRole('navigation', { name: '레슨 이동' })
    expect(within(nav).getByRole('link', { name: '이전 레슨: 건반' })).toHaveAttribute('href', '/learn/keyboard')
    expect(within(nav).getByRole('link', { name: '다음 레슨: 손' })).toHaveAttribute('href', '/learn/hands')
    expect(within(nav).queryByRole('link', { name: '다음 레슨: 연습 방법' })).toBeNull()
  })

  it('links hands back to reading and forward to practice', () => {
    render(<LessonLayout lessonId="hands">본문</LessonLayout>)
    const nav = screen.getByRole('navigation', { name: '레슨 이동' })
    expect(within(nav).getByRole('link', { name: '이전 레슨: 악보 읽기' })).toHaveAttribute('href', '/learn/reading')
    expect(within(nav).getByRole('link', { name: '다음 레슨: 연습 방법' })).toHaveAttribute('href', '/learn/practice')
  })

  it('keeps map and glossary links when every neighbour is unavailable', () => {
    LEARN_LESSONS.forEach(lesson => { lesson.available = false })
    render(<LessonLayout lessonId="reading">레슨 본문</LessonLayout>)
    const nav = screen.getByRole('navigation', { name: '레슨 이동' })
    expect(within(nav).getAllByRole('link')).toHaveLength(2)
    expect(within(nav).getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
    expect(within(nav).getByRole('link', { name: '용어 사전' })).toHaveAttribute('href', '/learn/glossary')
  })

  it('shows breadcrumb navigation and calculates step numbers dynamically', () => {
    render(<LessonLayout lessonId="reading">본문</LessonLayout>)
    const breadcrumbs = screen.getByRole('navigation', { name: '현재 위치' })
    expect(within(breadcrumbs).getByRole('link', { name: '배우기' })).toHaveAttribute('href', '/learn')
    const current = within(breadcrumbs).getByText('악보 읽기')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('4단계 중 2단계')).toBeInTheDocument()
    expect(screen.getByText(/해 보기 · 악보 예시 듣기, 오선과 건반 연결하기/)).toBeInTheDocument()
  })

  it('updates total step count when lessons change dynamically', () => {
    LEARN_LESSONS.push({
      id: 'chords',
      title: '화음',
      href: '/learn/chords',
      description: '화음을 배워요.',
      available: true,
      topics: ['3화음'],
      activity: '화음 쳐 보기',
    })
    try {
      render(<LessonLayout lessonId="reading">본문</LessonLayout>)
      expect(screen.getByText('5단계 중 2단계')).toBeInTheDocument()
    } finally {
      LEARN_LESSONS.pop()
    }
  })

  it('renders table of contents only when sections are 4 or more', () => {
    const fourSections = [
      { id: 'sec-1', title: '섹션 1' },
      { id: 'sec-2', title: '섹션 2' },
      { id: 'sec-3', title: '섹션 3' },
      { id: 'sec-4', title: '섹션 4' },
    ]
    const { rerender } = render(<LessonLayout lessonId="reading" sections={fourSections}>본문</LessonLayout>)
    const aside = document.querySelector('aside')!
    const toc = within(aside).getByRole('navigation', { name: '이 레슨의 내용' })
    const items = within(toc).getAllByRole('link')
    expect(items).toHaveLength(4)
    expect(items.map(a => a.textContent)).toEqual(['섹션 1', '섹션 2', '섹션 3', '섹션 4'])
    expect(items.map(a => a.getAttribute('href'))).toEqual(['#sec-1', '#sec-2', '#sec-3', '#sec-4'])

    // 3 sections: should not render TOC
    const threeSections = fourSections.slice(0, 3)
    rerender(<LessonLayout lessonId="reading" sections={threeSections}>본문</LessonLayout>)
    expect(screen.queryByRole('navigation', { name: '이 레슨의 내용' })).toBeNull()

    // 0 / undefined sections: should not render TOC
    rerender(<LessonLayout lessonId="reading">본문</LessonLayout>)
    expect(screen.queryByRole('navigation', { name: '이 레슨의 내용' })).toBeNull()
  })
})
