import { render, screen } from '@testing-library/react'
import HandsPage, { metadata } from '../page'
jest.mock('@/components/learn/HandsKeyboard', () => ({ __esModule: true, default: () => <div>손 건반</div> }))
it('presents the four hand topics, metadata and working lesson links', () => {
  render(<HandsPage />)
  expect(metadata.title).toBeTruthy()
  expect(metadata.description).toBeTruthy()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: '손' })).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { level: 2 }).map(node => node.textContent)).toEqual(['손가락 번호', '기본 손 모양', '다섯 손가락 자리', '재생 화면과 연결'])
  expect(screen.getByRole('link', { name: '건반 레슨' })).toHaveAttribute('href', '/learn/keyboard')
  expect(screen.getByRole('link', { name: '연습 방법 레슨' })).toHaveAttribute('href', '/learn/practice')
  expect(screen.getByRole('link', { name: '이전 레슨: 건반' })).toHaveAttribute('href', '/learn/keyboard')
  expect(screen.getByRole('link', { name: '다음 레슨: 연습 방법' })).toHaveAttribute('href', '/learn/practice')
  expect(document.querySelector('a[href="/learn/reading"]')).toBeNull()
})
