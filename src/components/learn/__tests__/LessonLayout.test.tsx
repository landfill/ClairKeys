import { render, screen } from '@testing-library/react'
import LessonLayout from '../LessonLayout'
import { LEARN_LESSONS } from '@/lib/learn/lessons'

jest.mock('@/lib/learn/lessons', () => {
  const actual = jest.requireActual('@/lib/learn/lessons')
  return { ...actual, LEARN_LESSONS: actual.LEARN_LESSONS.map((lesson: object) => ({ ...lesson })) }
})

afterEach(() => { LEARN_LESSONS.forEach(lesson => { lesson.available = false }) })

describe('LessonLayout', () => {
  it('renders one h1, the lesson body and a named return link without dead neighbours', () => {
    render(<LessonLayout lessonId="reading"><h2>음높이</h2></LessonLayout>)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: '악보 읽기' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '음높이' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('names previous and next links and skips unavailable lessons', () => {
    LEARN_LESSONS[0].available = true
    LEARN_LESSONS[3].available = true
    render(<LessonLayout lessonId="reading">레슨 본문</LessonLayout>)
    expect(screen.getByRole('link', { name: '이전 레슨: 건반' })).toHaveAttribute('href', '/learn/keyboard')
    expect(screen.getByRole('link', { name: '다음 레슨: 연습 방법' })).toHaveAttribute('href', '/learn/practice')
    expect(screen.queryByRole('link', { name: /손/ })).toBeNull()
  })
})
