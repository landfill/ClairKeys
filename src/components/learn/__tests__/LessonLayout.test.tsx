import { render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
    expect(screen.getByRole('link', { name: neighbour })).toHaveAttribute('href', href)
    expect(screen.queryByRole('link', { name: absent })).toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('names the previous and next links for reading', () => {
    render(<LessonLayout lessonId="reading">레슨 본문</LessonLayout>)
    expect(screen.getByRole('link', { name: '이전 레슨: 건반' })).toHaveAttribute('href', '/learn/keyboard')
    expect(screen.getByRole('link', { name: '다음 레슨: 손' })).toHaveAttribute('href', '/learn/hands')
    expect(screen.queryByRole('link', { name: '다음 레슨: 연습 방법' })).toBeNull()
  })

  it('links hands back to reading and forward to practice', () => {
    render(<LessonLayout lessonId="hands">본문</LessonLayout>)
    expect(screen.getByRole('link', { name: '이전 레슨: 악보 읽기' })).toHaveAttribute('href', '/learn/reading')
    expect(screen.getByRole('link', { name: '다음 레슨: 연습 방법' })).toHaveAttribute('href', '/learn/practice')
  })

  it('keeps only the map link when every neighbour is unavailable', () => {
    LEARN_LESSONS.forEach(lesson => { lesson.available = false })
    render(<LessonLayout lessonId="reading">레슨 본문</LessonLayout>)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
  })
})
