import { fireEvent, render } from '@testing-library/react'
import SimplePianoKeyboard from '../SimplePianoKeyboard'
import { buildKeyLayout } from '@/utils/pianoLayout'

it('defaults to no labels and labels only white keys without changing input', () => {
  const layout = buildKeyLayout(24, { minMidi: 60, maxMidi: 64 })
  const press = jest.fn()
  const { container, rerender } = render(<SimplePianoKeyboard layout={layout} onKeyPress={press} />)
  expect(container.querySelectorAll('[data-note-label]')).toHaveLength(0)
  rerender(<SimplePianoKeyboard layout={layout} onKeyPress={press} showNoteNames activeKeys={new Set([60])} activeFingers={new Map([[60, '1']])} />)
  expect([...container.querySelectorAll('[data-note-label]')].map(node => node.getAttribute('data-label-midi'))).toEqual(['60', '62', '64'])
  const middle = container.querySelector('[data-label-midi="60"]')!
  expect(middle).toHaveAttribute('aria-hidden', 'true')
  expect(middle).toHaveClass('text-accent', 'font-bold', 'pointer-events-none')
  expect(container.querySelector('[aria-label="60번 건반 운지 1"]')).toHaveClass('bottom-5')
  fireEvent.pointerDown(middle.parentElement!)
  fireEvent.pointerDown(container.querySelector('[data-midi="61"]')!)
  expect(press.mock.calls).toEqual([[60], [61]])
})
it('keeps only a decorative middle-C mark on a very narrow keyboard', () => {
  const { container } = render(<SimplePianoKeyboard layout={buildKeyLayout(4, { minMidi: 48, maxMidi: 72 })} showNoteNames />)
  expect(container.querySelectorAll('[data-note-label]')).toHaveLength(1)
  expect(container.querySelector('[data-note-label]')).toHaveAttribute('data-label-midi', '60')
})
