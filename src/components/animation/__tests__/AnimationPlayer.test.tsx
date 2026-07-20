import { act, render, screen } from '@testing-library/react'
import AnimationPlayer from '../AnimationPlayer'
import { AnimationEvent, PianoAnimationData } from '@/types/animation'
import { getAnimationEngine } from '@/services/animationEngine'

jest.mock('@/services/animationEngine', () => ({
  getAnimationEngine: jest.fn()
}))

jest.mock('@/components/playback', () => ({
  PlaybackControls: ({ currentTime }: { currentTime: number }) => (
    <div data-testid="current-time">{currentTime}</div>
  )
}))

jest.mock('@/components/practice', () => ({
  PracticeGuideControls: () => null,
  PracticeKeyHighlight: () => null
}))

jest.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: jest.fn()
}))

const animationData: PianoAnimationData = {
  version: '1.0',
  title: 'Test score',
  composer: 'Composer',
  duration: 10,
  tempo: 120,
  timeSignature: '4/4',
  notes: [],
  metadata: {
    originalFileName: 'score.pdf',
    fileSize: 100,
    processedAt: '2026-07-20T00:00:00Z'
  }
}

describe('AnimationPlayer', () => {
  const listeners = new Map<string, (event: AnimationEvent) => void>()
  const engine = {
    loadAnimation: jest.fn(),
    on: jest.fn((name: string, callback: (event: AnimationEvent) => void) => {
      listeners.set(name, callback)
    }),
    off: jest.fn(),
    getState: jest.fn(() => ({
      isPlaying: false,
      currentTime: 0,
      speed: 1,
      mode: 'listen' as const,
      activeNotes: new Set<string>(),
      isReady: true
    })),
    getPracticeState: jest.fn(() => null),
    pause: jest.fn(),
    play: jest.fn(),
    seekTo: jest.fn(),
    setMode: jest.fn(),
    setSpeed: jest.fn(),
    startPracticeMode: jest.fn(),
    stop: jest.fn(),
    nextPracticeStep: jest.fn(),
    setPracticeTempoProgression: jest.fn()
  }

  beforeEach(() => {
    jest.useFakeTimers()
    listeners.clear()
    ;(getAnimationEngine as jest.Mock).mockReturnValue(engine)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('captures the time value before the throttled callback runs', () => {
    render(<AnimationPlayer animationData={animationData} />)
    const event = {
      type: 'timeUpdate',
      timestamp: 1,
      data: { time: 2 }
    } as AnimationEvent

    act(() => {
      listeners.get('timeUpdate')?.(event)
      event.data.time = 9
      jest.advanceTimersByTime(16)
    })

    expect(screen.getByTestId('current-time')).toHaveTextContent('2')
  })
})
