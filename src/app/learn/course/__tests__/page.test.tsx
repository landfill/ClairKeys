import { render, screen } from '@testing-library/react'
import CoursePage, { metadata } from '../page'
import { COURSE_PIECES } from '@/lib/learn/course'

it('renders lesson links with inline-block py-3 and course piece and back links with min-h-11', () => {
  render(<CoursePage />)
  expect(metadata.title).toBeTruthy()
  expect(metadata.description).toBeTruthy()

  const fiveFingers = screen.getByRole('link', { name: '다섯 손가락 자리' })
  expect(fiveFingers).toHaveAttribute('href', '/learn/hands#five-fingers')
  expect(fiveFingers).toHaveClass('inline-block', 'py-3')

  const practice = screen.getByRole('link', { name: '느리게 재생하거나 구간을 반복하는 방법' })
  expect(practice).toHaveAttribute('href', '/learn/practice')
  expect(practice).toHaveClass('inline-block', 'py-3')

  expect(COURSE_PIECES).toHaveLength(3)
  for (const piece of COURSE_PIECES) {
    const link = screen.getByRole('link', { name: piece.title })
    expect(link).toHaveAttribute('href', `/learn/course/${piece.slug}`)
    expect(link).toHaveClass('min-h-11')
  }

  const backLink = screen.getByRole('link', { name: '단계 지도로 돌아가기' })
  expect(backLink).toHaveAttribute('href', '/learn')
  expect(backLink).toHaveClass('min-h-11')
})
