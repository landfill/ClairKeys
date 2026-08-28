import { render, screen } from '@testing-library/react'
import Home from '../page'

describe('Home accessibility contract', () => {
  it('makes the horizontally scrollable piano preview keyboard reachable', () => {
    render(<Home />)

    const pianoPreview = screen.getByRole('region', {
      name: '피아노 건반 미리보기',
    })

    expect(pianoPreview).toHaveAttribute('tabindex', '0')
  })
})
