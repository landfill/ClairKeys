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

  // Breadcrumbs & steps
  const breadcrumbs = screen.getByRole('navigation', { name: '현재 위치' })
  expect(within(breadcrumbs).getByRole('link', { name: '배우기' })).toHaveAttribute('href', '/learn')
  expect(within(breadcrumbs).getByText('연습 방법')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('5단계 중 5단계')).toBeInTheDocument()

  const expectedHeadings = [
    '느리게 시작', '한 손씩', 'A-B 구간 반복', '기다리기 모드', '메트로놈', '키보드 단축키',
  ]
  const expectedIds = [
    'slow-start', 'one-hand', 'ab-loop', 'wait-mode', 'metronome', 'keyboard-shortcuts',
  ]

  const h2s = lesson.getAllByRole('heading', { level: 2 })
  expect(h2s.map(node => node.textContent)).toEqual(expectedHeadings)
  expect(h2s.map(node => node.getAttribute('id'))).toEqual(expectedIds)

  // TOC assertions: 1:1 match with h2s
  const toc = within(document.querySelector('aside')!).getByRole('navigation', { name: '이 레슨의 내용' })
  const tocLinks = within(toc).getAllByRole('link')
  expect(tocLinks).toHaveLength(expectedHeadings.length)
  expect(tocLinks.map(a => a.textContent)).toEqual(expectedHeadings)
  expect(tocLinks.map(a => a.getAttribute('href'))).toEqual(expectedIds.map(id => `#${id}`))

  // Section summaries inside each section
  const expectedSummaries = [
    '재생 전 설정 · 조작 바 › 속도 메뉴',
    '재생 전 설정 › 연습할 손',
    '재생 전 설정 · 조작 바 › A-B 구간 반복',
    '재생 전 설정 › 기다리기 모드',
    '재생 전 설정 › 메트로놈',
    '재생 화면 › 키보드 단축키',
  ]
  expectedIds.forEach((id, index) => {
    const section = document.getElementById(id)?.closest('section')
    expect(section).toBeTruthy()
    expect(section).toHaveTextContent(expectedSummaries[index])
  })

  // Body links
  expect(lesson.getByRole('link', { name: '건반 레슨' })).toHaveAttribute('href', '/learn/keyboard')

  // Lesson nav links
  const nav = screen.getByRole('navigation', { name: '레슨 이동' })
  expect(within(nav).getByRole('link', { name: '이전 레슨: 손' })).toHaveAttribute('href', '/learn/hands')
  expect(within(nav).queryByRole('link', { name: /다음 레슨/ })).toBeNull()
  expect(within(nav).getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')

  expect(screen.getByText(/노트의 아랫변이 건반 위 선에 닿을 때/)).toBeInTheDocument()
  const table = lesson.getByRole('table', { name: '재생 화면 키보드 단축키' })
  expect(within(table).getAllByRole('row')).toHaveLength(4)
  expect(table).toHaveTextContent(`←${SEEK_STEP_SEC}초 뒤로 이동`)
  expect(table).toHaveTextContent(`→${SEEK_STEP_SEC}초 앞으로 이동`)
  expect(screen.getByText(/물리 키보드가 없으면 화면의 재생/)).toBeInTheDocument()

  // Glossary term links
  const glossaryLinks = document.querySelectorAll<HTMLAnchorElement>('a[href^="/learn/glossary#term-"]')
  expect(Array.from(glossaryLinks).map(a => a.getAttribute('href'))).toEqual([
    '/learn/glossary#term-playback-speed',
    '/learn/glossary#term-wait-mode',
    '/learn/glossary#term-ab-loop',
    '/learn/glossary#term-metronome',
    '/learn/glossary#term-count-in',
  ])
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
