import { render, screen, within } from '@testing-library/react'
import PracticePage, { metadata } from '../page'
import { SEEK_STEP_SEC } from '@/hooks/usePlaybackShortcuts'
import Footer from '@/components/layout/Footer'

it('uses one lesson heading and presents the six real practice topics', () => {
  render(<><main><PracticePage /></main><Footer /></>)
  const lesson = within(screen.getByRole('main'))
  expect(metadata.title).toBeTruthy()
  expect(metadata.description).toBeTruthy()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: '연습 방법' })).toBeInTheDocument()
  expect(lesson.getAllByRole('heading', { level: 2 }).map(node => node.textContent)).toEqual([
    '느리게 시작', '한 손씩', 'A-B 구간 반복', '기다리기 모드', '메트로놈', '키보드 단축키',
  ])
  expect(lesson.getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
  expect(screen.getByText(/노트의 아랫변이 건반 위 선에 닿을 때/)).toBeInTheDocument()
  const table = lesson.getByRole('table', { name: '재생 화면 키보드 단축키' })
  expect(within(table).getAllByRole('row')).toHaveLength(4)
  expect(table).toHaveTextContent(`←${SEEK_STEP_SEC}초 뒤로 이동`)
  expect(table).toHaveTextContent(`→${SEEK_STEP_SEC}초 앞으로 이동`)
  expect(screen.getByText(/터치 기기에는 물리 키보드 단축키가 없어요/)).toBeInTheDocument()
})
