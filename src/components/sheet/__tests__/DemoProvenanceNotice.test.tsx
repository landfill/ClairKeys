import { render, screen } from '@testing-library/react'
import DemoProvenanceNotice from '../DemoProvenanceNotice'

describe('DemoProvenanceNotice', () => {
  it('warns that a confirmed demo is not the uploaded score conversion', () => {
    render(<DemoProvenanceNotice provenance="demo" />)

    expect(screen.getByRole('alert')).toHaveTextContent('실제 악보 변환 결과가 아닙니다')
  })

  it('remains visible as an overlay during active playback', () => {
    render(<DemoProvenanceNotice provenance="demo" isPlaybackActive />)

    expect(screen.getByRole('alert')).toHaveClass('fixed')
    expect(screen.getByRole('alert')).toHaveTextContent('실제 악보 변환 결과가 아닙니다')
  })

  it.each(['omr', 'unknown'] as const)('renders nothing for %s provenance', (provenance) => {
    const { container } = render(<DemoProvenanceNotice provenance={provenance} />)

    expect(container).toBeEmptyDOMElement()
  })
})
