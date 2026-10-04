import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server.node'
import { hydrateRoot } from 'react-dom/client'
import { act } from '@testing-library/react'
import SongIntro from '../SongIntro'
import { normalizeAnimationData } from '@/utils/animationContract'
const data = (extra = {}) => normalizeAnimationData({ version: '1.1', title: '예시', composer: '작곡가', duration: 10, tempo: null, tempoSource: 'unknown', timingReferenceBpm: 60, timeSignature: '4/4', notes: [{ midi: 60, start: 0, duration: 1 }], ...extra })
it('shows unknown provenance without inventing meter, major key or notation types', () => {
  render(<SongIntro data={data({ keySignature: 'C' })} />)
  const area = screen.getByRole('region', { name: '이 곡 소개' })
  expect(area.querySelector('dl')).not.toBeNull()
  expect(area).toHaveTextContent('박자 정보는 확인되지 않았어요')
  expect(area).toHaveTextContent('악보에서 빠르기를 읽지 못했어요')
  expect(area).toHaveTextContent('손 구분은 앱이 추정했어요')
  expect(area).not.toHaveTextContent(/4\/4|장조|단조|음표 종류|쉼표 종류/)
})
it('provides short summaries and named lesson links with no duplicated duration', () => {
  render(<SongIntro data={data({ tempo: 80, tempoSource: 'score', notes: [{ midi: 48, start: 0, duration: 1, hand: 'L' }, { midi: 72, start: 1, duration: 1, hand: 'R' }] })} />)
  expect(screen.getByText('양손')).toBeInTheDocument()
  expect(screen.getByText('♩=80 (악보에서 읽음)')).toBeInTheDocument()
  for (const [name, href] of [['건반 레슨에서 음역 익히기', '/learn/keyboard'], ['악보 읽기에서 음높이 연결하기', '/learn/reading#pitch-explorer'], ['손 레슨에서 손가락 번호 익히기', '/learn/hands'], ['연습 방법에서 빠르기와 연습 알아보기', '/learn/practice'], ['악보 읽기에서 박자 알아보기', '/learn/reading#meters']]) expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
  expect(screen.getAllByText('0분 10초')).toHaveLength(1)
})
it('keeps an empty song readable', () => {
  render(<SongIntro data={data({ notes: [], duration: 0 })} />)
  expect(screen.getByText('음표 데이터가 없어 음역을 확인할 수 없어요.')).toBeInTheDocument()
  expect(screen.getByText('손 정보는 확인되지 않았어요.')).toBeInTheDocument()
})
it('hydrates the initial content without recoverable or console errors', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {})
  const recoverable = jest.fn()
  const element = <SongIntro data={data()} />
  const host = document.createElement('div')
  host.innerHTML = renderToString(element); document.body.appendChild(host)
  let root!: ReturnType<typeof hydrateRoot>
  try {
    await act(async () => { root = hydrateRoot(host, element, { onRecoverableError: recoverable }) })
    expect(error).not.toHaveBeenCalled(); expect(recoverable).not.toHaveBeenCalled()
  } finally { await act(async () => root.unmount()); host.remove(); error.mockRestore() }
})
