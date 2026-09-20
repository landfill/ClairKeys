import { render, screen } from '@testing-library/react'
import SimplePianoKeyboard from '../SimplePianoKeyboard'
import { buildResponsiveKeyLayout } from '@/utils/pianoLayout'
it('shows the same active player finger on white and black keys', () => {
  const layout = buildResponsiveKeyLayout(1200, [])
  render(<SimplePianoKeyboard layout={layout} activeKeys={new Set([60, 61])}
    activeFingers={new Map([[60, '2'], [61, '3']])} />)
  expect(screen.getByLabelText('60번 건반 운지 2')).toHaveTextContent('2')
  expect(screen.getByLabelText('61번 건반 운지 3')).toHaveTextContent('3')
})
