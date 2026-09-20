import { render, screen, fireEvent } from '@testing-library/react'
import ScoreToggle from '../ScoreToggle'
describe('PC score preference', () => {
  beforeEach(() => {
    localStorage.clear()
    window.matchMedia = jest.fn().mockReturnValue({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() })
  })
  it('starts off and remembers a toggle with an accessible pressed state', () => {
    const onChange = jest.fn()
    const { unmount } = render(<ScoreToggle available onChange={onChange} />)
    const button = screen.getByRole('button', { name: '악보 보기' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button.textContent).toBe('')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(onChange).toHaveBeenLastCalledWith(true)
    unmount()
    render(<ScoreToggle available onChange={onChange} />)
    expect(screen.getByRole('button', { name: '악보 보기' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('does not offer score for mobile or legacy sheets', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() })
    const { rerender } = render(<ScoreToggle available onChange={jest.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    rerender(<ScoreToggle available={false} onChange={jest.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
