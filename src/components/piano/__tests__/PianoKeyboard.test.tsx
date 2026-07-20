import { act, render } from '@testing-library/react'
import PianoKeyboard from '../PianoKeyboard'

jest.mock('@/hooks/useAudio', () => ({
  useAudio: () => ({
    playNote: jest.fn(),
    releaseNote: jest.fn(),
    initializeAudio: jest.fn().mockResolvedValue(undefined),
    isReady: true
  })
}))

describe('PianoKeyboard', () => {
  const context = {
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    scale: jest.fn(),
    strokeRect: jest.fn(),
    fillStyle: '',
    lineWidth: 1,
    strokeStyle: ''
  } as unknown as CanvasRenderingContext2D

  beforeEach(() => {
    jest.useFakeTimers()
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it('draws populated keys without relying on a synthetic resize nudge', () => {
    const dispatchEvent = jest.spyOn(window, 'dispatchEvent')

    render(<PianoKeyboard />)

    expect(context.fillRect).toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(dispatchEvent).not.toHaveBeenCalled()
  })
})
