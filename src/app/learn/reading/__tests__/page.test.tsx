import { render, screen } from '@testing-library/react'
import ReadingPage, { metadata } from '../page'
import { LEARN_LESSONS } from '@/lib/learn/lessons'
jest.mock('@/components/learn/ReadingExplorer', () => ({ __esModule: true, default: () => <div>음 선택 예시</div> }))
jest.mock('@/components/learn/ScoreExample', () => ({ __esModule: true, default: () => <div>악보 예시</div> }))
it('opens the unpublished lesson with one h1 and five pitch topics', () => {
  expect(LEARN_LESSONS.find(lesson => lesson.id === 'reading')?.available).toBe(false)
  render(<ReadingPage />)
  expect(metadata.title).toBeTruthy()
  expect(metadata.description).toBeTruthy()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: '악보 읽기' })).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { level: 2 }).map(node => node.textContent)).toEqual(['오선', '높은음자리표', '낮은음자리표', '가운데 도', '오선과 건반 연결하기'])
  expect(screen.getByRole('link', { name: '건반 레슨' })).toHaveAttribute('href', '/learn/keyboard')
  expect(screen.getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
  expect(screen.getByRole('link', { name: '이전 레슨: 건반' })).toHaveAttribute('href', '/learn/keyboard')
  expect(screen.getByRole('link', { name: '다음 레슨: 연습 방법' })).toHaveAttribute('href', '/learn/practice')
  expect(document.querySelector('a[href="/learn/hands"]')).toBeNull()
})
