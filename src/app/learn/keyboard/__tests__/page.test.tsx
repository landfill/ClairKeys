import { render, screen, within } from '@testing-library/react'
import KeyboardPage, { metadata } from '../page'

jest.mock('@/components/learn/KeyboardLesson', () => ({ __esModule: true, default: () => <div>학습 건반</div> }))

it('uses the shared lesson shell with one h1 and metadata', () => {
  render(<KeyboardPage />)
  expect(metadata.title).toBeTruthy()
  expect(metadata.description).toBeTruthy()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: '건반' })).toBeInTheDocument()

  // Breadcrumbs & steps
  const breadcrumbs = screen.getByRole('navigation', { name: '현재 위치' })
  expect(within(breadcrumbs).getByRole('link', { name: '배우기' })).toHaveAttribute('href', '/learn')
  expect(within(breadcrumbs).getByText('건반')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('4단계 중 1단계')).toBeInTheDocument()

  // No TOC since keyboard has fewer than 4 sections
  expect(screen.queryByRole('navigation', { name: '이 레슨의 내용' })).toBeNull()

  // Navigation links
  const nav = screen.getByRole('navigation', { name: '레슨 이동' })
  expect(within(nav).getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
  expect(within(nav).getByRole('link', { name: '다음 레슨: 악보 읽기' })).toHaveAttribute('href', '/learn/reading')
  expect(within(nav).queryByRole('link', { name: /이전 레슨/ })).toBeNull()
})

