import { render, screen, within } from '@testing-library/react'
import HandsPage, { metadata } from '../page'
jest.mock('@/components/learn/HandsKeyboard', () => ({ __esModule: true, default: () => <div>손 건반</div> }))

it('presents the four hand topics, metadata and working lesson links', () => {
  render(<HandsPage />)
  expect(metadata.title).toBeTruthy()
  expect(metadata.description).toBeTruthy()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: '손' })).toBeInTheDocument()

  // Breadcrumbs & steps
  const breadcrumbs = screen.getByRole('navigation', { name: '현재 위치' })
  expect(within(breadcrumbs).getByRole('link', { name: '배우기' })).toHaveAttribute('href', '/learn')
  expect(within(breadcrumbs).getByText('손')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('4단계 중 3단계')).toBeInTheDocument()

  const expectedHeadings = ['손가락 번호', '기본 손 모양', '다섯 손가락 자리', '재생 화면과 연결']
  const expectedIds = ['finger-numbers', 'hand-shape', 'five-fingers', 'playback-fingers']

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

  // Body links
  expect(screen.getByRole('link', { name: '건반 레슨' })).toHaveAttribute('href', '/learn/keyboard')
  expect(screen.getByRole('link', { name: '연습 방법 레슨' })).toHaveAttribute('href', '/learn/practice')
  expect(screen.getByRole('link', { name: '첫 곡 코스' })).toHaveAttribute('href', '/learn/course')

  // Lesson nav links
  const nav = screen.getByRole('navigation', { name: '레슨 이동' })
  expect(within(nav).getByRole('link', { name: '이전 레슨: 악보 읽기' })).toHaveAttribute('href', '/learn/reading')
  expect(within(nav).getByRole('link', { name: '다음 레슨: 연습 방법' })).toHaveAttribute('href', '/learn/practice')
  expect(document.querySelectorAll('a[href="/learn/reading"]')).toHaveLength(1)
})

