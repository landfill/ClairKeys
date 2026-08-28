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
  sampleStatus: 'ready' as 'idle' | 'loading' | 'ready' | 'degraded' | 'failed',
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

const mockOrientation = {
  rotate: false,
  enter: jest.fn(),
  exit: jest.fn(),
}

jest.mock('@/hooks/usePlaybackOrientation', () => ({
  usePlaybackOrientation: () => mockOrientation,
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
  ...jest.requireActual('@/components/playback'),
  PlaybackControls: ({ isReady, onPlay }: { isReady: boolean; onPlay: () => void }) => (
    <div>
      <div data-testid="playback-ready">{String(isReady)}</div>
      <button type="button" data-testid="play" onClick={onPlay}>play</button>
    </div>
  ),
}))

const animationData: CanonicalAnimationData = {
  version: '1.0',
  title: 'Shared clock fixture',
  composer: 'Test',
  duration: 3,
  tempo: 120,
  tempoSource: 'unknown',
  timingReferenceBpm: 120,
  timeSignature: '4/4',
  notes: [
    { midi: 60, start: 1, duration: 1 },
    { midi: 64, start: 2, duration: 0.5 },
  ],
}

describe('FallingNotesPlayer', () => {
  beforeEach(() => {
    mockKeyboardFrames.length = 0
    mockPlayerState.sampleStatus = 'ready'
    mockPlayerState.isPlaying = true
    mockOrientation.rotate = false
  })

  it('derives the visual frame and active keys from the same playhead on first render', () => {
    render(<FallingNotesPlayer animationData={animationData} />)

    expect(screen.getByTestId('visual-playhead')).toHaveTextContent('1.5')
    expect(screen.getByTestId('active-keys')).toHaveTextContent('60')
    expect(mockKeyboardFrames[0]).toEqual(new Set([60]))
    expect(document.body).toHaveClass('playback-active')
  })

  it('shows the current master gain and forwards slider changes to setVolume', () => {
    mockPlayerState.setVolume.mockClear()
    mockPlayerState.isPlaying = false
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

  it('shows recorded-sample readiness and removes the ineffective treble control', () => {
    mockPlayerState.isPlaying = false
    render(<FallingNotesPlayer animationData={animationData} />)

    expect(screen.getByText('녹음 피아노 샘플로 재생합니다.')).toBeInTheDocument()
    expect(screen.getByTestId('playback-ready')).toHaveTextContent('true')
    expect(screen.queryByLabelText(/treble rolloff/)).not.toBeInTheDocument()
  })

  it('exposes degraded and failed fallback states without blocking playback', () => {
    mockPlayerState.isPlaying = false
    mockPlayerState.sampleStatus = 'degraded'
    const { rerender } = render(<FallingNotesPlayer animationData={animationData} />)

    expect(screen.getByText(/이번 재생은 합성음으로 재생합니다/)).toBeInTheDocument()
    expect(screen.getByTestId('playback-ready')).toHaveTextContent('true')

    mockPlayerState.sampleStatus = 'failed'
    rerender(<FallingNotesPlayer animationData={animationData} />)
    expect(screen.getByText(/불러오지 못해 합성음으로 재생합니다/)).toBeInTheDocument()
    expect(screen.getByTestId('playback-ready')).toHaveTextContent('true')
  })

  it('marks controls not ready only while loading', () => {
    mockPlayerState.isPlaying = false
    mockPlayerState.sampleStatus = 'loading'
    render(<FallingNotesPlayer animationData={animationData} />)

    expect(screen.getByText('녹음 피아노 샘플을 준비 중입니다.')).toBeInTheDocument()
    expect(screen.getByTestId('playback-ready')).toHaveTextContent('false')
  })

  // Playback geometry. jsdom performs no layout, so these assertions pin the
  // structural contract that a browser then resolves: the element whose height
  // playback controls must be the same element that lays the falling area and
  // the keyboard out as a column. A separate `height: 100%` wrapper reads as
  // `auto` the moment its parent is sized by flex instead of a pixel height,
  // which collapses the falling area to 0 and lifts the keyboard to the top.
  describe('playback geometry', () => {
    const readColumn = () => {
      const fallingArea = screen.getByTestId('visual-playhead').parentElement!
      const keyboardWrapper = screen.getByTestId('active-keys').parentElement!
      return { fallingArea, keyboardWrapper, column: fallingArea.parentElement! }
    }

    it('lays out the falling area and the keyboard on the measured element itself', () => {
      render(<FallingNotesPlayer animationData={animationData} />)
      const { fallingArea, keyboardWrapper, column } = readColumn()

      expect(keyboardWrapper.parentElement).toBe(column)
      expect(column).toHaveClass('overflow-hidden')
      expect(column.style.display).toBe('flex')
      expect(column.style.flexDirection).toBe('column')

      // No percentage height may sit between the flex-sized box and the two
      // stacked areas — that is exactly the dependency that broke.
      expect(column.style.height).toBe('')
      expect(fallingArea.style.height).toBe('')
      expect(keyboardWrapper.style.height).toBe('120px')
    })

    it('clips the falling area at the hit line so notes cannot draw over the keys', () => {
      render(<FallingNotesPlayer animationData={animationData} />)
      const { fallingArea } = readColumn()

      expect(fallingArea.style.overflow).toBe('hidden')
    })

    it('keeps the idle player at its standard pixel height', () => {
      mockPlayerState.isPlaying = false
      render(<FallingNotesPlayer animationData={animationData} />)
      const { column } = readColumn()

      // lookAheadSec 1.5 * 140 px/s + 120 px keyboard
      expect(column.style.height).toBe('330px')
      expect(column.style.display).toBe('flex')
      expect(column.style.flexDirection).toBe('column')
    })
  })

  // Landscape playback. The orientation request must ride the play click's own
  // user activation, and the rotated box has to swap the viewport's axes —
  // neither is observable through layout in jsdom, so both are pinned here as
  // the contract a device then honours.
  describe('landscape playback', () => {
    it('asks for landscape from the play click itself, not from a later effect', () => {
      mockOrientation.enter.mockClear()
      mockPlayerState.play.mockClear()
      mockPlayerState.isPlaying = false
      render(<FallingNotesPlayer animationData={animationData} />)

      fireEvent.click(screen.getByTestId('play'))

      // requestFullscreen needs transient activation, and play() awaits audio
      // setup that can outlive it.
      expect(mockOrientation.enter).toHaveBeenCalledTimes(1)
      expect(mockPlayerState.play).toHaveBeenCalledTimes(1)
    })

    it('releases the orientation as soon as playback stops', () => {
      mockOrientation.exit.mockClear()
      const { rerender } = render(<FallingNotesPlayer animationData={animationData} />)

      mockPlayerState.isPlaying = false
      rerender(<FallingNotesPlayer animationData={animationData} />)

      expect(mockOrientation.exit).toHaveBeenCalled()
    })

    it('swaps the viewport axes when it stands in for a real rotation', () => {
      mockOrientation.rotate = true
      const { container } = render(<FallingNotesPlayer animationData={animationData} />)
      const root = container.firstElementChild as HTMLElement

      expect(root.style.position).toBe('fixed')
      // The rotated box is as wide as the viewport is tall, and vice versa.
      expect(root.style.width).toBe('100dvh')
      expect(root.style.height).toBe('100dvw')
      expect(root.style.transform).toBe('rotate(90deg) translateY(-100%)')
      expect(root.style.transformOrigin).toBe('top left')
      // min-h-[100dvh] would fight the explicit height along the wrong axis.
      expect(root.className).not.toContain('min-h-[100dvh]')
      expect(document.body).toHaveClass('playback-rotated')
    })

    it('keeps the upright playback view free of the rotation styles', () => {
      const { container } = render(<FallingNotesPlayer animationData={animationData} />)
      const root = container.firstElementChild as HTMLElement

      expect(root.style.transform).toBe('')
      expect(root.className).toContain('min-h-[100dvh]')
      expect(document.body).not.toHaveClass('playback-rotated')
    })
  })

  // Compact playback chrome. Measured on the deployed player: the four stacked
  // blocks cost 264px, and an iPhone 12 in landscape has 390px of viewport
  // height in total. Rotating without compacting leaves a 6px falling area, so
  // the rotation and this compaction are one feature, not two.
  describe('compact playback chrome', () => {
    it('replaces the stacked setup chrome with one bar while playing', () => {
      render(<FallingNotesPlayer animationData={animationData} />)

      // The full three-row control block is a setup affordance.
      expect(screen.queryByTestId('playback-ready')).not.toBeInTheDocument()
      // So is the line explaining what the hit line means.
      expect(screen.queryByText(/히트라인/)).not.toBeInTheDocument()
      expect(screen.getByTestId('compact-playback-bar')).toBeInTheDocument()
    })

    it('keeps the master gain adjustable while the score is sounding', () => {
      mockPlayerState.setVolume.mockClear()
      render(<FallingNotesPlayer animationData={animationData} />)

      // This slider exists to choose DEFAULT_MASTER_GAIN by ear, which can only
      // be done while listening. Hiding it during playback would defeat it.
      const slider = screen.getByLabelText('음량 (master gain)') as HTMLInputElement
      expect(slider.value).toBe('0.22')
      fireEvent.change(slider, { target: { value: '0.4' } })
      expect(mockPlayerState.setVolume).toHaveBeenCalledWith(0.4)
    })

    it('keeps announcing sample fallbacks even though the line is not shown', () => {
      mockPlayerState.sampleStatus = 'failed'
      render(<FallingNotesPlayer animationData={animationData} />)

      // Reclaiming the row must not remove the live region that tells a screen
      // reader the recorded piano was replaced by a synthesised one.
      const status = screen.getByRole('status')
      expect(status).toHaveTextContent('샘플을 불러오지 못해 합성음으로 재생합니다.')
      expect(status.className).toContain('sr-only')
    })

    it('restores the full setup chrome when playback stops', () => {
      mockPlayerState.isPlaying = false
      render(<FallingNotesPlayer animationData={animationData} />)

      expect(screen.getByTestId('playback-ready')).toBeInTheDocument()
      expect(screen.getByText(/히트라인/)).toBeInTheDocument()
      expect(screen.queryByTestId('compact-playback-bar')).not.toBeInTheDocument()
    })
  })
})
