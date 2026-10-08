import { render, screen, within } from '@testing-library/react'
import LearnPage, { metadata } from '../page'
import { LEARN_LESSONS } from '@/lib/learn/lessons'
import { COURSE_PIECES } from '@/lib/learn/course'

jest.mock('@/lib/learn/lessons', () => {
  const actual = jest.requireActual('@/lib/learn/lessons')
  return { ...actual, LEARN_LESSONS: actual.LEARN_LESSONS.map((lesson: object) => ({ ...lesson })) }
})

jest.mock('@/lib/learn/course', () => {
  const actual = jest.requireActual('@/lib/learn/course')
  return { ...actual, COURSE_PIECES: [...actual.COURSE_PIECES] }
})

const originalPieces = [...COURSE_PIECES]
const CARD_TITLES = ['건반', '악보 읽기', '손', '연습 방법', '첫 곡 코스', '용어 사전', '내 연습 기록']
const cardOf = (title: string) => screen.getByRole('heading', { level: 3, name: title }).closest('[data-learn-card]') as HTMLElement

beforeEach(() => {
  LEARN_LESSONS.forEach(lesson => { lesson.available = true })
  COURSE_PIECES.splice(0, COURSE_PIECES.length, ...originalPieces)
})

it('has metadata, one h1, three section h2s and card h3s in order', () => {
  render(<LearnPage />)
  expect(metadata.title).toBeTruthy()
  expect(metadata.description).toBeTruthy()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: '배우기' })).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual(['기초 레슨', '쳐 보기', '찾아보기'])
  expect(screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)).toEqual(CARD_TITLES)
  expect(screen.getAllByRole('heading')).toHaveLength(11)
  for (const name of ['기초 레슨', '쳐 보기', '찾아보기']) {
    expect(screen.getByRole('region', { name }).tagName).toBe('SECTION')
  }
})

it('links every card from its exact title with one link per card', () => {
  render(<LearnPage />)
  expect(screen.getAllByRole('link').map(link => link.textContent)).toEqual(CARD_TITLES)
  for (const title of CARD_TITLES) {
    const card = cardOf(title)
    expect(card).not.toBeNull()
    expect(within(card).getAllByRole('link')).toHaveLength(1)
    expect(within(card).getByRole('link', { name: title })).toBeInTheDocument()
  }
  expect(document.querySelectorAll('[data-learn-card]')).toHaveLength(7)
})

it('places lessons, the course and the reference cards in their sections', () => {
  render(<LearnPage />)
  const basics = screen.getByRole('region', { name: '기초 레슨' })
  const map = within(basics).getByRole('list', { name: '학습 단계' })
  expect(map.tagName).toBe('OL')
  expect(within(map).getAllByRole('listitem')).toHaveLength(4)
  expect(within(map).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([
    '/learn/keyboard', '/learn/reading', '/learn/hands', '/learn/practice',
  ])
  expect(within(map).getAllByText(/^\d단계$/).map(step => step.textContent)).toEqual(['1단계', '2단계', '3단계', '4단계'])
  const play = screen.getByRole('region', { name: '쳐 보기' })
  expect(within(play).getAllByRole('link')).toHaveLength(1)
  expect(within(play).getByRole('link', { name: '첫 곡 코스' })).toHaveAttribute('href', '/learn/course')
  const lookup = screen.getByRole('region', { name: '찾아보기' })
  expect(within(lookup).getAllByRole('link')).toHaveLength(2)
  expect(within(lookup).getByRole('link', { name: '용어 사전' })).toHaveAttribute('href', '/learn/glossary')
  expect(within(lookup).getByRole('link', { name: '내 연습 기록' })).toHaveAttribute('href', '/practice')
})

it('shows what each lesson covers from the lesson data', () => {
  render(<LearnPage />)
  for (const lesson of LEARN_LESSONS) {
    const card = cardOf(lesson.title)
    expect(within(card).getByText(lesson.description)).toBeInTheDocument()
    expect(within(card).getByText(lesson.activity, { exact: false })).toBeInTheDocument()
    for (const topic of lesson.topics) expect(within(card).getAllByText(topic, { exact: false }).length).toBeGreaterThan(0)
  }
})

it('counts course pieces from COURSE_PIECES instead of a fixed number', () => {
  const { unmount } = render(<LearnPage />)
  expect(within(cardOf('첫 곡 코스')).getByText(`짧은 곡 ${originalPieces.length}곡`, { exact: false })).toBeInTheDocument()
  unmount()
  COURSE_PIECES.pop()
  render(<LearnPage />)
  expect(within(cardOf('첫 곡 코스')).getByText(`짧은 곡 ${originalPieces.length - 1}곡`, { exact: false })).toBeInTheDocument()
})

it('tells that practice history needs sign-in', () => {
  render(<LearnPage />)
  expect(within(cardOf('내 연습 기록')).getByText(/로그인/)).toBeInTheDocument()
})

it('drops the old grey sentences and shows no completion or progress', () => {
  render(<LearnPage />)
  expect(screen.queryByText(/배운 것을 쳐 보고 싶다면/)).toBeNull()
  expect(screen.queryByText(/낯선 말이 있다면/)).toBeNull()
  expect(screen.queryByText(/로그인해서 연습한 곡은/)).toBeNull()
  expect(screen.queryByText(/완료|진도|%/)).toBeNull()
})

it('shows unavailable fixture lessons as 준비 중 without links', () => {
  LEARN_LESSONS[1].available = false
  render(<LearnPage />)
  const items = within(screen.getByRole('list', { name: '학습 단계' })).getAllByRole('listitem')
  expect(items).toHaveLength(4)
  expect(within(items[0]).getByRole('link', { name: '건반' })).toHaveAttribute('href', '/learn/keyboard')
  expect(within(items[3]).getByRole('link', { name: '연습 방법' })).toHaveAttribute('href', '/learn/practice')
  expect(within(screen.getByRole('list', { name: '학습 단계' })).getAllByRole('link')).toHaveLength(3)
  expect(screen.getAllByText('준비 중')).toHaveLength(1)
  expect(within(items[2]).getByRole('link', { name: '손' })).toHaveAttribute('href', '/learn/hands')
  items.slice(1, 2).forEach(item => {
    expect(within(item).getByRole('heading', { level: 3, name: '악보 읽기' })).toBeInTheDocument()
    expect(within(item).getByText('준비 중')).toBeInTheDocument()
    expect(within(item).queryByRole('link')).toBeNull()
    expect(within(item).queryByText(/시작하기/)).toBeNull()
  })
})

it('links all four published lessons without 준비 중', () => {
  render(<LearnPage />)
  expect(screen.getByRole('link', { name: '건반' })).toHaveAttribute('href', '/learn/keyboard')
  expect(screen.getByRole('link', { name: '악보 읽기' })).toHaveAttribute('href', '/learn/reading')
  expect(screen.getByRole('link', { name: '연습 방법' })).toHaveAttribute('href', '/learn/practice')
  expect(screen.getByRole('link', { name: '손' })).toHaveAttribute('href', '/learn/hands')
  expect(within(screen.getByRole('list', { name: '학습 단계' })).getAllByRole('link')).toHaveLength(4)
  expect(screen.queryAllByText('준비 중')).toHaveLength(0)
})
