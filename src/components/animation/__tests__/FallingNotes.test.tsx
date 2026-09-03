import { render, screen } from '@testing-library/react'
import FallingNotes from '../FallingNotes'
import type { KeyLayout } from '@/types/fallingNotes'

const layout: KeyLayout = {
  byMidi: new Map([[60, { x: 0, w: 20, black: false }]]),
  totalWidth: 20,
  keyWidth: 20,
}

describe('FallingNotes fingering', () => {
  it('renders a finger number even when the falling note is very short', () => {
    render(
      <FallingNotes
        notes={[{ midi: 60, start: 1, duration: 0.01, hand: 'R', finger: 2 }]}
        nowSec={0}
        pxPerSec={100}
        height={200}
        layout={layout}
      />
    )

    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
