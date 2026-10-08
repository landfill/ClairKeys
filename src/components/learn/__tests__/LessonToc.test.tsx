import { render, screen, fireEvent, act } from '@testing-library/react'
import LessonToc from '../LessonToc'

describe('LessonToc', () => {
  const sections = [
    { id: 'sec-1', title: '섹션 1' },
    { id: 'sec-2', title: '섹션 2' },
    { id: 'sec-3', title: '섹션 3' },
    { id: 'sec-4', title: '섹션 4' },
  ]

  let observerCallback: IntersectionObserverCallback | null = null
  const observeMock = jest.fn()
  const unobserveMock = jest.fn()
  const disconnectMock = jest.fn()

  beforeEach(() => {
    observerCallback = null
    window.IntersectionObserver = jest.fn().mockImplementation((callback: IntersectionObserverCallback) => {
      observerCallback = callback
      return {
        observe: observeMock,
        unobserve: unobserveMock,
        disconnect: disconnectMock,
      }
    })
  })

  it('toggles mobile drawer with native details open state and closes on item click and Escape', () => {
    const { container } = render(<LessonToc sections={sections} />)
    const details = container.querySelector('details')!
    const summary = container.querySelector('summary')!
    expect(details.open).toBe(false)

    // Open drawer via summary click
    fireEvent.click(summary)
    details.open = true
    fireEvent(details, new Event('toggle'))
    expect(details.open).toBe(true)

    const mobileContainer = document.getElementById('mobile-lesson-toc')!
    expect(mobileContainer.querySelector('nav')).toBeInTheDocument()

    // Click an item in mobile list closes drawer
    const links = screen.getAllByRole('link', { name: '섹션 2' })
    fireEvent.click(links[0])
    expect(details.open).toBe(false)

    // Open again and press Escape to close
    details.open = true
    fireEvent(details, new Event('toggle'))
    expect(details.open).toBe(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(details.open).toBe(false)
  })

  it('updates aria-current when IntersectionObserver reports intersecting section', () => {
    render(<LessonToc sections={sections} />)
    expect(observerCallback).toBeTruthy()

    // Initially first section has aria-current="location" (or "true")
    const initialActive = screen.getAllByRole('link', { name: '섹션 1' })[0]
    expect(initialActive).toHaveAttribute('aria-current', 'location')

    // Trigger IntersectionObserver entry for sec-3
    act(() => {
      observerCallback?.([
        {
          isIntersecting: true,
          target: { id: 'sec-3' } as Element,
          intersectionRatio: 1,
        } as unknown as IntersectionObserverEntry,
      ], {} as IntersectionObserver)
    })

    const newActive = screen.getAllByRole('link', { name: '섹션 3' })[0]
    expect(newActive).toHaveAttribute('aria-current', 'location')
    expect(initialActive).not.toHaveAttribute('aria-current')
  })
})
