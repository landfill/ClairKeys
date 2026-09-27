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

describe('FallingNotes hand practice', () => {
  const twoKeys: KeyLayout = {
    byMidi: new Map([[60, { x: 0, w: 20, black: false }], [62, { x: 20, w: 20, black: false }]]),
    totalWidth: 40,
    keyWidth: 20,
  }

  it('fades the hand that is not being practised and hides its fingering', () => {
    const { container } = render(
      <FallingNotes
        notes={[
          { midi: 60, start: 1, duration: 0.5, hand: 'R', finger: 2 },
          { midi: 62, start: 1, duration: 0.5, hand: 'L', finger: 4 },
        ]}
        nowSec={0}
        pxPerSec={100}
        height={200}
        layout={twoKeys}
        dimHand="L"
      />
    )

    const blocks = Array.from(container.querySelectorAll<HTMLElement>('[data-hand]'))
    const byHand = Object.fromEntries(blocks.map(block => [block.dataset.hand, block]))
    expect(byHand.R.style.opacity).toBe('1')
    expect(byHand.L.dataset.dimmed).toBe('true')
    expect(Number(byHand.L.style.opacity)).toBeLessThan(0.5)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('4')).not.toBeInTheDocument()
  })
})
