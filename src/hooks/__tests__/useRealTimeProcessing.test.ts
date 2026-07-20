import { act, renderHook } from '@testing-library/react'
import { useRealTimeProcessing } from '../useRealTimeProcessing'

class MockEventSource {
  static instances: MockEventSource[] = []

  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  close = jest.fn()

  constructor(readonly url: string) {
    MockEventSource.instances.push(this)
  }
}

const mockFetch = jest.fn()

describe('useRealTimeProcessing', () => {
  beforeEach(() => {
    MockEventSource.instances = []
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ sessionId: 'session-1' })
    })
    global.fetch = mockFetch as unknown as typeof fetch
    Object.defineProperty(global, 'EventSource', {
      configurable: true,
      writable: true,
      value: MockEventSource
    })
  })

  it('delivers active connection events to the latest callbacks', async () => {
    const firstOnComplete = jest.fn()
    const latestOnComplete = jest.fn()
    const firstOnStageChange = jest.fn()
    const latestOnStageChange = jest.fn()
    const { result, rerender } = renderHook(
      ({ onComplete, onStageChange }) => useRealTimeProcessing({ onComplete, onStageChange }),
      {
        initialProps: {
          onComplete: firstOnComplete,
          onStageChange: firstOnStageChange
        }
      }
    )

    await act(async () => {
      await result.current.startProcessing(
        new File(['score'], 'score.pdf', { type: 'application/pdf' }),
        { title: 'Score', composer: 'Composer', isPublic: false }
      )
    })

    expect(MockEventSource.instances).toHaveLength(1)

    rerender({
      onComplete: latestOnComplete,
      onStageChange: latestOnStageChange
    })

    act(() => {
      MockEventSource.instances[0].onmessage?.({
        data: JSON.stringify({
          type: 'status',
          sessionId: 'session-1',
          stage: 'complete',
          progress: 100,
          message: 'done',
          startTime: 1,
          completed: true,
          cancelled: false,
          result: { animationId: 'animation-1' }
        })
      } as MessageEvent)
    })

    expect(latestOnStageChange).toHaveBeenCalledWith('complete')
    expect(latestOnComplete).toHaveBeenCalledWith({ animationId: 'animation-1' })
    expect(firstOnStageChange).not.toHaveBeenCalled()
    expect(firstOnComplete).not.toHaveBeenCalled()
  })
})
