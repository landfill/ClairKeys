import { render, screen, fireEvent } from '@testing-library/react'
import type { CanonicalAnimationData } from '@/types/animationContract'
import FallingNotesPlayer from '../FallingNotesPlayer'

const mockKeyboardFrames: Set<number>[] = []
const mockPlayerState = {
  isPlaying: true,
  currentTime: 1.5,
  tempoScale: 1,
  lookAheadSec: 1.5,
  volume: 0.22,
  totalLength: 3,
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  seek: jest.fn(),
  setTempoScale: jest.fn(),
  setVolume: jest.fn(),
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

  it('shows the current master gain and forwards slider changes to setVolume', () => {
    mockPlayerState.setVolume.mockClear()
    render(<FallingNotesPlayer animationData={animationData} />)

    // The readout is the gain value itself — that is what makes it usable for
    // choosing DEFAULT_MASTER_GAIN — so it must render the state, not a percent.
    const slider = screen.getByLabelText('음량 (master gain)') as HTMLInputElement
    expect(slider.value).toBe('0.22')
    expect(screen.getByText('0.22')).toBeInTheDocument()

    // A drag forwards the numeric gain to setVolume unchanged; clamping lives in
    // the hook, verified separately.
    fireEvent.change(slider, { target: { value: '0.3' } })
    expect(mockPlayerState.setVolume).toHaveBeenCalledWith(0.3)
  })
})
