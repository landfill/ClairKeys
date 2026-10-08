import { render, screen, within } from '@testing-library/react'
import ReadingPage, { metadata } from '../page'
import { LEARN_LESSONS } from '@/lib/learn/lessons'
jest.mock('@/components/learn/ReadingExplorer', () => ({ __esModule: true, default: () => <div>음 선택 예시</div> }))
jest.mock('@/components/learn/ScoreExample', () => ({ __esModule: true, default: () => <div>악보 예시</div> }))
it('opens the published lesson with one h1 with pitch and rhythm topics', () => {
  expect(LEARN_LESSONS.find(lesson => lesson.id === 'reading')?.available).toBe(true)
  render(<ReadingPage />)
  expect(metadata.title).toBe('악보 읽기 | ClairKeys')
  expect(metadata.description).toBeTruthy()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: '악보 읽기' })).toBeInTheDocument()

  // Breadcrumbs & steps
  const breadcrumbs = screen.getByRole('navigation', { name: '현재 위치' })
  expect(within(breadcrumbs).getByRole('link', { name: '배우기' })).toHaveAttribute('href', '/learn')
  expect(within(breadcrumbs).getByText('악보 읽기')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('4단계 중 2단계')).toBeInTheDocument()

  const expectedHeadings = ['오선', '높은음자리표', '낮은음자리표', '가운데 도', '오선과 건반 연결하기', '음표의 길이', '쉼표', '점음표', '박자표']
  const expectedIds = ['staff-intro', 'treble-intro', 'bass-intro', 'middle-c-intro', 'pitch-explorer', 'note-lengths', 'rest-lengths', 'dotted-lengths', 'meters']

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
  expect(screen.getByRole('link', { name: '손 레슨' })).toHaveAttribute('href', '/learn/hands')
  expect(screen.getByRole('link', { name: '연습 방법 레슨' })).toHaveAttribute('href', '/learn/practice')

  // Lesson nav links
  const nav = screen.getByRole('navigation', { name: '레슨 이동' })
  expect(within(nav).getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
  expect(within(nav).getByRole('link', { name: '이전 레슨: 건반' })).toHaveAttribute('href', '/learn/keyboard')
  expect(within(nav).getByRole('link', { name: '다음 레슨: 손' })).toHaveAttribute('href', '/learn/hands')
  expect(within(nav).queryByRole('link', { name: '다음 레슨: 연습 방법' })).toBeNull()
})


it('uses an accessible duration comparison table with literal beat values', () => {
  render(<ReadingPage />)
  const table = screen.getByRole('table', { name: '음표 길이 비교' })
  expect(table.querySelector('caption')).toHaveTextContent('음표 길이 비교')
  expect(table.querySelectorAll('th[scope="col"]')).toHaveLength(2)
  expect([...table.querySelectorAll('tbody tr')].map(row => row.textContent)).toEqual(['온음표4박', '2분음표2박', '4분음표1박', '8분음표반 박', '점2분음표3박', '점4분음표1박 반'])
})
