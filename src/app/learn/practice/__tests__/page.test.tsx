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
  expect(lesson.getByRole('link', { name: '이전 레슨: 건반' })).toHaveAttribute('href', '/learn/keyboard')
  expect(lesson.queryByRole('link', { name: /다음 레슨/ })).toBeNull()
  expect(lesson.getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
  expect(screen.getByText(/노트의 아랫변이 건반 위 선에 닿을 때/)).toBeInTheDocument()
  const table = lesson.getByRole('table', { name: '재생 화면 키보드 단축키' })
  expect(within(table).getAllByRole('row')).toHaveLength(4)
  expect(table).toHaveTextContent(`←${SEEK_STEP_SEC}초 뒤로 이동`)
  expect(table).toHaveTextContent(`→${SEEK_STEP_SEC}초 앞으로 이동`)
  expect(screen.getByText(/물리 키보드가 없으면 화면의 재생/)).toBeInTheDocument()
})


it('explains the wait-mode audio exceptions in all relevant topics', () => {
  render(<PracticePage />)
  const wait = screen.getByRole('region', { name: '기다리기 모드' })
  expect(wait).toHaveTextContent('기다리기 모드에서는 자동 연주 소리, 메트로놈, 준비 박자가 나오지 않아요.')
  expect(wait).toHaveTextContent('화면에서 누른 건반만 앱이 소리를 내요.')
  expect(wait).toHaveTextContent('MIDI로 누른 음은 앱이 소리를 내지 않으므로 연결한 악기의 자체 소리를 들어요.')
  expect(screen.getByRole('region', { name: '한 손씩' })).toHaveTextContent('기다리기 모드에서는 다른 손 소리도 자동으로 나오지 않아요.')
  expect(screen.getByRole('region', { name: '메트로놈' })).toHaveTextContent('기다리기 모드에서는 메트로놈과 준비 박자가 나오지 않아요.')
})
