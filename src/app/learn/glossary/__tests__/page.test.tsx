import { render, screen, within } from '@testing-library/react'
import GlossaryPage from '../page'
import LearnPage from '../../page'
import LessonLayout from '@/components/learn/LessonLayout'

it('offers the glossary from the map and lessons without changing the five learning steps', () => {
  const map = render(<LearnPage />)
  expect(screen.getByRole('link', { name: '용어 사전' })).toHaveAttribute('href', '/learn/glossary')
  expect(within(screen.getByRole('list', { name: '학습 단계' })).getAllByRole('listitem')).toHaveLength(5)
  map.unmount()
  render(<LessonLayout lessonId="keyboard">본문</LessonLayout>)
  expect(screen.getByRole('link', { name: '용어 사전' })).toHaveAttribute('href', '/learn/glossary')
})

it('explains notation and playback terms with links to the relevant lesson sections', () => {
  render(<GlossaryPage />)
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  const staff = screen.getByText('오선', { selector: 'dt' }).parentElement!
  expect(within(staff).getByText(/다섯 줄.*네 칸/)).toBeInTheDocument()
  expect(within(staff).getByRole('link')).toHaveAttribute('href', '/learn/reading#staff-intro')
  const quarter = screen.getByText('4분음표', { selector: 'dt' }).parentElement!
  expect(within(quarter).getByText(/4분음표를 한 박으로/)).toBeInTheDocument()
  const wait = screen.getByText('기다리기 모드', { selector: 'dt' }).parentElement!
  expect(within(wait).getByRole('link')).toHaveAttribute('href', '/learn/practice#wait-mode')
  expect(screen.getByRole('link', { name: '단계 지도로 돌아가기' })).toHaveAttribute('href', '/learn')
})
