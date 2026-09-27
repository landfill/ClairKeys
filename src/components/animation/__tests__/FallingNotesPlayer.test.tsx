import { render, screen, fireEvent, act } from '@testing-library/react'
import type { CanonicalAnimationData } from '@/types/animationContract'
import FallingNotesPlayer from '../FallingNotesPlayer'
import { MAX_MASTER_GAIN } from '@/hooks/useFallingNotesAudio'

const mockKeyboardFrames: Set<number>[] = []
const mockKeyboardInput: { current?: (midi: number) => void } = {}
const mockPlayerState = {
  isPlaying: true,
  isSessionActive: true,
  currentTime: 1.5,
  tempoScale: 1,
  lookAheadSec: 1.5,
  volume: 0.22,
  waitingFor: null as number[] | null,
  pressKey: jest.fn().mockResolvedValue(true),
  playNoteNow: jest.fn().mockResolvedValue(true),
  countInLeft: null as number | null,
  sampleStatus: 'ready' as 'idle' | 'loading' | 'ready' | 'degraded' | 'failed',
  totalLength: 3,
  play: jest.fn().mockResolvedValue(true),
  pause: jest.fn(),
  stop: jest.fn(),
  seek: jest.fn(),
  setTempoScale: jest.fn(),
  setVolume: jest.fn(),
}

const mockHookCalls: unknown[][] = []
jest.mock('@/hooks/useFallingNotesPlayer', () => ({
  useFallingNotesPlayer: (...args: unknown[]) => {
    mockHookCalls.push(args)
    return mockPlayerState
  },
}))

/** Never played, or stopped: the setup screen. */
function setIdle() {
  mockPlayerState.isPlaying = false
  mockPlayerState.isSessionActive = false
}

/** Paused part-way through a session: still the focused practice screen. */
function setPaused() {
  mockPlayerState.isPlaying = false
  mockPlayerState.isSessionActive = true
}

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
  default: ({ activeKeys, onKeyPress }: { activeKeys: Set<number>; onKeyPress?: (midi: number) => void }) => {
    mockKeyboardFrames.push(new Set(activeKeys))
    mockKeyboardInput.current = onKeyPress
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
    mockPlayerState.waitingFor = null
    mockPlayerState.countInLeft = null
    mockPlayerState.sampleStatus = 'ready'
    mockPlayerState.isPlaying = true
    mockPlayerState.isSessionActive = true
    mockOrientation.rotate = false
    mockOrientation.enter.mockClear()
    mockOrientation.exit.mockClear()
    mockPlayerState.play.mockClear().mockResolvedValue(true)
  })

  it('derives the visual frame and active keys from the same playhead on first render', () => {
    render(<FallingNotesPlayer animationData={animationData} />)

    expect(screen.getByTestId('visual-playhead')).toHaveTextContent('1.5')
    expect(screen.getByTestId('active-keys')).toHaveTextContent('60')
    expect(mockKeyboardFrames[0]).toEqual(new Set([60]))
    expect(document.body).toHaveClass('playback-active')
  })

  it('shows the metronome value and provenance before and during playback', () => {
    const { rerender } = render(<FallingNotesPlayer animationData={animationData} />)

    expect(screen.getByTestId('tempo-display')).toHaveTextContent('♩=120 (출처 미상)')
    expect(screen.getByTestId('tempo-display')).toHaveClass('fixed')

    setIdle()
    rerender(<FallingNotesPlayer animationData={animationData} />)

    expect(screen.getByTestId('tempo-display')).toHaveTextContent('♩=120 (출처 미상)')
    expect(screen.getByTestId('tempo-display')).not.toHaveClass('fixed')
  })

  it('shows the volume as a share of its range and forwards slider changes to setVolume', () => {
    mockPlayerState.setVolume.mockClear()
    setIdle()
    render(<FallingNotesPlayer animationData={animationData} />)

    // The raw gain readout existed to tune DEFAULT_MASTER_GAIN by ear; that value is
    // settled (D-016) and readers are not tuning it, so the reading is a percentage
    // of the slider's range (D-080). The slider still carries the gain itself.
    const slider = screen.getByLabelText('음량') as HTMLInputElement
    expect(slider.value).toBe('0.22')
    expect(screen.getByText(`${Math.round((0.22 / MAX_MASTER_GAIN) * 100)}%`)).toBeInTheDocument()
    expect(screen.queryByLabelText('음량 (master gain)')).not.toBeInTheDocument()
    expect(screen.queryByText('0.22')).not.toBeInTheDocument()

    // A drag forwards the numeric gain to setVolume unchanged; clamping lives in
    // the hook, verified separately.
    fireEvent.change(slider, { target: { value: '0.3' } })
    expect(mockPlayerState.setVolume).toHaveBeenCalledWith(0.3)
  })

  it('explains the setup steps as a list and which colour belongs to which hand', () => {
    setIdle()
    render(<FallingNotesPlayer animationData={animationData} />)

    const steps = screen.getByRole('list', { name: '연습 방법' })
    expect(steps.querySelectorAll('li')).toHaveLength(3)
    const legend = screen.getByRole('list', { name: '노트 색상' })
    expect(legend).toHaveTextContent('왼손')
    expect(legend).toHaveTextContent('오른손')
  })

  it('shows recorded-sample readiness and removes the ineffective treble control', () => {
    setIdle()
    render(<FallingNotesPlayer animationData={animationData} />)

    expect(screen.getByText('녹음 피아노 샘플로 재생합니다.')).toBeInTheDocument()
    expect(screen.getByTestId('playback-ready')).toHaveTextContent('true')
    expect(screen.queryByLabelText(/treble rolloff/)).not.toBeInTheDocument()
  })

  it('exposes degraded and failed fallback states without blocking playback', () => {
    setIdle()
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
    setIdle()
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
  describe('wait mode', () => {
    const lastOptions = () => (mockHookCalls[mockHookCalls.length - 1][1] ?? {}) as { waitSteps?: { time: number; pitches: number[] }[] }
    const setMidi = (value: unknown) =>
      Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, writable: true, value })
    afterEach(() => setMidi(undefined))

    it('builds the steps and asks for the MIDI piano from the click that turns it on', async () => {
      setIdle()
      setMidi(jest.fn().mockResolvedValue({ inputs: new Map([['0', { name: 'Digital Piano', onmidimessage: null }]]), onstatechange: null }))
      render(<FallingNotesPlayer animationData={animationData} />)
      expect(lastOptions().waitSteps).toBeUndefined()

      await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: '기다리기 모드' })) })
      expect(lastOptions().waitSteps).toEqual([{ time: 1, pitches: [60] }, { time: 2, pitches: [64] }])
      expect(navigator.requestMIDIAccess).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/Digital Piano/)).toBeInTheDocument()
    })

    it('points to the on-screen keys where the browser has no MIDI', async () => {
      setIdle()
      setMidi(undefined)
      render(<FallingNotesPlayer animationData={animationData} />)
      await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: '기다리기 모드' })) })
      expect(screen.getByText(/MIDI를 지원하지 않습니다/)).toBeInTheDocument()
    })

    it('shows the keys still to press and plays an on-screen press', async () => {
      setIdle()
      const { rerender } = render(<FallingNotesPlayer animationData={animationData} />)
      await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: '기다리기 모드' })) })
      mockPlayerState.isPlaying = true
      mockPlayerState.isSessionActive = true
      mockPlayerState.waitingFor = [60, 64]
      mockPlayerState.pressKey.mockClear()
      mockPlayerState.playNoteNow.mockClear()
      rerender(<FallingNotesPlayer animationData={animationData} />)

      expect(screen.getByTestId('wait-prompt')).toHaveTextContent('남은 음 2개')
      expect([...mockKeyboardFrames[mockKeyboardFrames.length - 1]]).toEqual([60, 64])
      await act(async () => { mockKeyboardInput.current?.(60) })
      expect(mockPlayerState.playNoteNow).toHaveBeenCalledWith(60)
      expect(mockPlayerState.pressKey).toHaveBeenCalledWith(60)
    })
  })

  describe('metronome and count-in', () => {
    type Options = { clicks?: { time: number; accent: boolean }[]; countIn?: (at: number) => { time: number }[] }
    const lastOptions = () => (mockHookCalls[mockHookCalls.length - 1][1] ?? {}) as Options
    beforeEach(() => {
      try { localStorage.clear() } catch { /* jsdom always has storage */ }
      mockPlayerState.countInLeft = null
    })

    it('clicks on an even grid when the seconds were baked at one tempo', () => {
      setIdle()
      render(<FallingNotesPlayer animationData={animationData} />)
      expect(lastOptions().clicks ?? []).toEqual([])

      fireEvent.click(screen.getByRole('checkbox', { name: '메트로놈' }))
      // tempo 120 in 4/4 over a 3 s piece: a click every half second from 0.
      expect(lastOptions().clicks?.map(click => click.time)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3])
      expect(localStorage.getItem('clairkeys.metronome')).toBe('true')
    })

    it('refuses a metronome that could drift from a score-read tempo without the measure map', () => {
      setIdle()
      render(<FallingNotesPlayer animationData={{ ...animationData, tempoSource: 'score', tempo: 120 }} />)
      const metronome = screen.getByRole('checkbox', { name: '메트로놈' })
      expect(metronome).toBeDisabled()
      expect(screen.getByText(/박자 정보가 없어/)).toBeInTheDocument()
    })

    it('counts one bar in before playing, at the reference beat', () => {
      setIdle()
      render(<FallingNotesPlayer animationData={animationData} />)
      expect(lastOptions().countIn).toBeUndefined()

      fireEvent.click(screen.getByRole('checkbox', { name: '시작 전 준비 박자' }))
      expect(lastOptions().countIn?.(2).map(click => click.time)).toEqual([0, 0.5, 1, 1.5])
    })

    it('shows the count-in countdown over the notes', () => {
      mockPlayerState.countInLeft = 3
      render(<FallingNotesPlayer animationData={animationData} />)
      expect(screen.getByTestId('count-in')).toHaveTextContent('3')
    })
  })

  describe('hand practice', () => {
    const twoHands: CanonicalAnimationData = {
      ...animationData,
      notes: [
        { midi: 72, start: 1, duration: 1, hand: 'R' },
        { midi: 48, start: 1, duration: 1, hand: 'L' },
      ],
    }
    const lastAudible = () => (mockHookCalls[mockHookCalls.length - 1][1] as { audibleNotes: { midi: number }[] }).audibleNotes

    it('offers no hand choice for a score that has only one hand', () => {
      setIdle()
      // Unassigned notes get a hand from the fingering heuristic, so the
      // single-hand score has to say so explicitly.
      const rightHandOnly = { ...animationData, notes: animationData.notes.map(note => ({ ...note, hand: 'R' as const })) }
      render(<FallingNotesPlayer animationData={rightHandOnly} />)
      expect(screen.queryByRole('group', { name: '연습할 손' })).not.toBeInTheDocument()
    })

    it('narrows the keyboard to the practised hand and keeps the accompaniment audible by default', () => {
      setIdle()
      mockPlayerState.currentTime = 1.5
      render(<FallingNotesPlayer animationData={twoHands} />)

      expect(screen.getByTestId('active-keys')).toHaveTextContent('72,48')
      fireEvent.click(screen.getByRole('button', { name: '오른손' }))

      expect(screen.getByRole('button', { name: '오른손' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('active-keys')).toHaveTextContent(/^72$/)
      expect(lastAudible().map(note => note.midi)).toEqual([72, 48])
    })

    it('silences the other hand only when asked', () => {
      setIdle()
      render(<FallingNotesPlayer animationData={twoHands} />)
      fireEvent.click(screen.getByRole('button', { name: '왼손' }))
      fireEvent.click(screen.getByRole('checkbox', { name: '다른 손 소리 듣기' }))

      expect(lastAudible().map(note => note.midi)).toEqual([48])
      fireEvent.click(screen.getByRole('button', { name: '양손' }))
      expect(lastAudible().map(note => note.midi)).toEqual([72, 48])
      expect(screen.queryByRole('checkbox', { name: '다른 손 소리 듣기' })).not.toBeInTheDocument()
    })
  })

  describe('resuming where the reader stopped', () => {
    const key = 'clairkeys.resume.7'
    beforeEach(() => {
      localStorage.clear()
      mockPlayerState.totalLength = 120
      mockPlayerState.seek.mockClear().mockResolvedValue(undefined)
    })
    afterEach(() => { mockPlayerState.totalLength = 3 })

    it('offers the saved position on the setup screen and plays from it', async () => {
      localStorage.setItem(key, JSON.stringify({ time: 45, savedAt: '2026-09-27T00:00:00Z' }))
      setIdle()
      render(<FallingNotesPlayer animationData={animationData} resumeKey={key} />)

      expect(screen.getByRole('region', { name: '이어서 연습' })).toHaveTextContent('0:45')
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: '0:45부터 이어서 연습' })) })
      expect(mockPlayerState.seek).toHaveBeenCalledWith(45)
      expect(mockPlayerState.play).toHaveBeenCalledTimes(1)
    })

    it('asks for the landscape screen inside the click, before waiting for the seek', () => {
      localStorage.setItem(key, JSON.stringify({ time: 45, savedAt: '' }))
      setIdle()
      mockOrientation.enter.mockClear()
      // A seek that never settles: anything after the await would never run.
      mockPlayerState.seek.mockReturnValue(new Promise(() => {}))
      render(<FallingNotesPlayer animationData={animationData} resumeKey={key} />)

      fireEvent.click(screen.getByRole('button', { name: '0:45부터 이어서 연습' }))
      expect(mockOrientation.enter).toHaveBeenCalledTimes(1)
    })

    it('withdraws the offer once a run starts another way', () => {
      localStorage.setItem(key, JSON.stringify({ time: 45, savedAt: '' }))
      setIdle()
      const { rerender } = render(<FallingNotesPlayer animationData={animationData} resumeKey={key} />)
      mockPlayerState.isSessionActive = true
      mockPlayerState.isPlaying = true
      rerender(<FallingNotesPlayer animationData={animationData} resumeKey={key} />)
      setIdle()
      rerender(<FallingNotesPlayer animationData={animationData} resumeKey={key} />)
      expect(screen.queryByRole('region', { name: '이어서 연습' })).not.toBeInTheDocument()
    })

    it('forgets the position when the reader starts over', () => {
      localStorage.setItem(key, JSON.stringify({ time: 45, savedAt: '' }))
      setIdle()
      render(<FallingNotesPlayer animationData={animationData} resumeKey={key} />)

      fireEvent.click(screen.getByRole('button', { name: '처음부터' }))
      expect(screen.queryByRole('region', { name: '이어서 연습' })).not.toBeInTheDocument()
      expect(localStorage.getItem(key)).toBeNull()
    })

    it('saves the position while practising and when the page is hidden', () => {
      mockPlayerState.currentTime = 12.3
      const { rerender } = render(<FallingNotesPlayer animationData={animationData} resumeKey={key} />)
      expect(JSON.parse(localStorage.getItem(key)!).time).toBe(12.3)

      // Within the same five seconds nothing is rewritten.
      mockPlayerState.currentTime = 13
      rerender(<FallingNotesPlayer animationData={animationData} resumeKey={key} />)
      expect(JSON.parse(localStorage.getItem(key)!).time).toBe(12.3)

      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      act(() => { document.dispatchEvent(new Event('visibilitychange')) })
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
      expect(JSON.parse(localStorage.getItem(key)!).time).toBe(13)
      mockPlayerState.currentTime = 1.5
    })

    it('does not overwrite the position with the reset to zero after a stop, and forgets a finished run', () => {
      mockPlayerState.currentTime = 50
      const { rerender } = render(<FallingNotesPlayer animationData={animationData} resumeKey={key} />)
      setIdle()
      mockPlayerState.currentTime = 0
      rerender(<FallingNotesPlayer animationData={animationData} resumeKey={key} />)
      expect(JSON.parse(localStorage.getItem(key)!).time).toBe(50)

      mockPlayerState.isPlaying = true
      mockPlayerState.isSessionActive = true
      mockPlayerState.currentTime = 118
      rerender(<FallingNotesPlayer animationData={animationData} resumeKey={key} />)
      setIdle()
      mockPlayerState.currentTime = 0
      rerender(<FallingNotesPlayer animationData={animationData} resumeKey={key} />)
      expect(localStorage.getItem(key)).toBeNull()
      mockPlayerState.currentTime = 1.5
    })
  })

  describe('keyboard shortcuts', () => {
    it('plays from the setup screen with space and seeks five seconds with the arrows', async () => {
      setIdle()
      mockPlayerState.seek.mockClear()
      render(<FallingNotesPlayer animationData={animationData} />)

      await act(async () => { fireEvent.keyDown(document.body, { key: ' ' }) })
      expect(mockPlayerState.play).toHaveBeenCalledTimes(1)
      expect(mockOrientation.enter).toHaveBeenCalled()

      fireEvent.keyDown(document.body, { key: 'ArrowRight' })
      fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
      expect(mockPlayerState.seek.mock.calls).toEqual([[3], [0]])
    })

    it('pauses a sounding session with space', () => {
      mockPlayerState.pause.mockClear()
      render(<FallingNotesPlayer animationData={animationData} />)

      fireEvent.keyDown(document.body, { key: ' ' })
      expect(mockPlayerState.pause).toHaveBeenCalledTimes(1)
      expect(mockPlayerState.play).not.toHaveBeenCalled()
    })

    it('does not start or seek while the samples are still loading, as the controls do not', () => {
      setIdle()
      mockPlayerState.sampleStatus = 'loading'
      mockPlayerState.seek.mockClear()
      render(<FallingNotesPlayer animationData={animationData} />)

      fireEvent.keyDown(document.body, { key: ' ' })
      // A seek here would stop the pending start and it would never sound.
      fireEvent.keyDown(document.body, { key: 'ArrowRight' })
      expect(mockPlayerState.play).not.toHaveBeenCalled()
      expect(mockPlayerState.seek).not.toHaveBeenCalled()
    })

    it('tells keyboard users the shortcuts on the setup screen', () => {
      setIdle()
      render(<FallingNotesPlayer animationData={animationData} />)
      expect(screen.getByRole('note', { name: '키보드 단축키' })).toHaveTextContent('Space 재생·일시정지')
    })
  })

  describe('wait mode with one hand', () => {
    it('waits only for the practised hand', async () => {
      setIdle()
      const twoHands = {
        ...animationData,
        notes: [
          { midi: 72, start: 1, duration: 1, hand: 'R' as const },
          { midi: 48, start: 1, duration: 1, hand: 'L' as const },
          { midi: 74, start: 2, duration: 1, hand: 'R' as const },
        ],
      }
      render(<FallingNotesPlayer animationData={twoHands} />)
      fireEvent.click(screen.getByRole('button', { name: '오른손' }))
      await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: '기다리기 모드' })) })
      const options = mockHookCalls[mockHookCalls.length - 1][1] as { waitSteps?: { time: number; pitches: number[] }[] }
      expect(options.waitSteps).toEqual([{ time: 1, pitches: [72] }, { time: 2, pitches: [74] }])
    })
  })

  describe('practice time in wait mode', () => {
    it('does not count time stopped at a wait prompt as practice', () => {
      let now = 0
      const clock = jest.spyOn(performance, 'now').mockImplementation(() => now)
      const onPracticeRun = jest.fn()
      mockPlayerState.isPlaying = true
      mockPlayerState.isSessionActive = true
      mockPlayerState.waitingFor = null
      const { rerender } = render(<FallingNotesPlayer animationData={animationData} onPracticeRun={onPracticeRun} />)
      now = 20_000
      mockPlayerState.waitingFor = [60] // stopped at a prompt for a minute
      rerender(<FallingNotesPlayer animationData={animationData} onPracticeRun={onPracticeRun} />)
      now = 80_000
      mockPlayerState.waitingFor = null
      rerender(<FallingNotesPlayer animationData={animationData} onPracticeRun={onPracticeRun} />)
      now = 90_000
      setIdle()
      rerender(<FallingNotesPlayer animationData={animationData} onPracticeRun={onPracticeRun} />)
      expect(onPracticeRun.mock.calls[0][0].durationSeconds).toBe(30)
      clock.mockRestore()
    })
  })

  describe('playback geometry', () => {
    const readColumn = () => {
      const fallingArea = screen.getByTestId('visual-playhead').parentElement!
      const keyboardWrapper = screen.getByTestId('active-keys').parentElement!
      return { fallingArea, keyboardWrapper, column: fallingArea.parentElement! }
    }

    it('lays out the falling area and the keyboard on one column of its own', () => {
      render(<FallingNotesPlayer animationData={animationData} />)
      const { fallingArea, keyboardWrapper, column } = readColumn()

      expect(keyboardWrapper.parentElement).toBe(column)
      expect(column).toHaveClass('overflow-hidden')
      expect(column.style.display).toBe('flex')
      expect(column.style.flexDirection).toBe('column')

      // The original defect was a percentage height resolving against a parent
      // that only had a flex-computed one. The box may carry a pixel height —
      // it now does, from the look-ahead plan — but never a percentage, and
      // nothing between it and the two areas may state one either.
      expect(column.style.height).toMatch(/^\d+(\.\d+)?px$/)
      expect(fallingArea.style.height).toBe('')
      expect(keyboardWrapper.style.height).toMatch(/^\d+px$/)
    })

    it('measures a wrapper rather than the box it sizes', () => {
      render(<FallingNotesPlayer animationData={animationData} />)
      const { column } = readColumn()
      const wrapper = column.parentElement!

      // Deriving the box's height from the box's own measurement would feed
      // back into itself; the wrapper is what owns the available space.
      expect(wrapper.style.flex).toBe('1 1 0%')
      expect(wrapper.style.height).toBe('')
      expect(column.style.flex).toBe('')
    })

    it('clips the falling area at the hit line so notes cannot draw over the keys', () => {
      render(<FallingNotesPlayer animationData={animationData} />)
      const { fallingArea } = readColumn()

      expect(fallingArea.style.overflow).toBe('hidden')
    })

    it('keeps the idle player at its standard pixel height', () => {
      setIdle()
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
      setIdle()
      render(<FallingNotesPlayer animationData={animationData} />)

      fireEvent.click(screen.getByTestId('play'))

      // requestFullscreen needs transient activation, and play() awaits audio
      // setup that can outlive it.
      expect(mockOrientation.enter).toHaveBeenCalledTimes(1)
      expect(mockPlayerState.play).toHaveBeenCalledTimes(1)
    })

    it('releases the orientation as soon as the session ends', () => {
      mockOrientation.exit.mockClear()
      const { rerender } = render(<FallingNotesPlayer animationData={animationData} />)

      setIdle()
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
      expect(screen.queryByRole('list', { name: '연습 방법' })).not.toBeInTheDocument()
      expect(screen.getByTestId('compact-playback-bar')).toBeInTheDocument()
    })

    it('keeps the master gain adjustable while the score is sounding', () => {
      mockPlayerState.setVolume.mockClear()
      render(<FallingNotesPlayer animationData={animationData} />)

      // This slider exists to choose DEFAULT_MASTER_GAIN by ear, which can only
      // be done while listening. Hiding it during playback would defeat it.
      const slider = screen.getByLabelText('음량') as HTMLInputElement
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

    it('restores the full setup chrome when the session ends', () => {
      setIdle()
      render(<FallingNotesPlayer animationData={animationData} />)

      expect(screen.getByTestId('playback-ready')).toBeInTheDocument()
      expect(screen.getByRole('list', { name: '연습 방법' })).toBeInTheDocument()
      expect(screen.queryByTestId('compact-playback-bar')).not.toBeInTheDocument()
    })
  })

  // Pause used to be indistinguishable from stop: the phone turned back, the
  // page header and the three-row control block came back, and the box fell
  // from its viewport height to a fixed 330px. Resuming meant finding the
  // transport somewhere else on a page that had just reflowed underneath it.
  describe('pausing inside a practice session', () => {
    it('keeps the focused frame while the session is paused', () => {
      setPaused()
      render(<FallingNotesPlayer animationData={animationData} />)

      expect(screen.getByTestId('compact-playback-bar')).toBeInTheDocument()
      expect(screen.queryByTestId('playback-ready')).not.toBeInTheDocument()
      expect(screen.queryByRole('list', { name: '연습 방법' })).not.toBeInTheDocument()
      expect(document.body).toHaveClass('playback-active')
    })

    it('keeps the box on the same measured column while paused', () => {
      setPaused()
      render(<FallingNotesPlayer animationData={animationData} />)
      const column = screen.getByTestId('visual-playhead').parentElement!.parentElement!

      // 330px is the idle box. Falling back to it on pause is the jump.
      expect(column.style.height).not.toBe('330px')
      expect(column.parentElement!.style.flex).toBe('1 1 0%')
    })

    it('does not release the orientation on a pause', () => {
      const { rerender } = render(<FallingNotesPlayer animationData={animationData} />)
      mockOrientation.exit.mockClear()

      setPaused()
      rerender(<FallingNotesPlayer animationData={animationData} />)

      // Turning the phone back upright mid-practice is the same defect as
      // rebuilding the page underneath it.
      expect(mockOrientation.exit).not.toHaveBeenCalled()
    })

    it('releases the orientation when the session itself ends', () => {
      const { rerender } = render(<FallingNotesPlayer animationData={animationData} />)
      setPaused()
      rerender(<FallingNotesPlayer animationData={animationData} />)
      mockOrientation.exit.mockClear()

      setIdle()
      rerender(<FallingNotesPlayer animationData={animationData} />)

      expect(mockOrientation.exit).toHaveBeenCalled()
    })

    it('reports the session to the page rather than the sounding score', () => {
      const onSessionChange = jest.fn()
      const { rerender } = render(
        <FallingNotesPlayer animationData={animationData} onSessionChange={onSessionChange} />
      )
      expect(onSessionChange).toHaveBeenLastCalledWith(true)

      setPaused()
      rerender(<FallingNotesPlayer animationData={animationData} onSessionChange={onSessionChange} />)
      // The page header and the info card stay away: a pause is not a return
      // to browsing.
      expect(onSessionChange).toHaveBeenLastCalledWith(true)

      setIdle()
      rerender(<FallingNotesPlayer animationData={animationData} onSessionChange={onSessionChange} />)
      expect(onSessionChange).toHaveBeenLastCalledWith(false)
    })

    it('resumes from the same slot the pause was in', async () => {
      setPaused()
      render(<FallingNotesPlayer animationData={animationData} />)

      await act(async () => {
        fireEvent.click(screen.getByLabelText('재생'))
      })

      // The resume rides the same click that a first play does, because the
      // browser may have dropped fullscreen while the reader was paused.
      expect(mockOrientation.enter).toHaveBeenCalledTimes(1)
      expect(mockPlayerState.play).toHaveBeenCalledTimes(1)
    })

    it('does not release the orientation when a resume fails inside a session', async () => {
      setPaused()
      mockPlayerState.play.mockResolvedValue(false)
      render(<FallingNotesPlayer animationData={animationData} />)
      mockOrientation.exit.mockClear()

      await act(async () => {
        fireEvent.click(screen.getByLabelText('재생'))
      })

      // Unlike a failed first play, this leaves the reader where they already
      // were — paused, in a screen they can operate.
      expect(mockOrientation.exit).not.toHaveBeenCalled()
    })
  })

  // enter() runs from the click, but isPlaying only flips after play() resolves
  // its audio setup. Anything that treats that window as "not playing" cancels
  // the request that was just issued — on iOS that is the whole feature.
  describe('the window between the click and the first sound', () => {
    it('does not release the orientation while playback is still starting', async () => {
      setIdle()
      render(<FallingNotesPlayer animationData={animationData} />)
      mockOrientation.exit.mockClear()

      await act(async () => {
        fireEvent.click(screen.getByTestId('play'))
      })

      expect(mockOrientation.enter).toHaveBeenCalledTimes(1)
      expect(mockOrientation.exit).not.toHaveBeenCalled()
    })

    it('does not release the orientation merely because the player mounted idle', () => {
      setIdle()
      render(<FallingNotesPlayer animationData={animationData} />)

      // Releasing on a false that was never preceded by a true is the same
      // cancellation, arriving one render earlier.
      expect(mockOrientation.exit).not.toHaveBeenCalled()
    })

    it('releases the orientation when the audio never starts', async () => {
      setIdle()
      mockPlayerState.play.mockResolvedValue(false)
      render(<FallingNotesPlayer animationData={animationData} />)
      mockOrientation.exit.mockClear()

      await act(async () => {
        fireEvent.click(screen.getByTestId('play'))
      })

      // Otherwise a failed start leaves a phone turned with nothing playing.
      expect(mockOrientation.exit).toHaveBeenCalledTimes(1)
    })
  })
})
