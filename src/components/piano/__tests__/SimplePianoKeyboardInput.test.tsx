import { fireEvent, render } from '@testing-library/react'
import SimplePianoKeyboard from '../SimplePianoKeyboard'
import type { KeyLayout } from '@/types/fallingNotes'

const layout: KeyLayout = {
  byMidi: new Map([
    [60, { x: 0, w: 20, black: false }],
    [61, { x: 14, w: 12, black: true }],
    [62, { x: 20, w: 20, black: false }],
  ]),
  totalWidth: 40,
  keyWidth: 20,
}

describe('SimplePianoKeyboard input', () => {
  it('reports the key a reader presses, white or black', () => {
    const onKeyPress = jest.fn()
    const { container } = render(<SimplePianoKeyboard layout={layout} onKeyPress={onKeyPress} />)
    fireEvent.pointerDown(container.querySelector('[data-midi="62"]')!)
    fireEvent.pointerDown(container.querySelector('[data-midi="61"]')!)
    expect(onKeyPress.mock.calls).toEqual([[62], [61]])
  })

  it('stays a display when no input is wanted', () => {
    const { container } = render(<SimplePianoKeyboard layout={layout} />)
    expect(container.querySelector('[data-midi]')).toBeNull()
  })
})
