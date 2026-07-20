import { render } from '@testing-library/react'
import MobileTouchOptimizer from '../MobileTouchOptimizer'

describe('MobileTouchOptimizer', () => {
  it('does not disable document zoom while optimizing piano touches', () => {
    const viewport = document.createElement('meta')
    viewport.name = 'viewport'
    viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover'
    document.head.appendChild(viewport)

    render(
      <MobileTouchOptimizer>
        <div>Piano</div>
      </MobileTouchOptimizer>
    )

    expect(viewport.content).toBe('width=device-width, initial-scale=1, viewport-fit=cover')
    viewport.remove()
  })
})
