import { render, screen } from '@testing-library/react'
import ScoreTimingNotice from '../ScoreTimingNotice'

it('shows recognized rhythm contradictions and unsupported navigation without claiming a correction', () => {
  render(<ScoreTimingNotice metadata={{ timingWarnings: [
    { code: 'measure-overflow', part: 'P1', measure: '3', expectedQuarters: 3, actualQuarters: 4.5 },
    { code: 'measure-overflow', part: 'P2', measure: '3', expectedQuarters: 3, actualQuarters: 4.5 },
    { code: 'unexpanded-navigation', part: 'P1', measure: '9' },
  ] }} />)
  expect(screen.getByRole('status')).toHaveTextContent('리듬 확인이 필요합니다')
  expect(screen.getByRole('status')).toHaveTextContent('1개 마디')
  expect(screen.getByRole('status')).toHaveTextContent('3마디')
  expect(screen.getByRole('status')).toHaveTextContent('반복 재생 순서에 반영되지 않았습니다')
})

it('ignores absent or malformed optional metadata', () => {
  const { container, rerender } = render(<ScoreTimingNotice />)
  expect(container).toBeEmptyDOMElement()
  rerender(<ScoreTimingNotice metadata={{ timingWarnings: [null, 4, { code: 'measure-overflow', measure: {}, expectedQuarters: 3, actualQuarters: 'bad' }] }} />)
  expect(container).toBeEmptyDOMElement()
})
