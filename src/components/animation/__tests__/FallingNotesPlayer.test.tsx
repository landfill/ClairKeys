import { render, screen } from '@testing-library/react'
import type { CanonicalAnimationData } from '@/types/animationContract'
import FallingNotesPlayer from '../FallingNotesPlayer'

const mockKeyboardFrames: Set<number>[] = []
const mockPlayerState = {
  isPlaying: true,
  currentTime: 1.5,
  tempoScale: 1,
  lookAheadSec: 1.5,
  totalLength: 3,
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  seek: jest.fn(),
  setTempoScale: jest.fn(),
}

jest.mock('@/hooks/useFallingNotesPlayer', () => ({
  useFallingNotesPlayer: () => mockPlayerState,
}))

jest.mock('../FallingNotes', () => ({
  __esModule: true,
  default: ({ nowSec }: { nowSec: number }) => (
    <div data-testid="visual-playhead">{nowSec}</div>
  ),
}))

jest.mock('../../piano/SimplePianoKeyboard', () => ({
  __esModule: true,
  default: ({ activeKeys }: { activeKeys: Set<number> }) => {
    mockKeyboardFrames.push(new Set(activeKeys))
    return <div data-testid="active-keys">{Array.from(activeKeys).join(',')}</div>
  },
}))

jest.mock('@/components/playback', () => ({
  PlaybackControls: () => null,
}))

const animationData: CanonicalAnimationData = {
  version: '1.0',
  title: 'Shared clock fixture',
  composer: 'Test',
  duration: 3,
  tempo: 120,
  timeSignature: '4/4',
  notes: [
    { midi: 60, start: 1, duration: 1 },
    { midi: 64, start: 2, duration: 0.5 },
  ],
}

describe('FallingNotesPlayer', () => {
  beforeEach(() => {
    mockKeyboardFrames.length = 0
  })

  it('derives the visual frame and active keys from the same playhead on first render', () => {
    render(<FallingNotesPlayer animationData={animationData} />)

    expect(screen.getByTestId('visual-playhead')).toHaveTextContent('1.5')
    expect(screen.getByTestId('active-keys')).toHaveTextContent('60')
    expect(mockKeyboardFrames[0]).toEqual(new Set([60]))
  })
})
