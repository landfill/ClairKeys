import { render, screen, within } from '@testing-library/react'
import LearnPage, { metadata } from '../page'
import { LEARN_LESSONS } from '@/lib/learn/lessons'

jest.mock('@/lib/learn/lessons', () => {
  const actual = jest.requireActual('@/lib/learn/lessons')
  return { ...actual, LEARN_LESSONS: actual.LEARN_LESSONS.map((lesson: object) => ({ ...lesson })) }
})

beforeEach(() => { LEARN_LESSONS.forEach(lesson => { lesson.available = lesson.id !== 'reading' }) })

it('has metadata and one h1 followed by h2 lesson titles in map order', () => {
  render(<LearnPage />)
  expect(metadata.title).toBeTruthy()
  expect(metadata.description).toBeTruthy()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: '배우기' })).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual([
    '건반', '악보 읽기', '손', '연습 방법',
  ])
  expect(screen.getAllByRole('heading')).toHaveLength(5)
})

it('shows every unavailable lesson as 준비 중 without links', () => {
  render(<LearnPage />)
  const items = within(screen.getByRole('list', { name: '학습 단계' })).getAllByRole('listitem')
  expect(items).toHaveLength(4)
  expect(within(items[0]).getByRole('link', { name: '건반' })).toHaveAttribute('href', '/learn/keyboard')
  expect(within(items[3]).getByRole('link', { name: '연습 방법' })).toHaveAttribute('href', '/learn/practice')
  expect(screen.getAllByRole('link')).toHaveLength(3)
  expect(screen.getAllByText('준비 중')).toHaveLength(1)
  expect(within(items[2]).getByRole('link', { name: '손' })).toHaveAttribute('href', '/learn/hands')
  items.slice(1, 2).forEach(item => {
    expect(within(item).getByText('준비 중')).toBeInTheDocument()
    expect(within(item).queryByRole('link')).toBeNull()
  })
})

it('links a lesson as soon as its shared availability flag is enabled', () => {
  LEARN_LESSONS[1].available = true
  render(<LearnPage />)
  expect(screen.getByRole('link', { name: '건반' })).toHaveAttribute('href', '/learn/keyboard')
  expect(screen.getByRole('link', { name: '악보 읽기' })).toHaveAttribute('href', '/learn/reading')
  expect(screen.getByRole('link', { name: '연습 방법' })).toHaveAttribute('href', '/learn/practice')
  expect(screen.getAllByRole('link')).toHaveLength(4)
  expect(screen.queryAllByText('준비 중')).toHaveLength(0)
})
