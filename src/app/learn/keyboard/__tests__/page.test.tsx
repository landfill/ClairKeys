import { render, screen } from '@testing-library/react'
import KeyboardPage, { metadata } from '../page'

jest.mock('@/components/learn/KeyboardLesson', () => ({ __esModule: true, default: () => <div>학습 건반</div> }))

it('uses the shared lesson shell with one h1 and metadata', () => {
  render(<KeyboardPage />)
  expect(metadata.title).toBeTruthy()
  expect(metadata.description).toBeTruthy()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: '건반' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
  expect(screen.getByRole('link', { name: '다음 레슨: 손' })).toHaveAttribute('href', '/learn/hands')
  expect(screen.queryByRole('link', { name: /이전 레슨/ })).toBeNull()
})
