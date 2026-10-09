import { render, screen, within } from '@testing-library/react'
import ReadingPage, { metadata } from '../page'
import { LEARN_LESSONS } from '@/lib/learn/lessons'

jest.mock('@/components/learn/ReadingExplorer', () => ({ __esModule: true, default: () => <div>음 선택 예시</div> }))
jest.mock('@/components/learn/ScoreExample', () => ({ __esModule: true, default: () => <div>악보 예시</div> }))

it('opens the published lesson with one h1 with pitch topics and 5 sections', () => {
  expect(LEARN_LESSONS.find(lesson => lesson.id === 'reading')?.available).toBe(true)
  render(<ReadingPage />)
  expect(metadata.title).toBe('악보 읽기 1: 음높이 | ClairKeys')
  expect(metadata.description).toBeTruthy()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: '악보 읽기 1' })).toBeInTheDocument()

  // Breadcrumbs & steps
  const breadcrumbs = screen.getByRole('navigation', { name: '현재 위치' })
  expect(within(breadcrumbs).getByRole('link', { name: '배우기' })).toHaveAttribute('href', '/learn')
  expect(within(breadcrumbs).getByText('악보 읽기 1')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('5단계 중 2단계')).toBeInTheDocument()

  const expectedHeadings = ['오선', '높은음자리표', '낮은음자리표', '가운데 도', '오선과 건반 연결하기']
  const expectedIds = ['staff-intro', 'treble-intro', 'bass-intro', 'middle-c-intro', 'pitch-explorer']

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

  // Rhythm sections should not exist in Reading 1
  for (const absentId of ['note-lengths', 'rest-lengths', 'dotted-lengths', 'meters']) {
    expect(document.getElementById(absentId)).toBeNull()
  }
  expect(screen.queryByRole('table')).toBeNull()

  // Body links
  expect(screen.getByRole('link', { name: '건반 레슨' })).toHaveAttribute('href', '/learn/keyboard')
  expect(screen.queryByRole('link', { name: '손 레슨' })).toBeNull()
  expect(screen.queryByRole('link', { name: '연습 방법 레슨' })).toBeNull()

  // Explorer is present
  expect(screen.getByText('음 선택 예시')).toBeInTheDocument()

  // Examples: 6 examples across 3 comparative grids (2 standard responsive + 1 always paired)
  const standardGrids = document.querySelectorAll('.grid.md\\:grid-cols-2')
  expect(standardGrids).toHaveLength(2)
  const alwaysPairGrids = document.querySelectorAll('.grid.grid-cols-2')
  expect(alwaysPairGrids).toHaveLength(1)
  const scoreExamples = screen.getAllByText('악보 예시')
  expect(scoreExamples).toHaveLength(6)

  // Lesson nav links
  const nav = screen.getByRole('navigation', { name: '레슨 이동' })
  expect(within(nav).getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
  expect(within(nav).getByRole('link', { name: '이전 레슨: 건반' })).toHaveAttribute('href', '/learn/keyboard')
  expect(within(nav).getByRole('link', { name: '다음 레슨: 악보 읽기 2' })).toHaveAttribute('href', '/learn/reading/rhythm')
  expect(within(nav).queryByRole('link', { name: '다음 레슨: 손' })).toBeNull()
})
