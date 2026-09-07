import { render, screen } from '@testing-library/react'
import FallingNotes from '../FallingNotes'
import type { KeyLayout } from '@/types/fallingNotes'

const layout: KeyLayout = {
  byMidi: new Map([[60, { x: 0, w: 20, black: false }]]),
  totalWidth: 20,
  keyWidth: 20,
}

describe('FallingNotes fingering', () => {
  it('omits a label too tall for a very short note', () => {
    render(
      <FallingNotes
        notes={[{ midi: 60, start: 1, duration: 0.01, hand: 'R', finger: 2 }]}
        nowSec={0}
        pxPerSec={100}
        height={200}
        layout={layout}
      />
    )

    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })
})


it('fits a readable label in a 0.1-second black note without a text shadow', () => {
  const blackLayout: KeyLayout = {
    byMidi: new Map([[61, { x: 10, w: 14, black: true }]]),
    totalWidth: 48, keyWidth: 24,
  }
  render(<FallingNotes notes={[{midi: 61, start: 1, duration: 0.1, finger: 2}]}
    nowSec={0} pxPerSec={140} height={350} layout={blackLayout} />)
  const badge = screen.getByText('2')
  expect(badge).toHaveStyle({width: '10.5px', height: '14px', fontSize: '12px', lineHeight: '1'})
  expect(badge.style.textShadow).toBe('')
  expect(badge.style.backgroundColor).not.toBe('')
  expect(badge.style.top).toBe('0px')
})
