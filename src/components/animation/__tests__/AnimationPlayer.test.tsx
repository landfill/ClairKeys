import { act, render, screen } from '@testing-library/react'
import AnimationPlayer, { getTempoDisplay } from '../AnimationPlayer'
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

  describe('tempo provenance display', () => {
    it.each([
      [
        'score',
        { tempo: 60, tempoSource: 'score' as const, timingReferenceBpm: 60 },
        { primary: '♩=60 (악보에서 읽음)' },
      ],
      [
        'user',
        { tempo: 72, tempoSource: 'user' as const, timingReferenceBpm: 72, scoreTempo: 60 },
        { primary: '♩=72 (직접 입력)', secondary: '악보 표기: ♩=60' },
      ],
      [
        'legacy unknown',
        { tempo: 120, tempoSource: 'unknown' as const, timingReferenceBpm: 120 },
        { primary: '♩=120 (출처 미상)' },
      ],
      [
        'unknown tempo',
        { tempo: null, tempoSource: 'unknown' as const, timingReferenceBpm: 60 },
        { primary: '빠르기 미상', secondary: '♩=60 기준으로 계산됨' },
      ],
    ])('%s tempo is distinguishable', (_name, input, expected) => {
      expect(getTempoDisplay(input)).toEqual(expected)
    })

    it('does not repeat the score tempo when user input matches it', () => {
      expect(
        getTempoDisplay({
          tempo: 60,
          tempoSource: 'user',
          timingReferenceBpm: 60,
          scoreTempo: 60,
        })
      ).toEqual({ primary: '♩=60 (직접 입력)' })
    })
  })
})
