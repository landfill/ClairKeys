import { act, render } from '@testing-library/react'
import EnhancedProcessingStatus from '../EnhancedProcessingStatus'

type AnimationFrameCallback = (time: number) => void

describe('EnhancedProcessingStatus', () => {
  const gradient = {
    addColorStop: jest.fn()
  }
  const context = {
    arc: jest.fn(),
    beginPath: jest.fn(),
    clearRect: jest.fn(),
    closePath: jest.fn(),
    createLinearGradient: jest.fn(() => gradient),
    fill: jest.fn(),
    fillText: jest.fn(),
    lineTo: jest.fn(),
    moveTo: jest.fn(),
    restore: jest.fn(),
    save: jest.fn(),
    fillStyle: '',
    font: '',
    globalAlpha: 1,
    textAlign: 'start'
  } as unknown as CanvasRenderingContext2D

  let frameCallbacks: AnimationFrameCallback[]

  beforeEach(() => {
    frameCallbacks = []
    jest.spyOn(Math, 'random').mockReturnValue(0.5)
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frameCallbacks.push(callback)
      return frameCallbacks.length
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses the latest progress, theme, and stage without restarting the animation loop', () => {
    const { rerender } = render(
      <EnhancedProcessingStatus
        stage="upload"
        progress={10}
        message="Uploading"
        elapsedTime={1}
        isCompleted={false}
        hasError={false}
        theme="music"
      />
    )

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)

    rerender(
      <EnhancedProcessingStatus
        stage="omr"
        progress={80}
        message="Recognizing"
        elapsedTime={2}
        isCompleted={false}
        hasError={false}
        theme="tech"
      />
    )

    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)

    act(() => {
      frameCallbacks[0](16)
    })

    expect(gradient.addColorStop).toHaveBeenCalledWith(0, '#9c27b020')
    expect(context.arc).toHaveBeenCalled()
    expect(context.fillText).not.toHaveBeenCalled()

    const wavePoint = (context.lineTo as jest.Mock).mock.calls.find(([x]) => x === 100)
    expect(wavePoint?.[1]).toBeCloseTo(100 + Math.sin(2) * 10 * 0.8)
  })
})
