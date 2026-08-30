import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import PlaybackControls from '../PlaybackControls'

const renderControlsProps = {
  isPlaying: false,
  isReady: true,
  currentTime: 10,
  duration: 60,
  playbackSpeed: 1,
  playbackMode: 'listen' as const,
  onPlay: jest.fn(),
  onPause: jest.fn(),
  onStop: jest.fn(),
  onSeek: jest.fn(),
  onSpeedChange: jest.fn(),
  onModeChange: jest.fn(),
}

function renderControls(overrides: Partial<React.ComponentProps<typeof PlaybackControls>> = {}) {
  const props = {
    ...renderControlsProps,
    loopStart: null,
    loopEnd: null,
    onLoopStart: jest.fn(),
    onLoopEnd: jest.fn(),
    onLoopClear: jest.fn(),
    ...overrides,
  }
  render(<PlaybackControls {...props} />)
  return props
}

describe('PlaybackControls', () => {
  it('makes learner-selected A and B markers first-class controls', () => {
    function LoopHarness() {
      const [loopStart, setLoopStart] = useState<number | null>(null)
      const [loopEnd, setLoopEnd] = useState<number | null>(null)

      return (
        <PlaybackControls
          {...renderControlsProps}
          loopStart={loopStart}
          loopEnd={loopEnd}
          onLoopStart={() => {
            setLoopStart(10)
            setLoopEnd(null)
          }}
          onLoopEnd={() => setLoopEnd(20)}
          onLoopClear={() => {
            setLoopStart(null)
            setLoopEnd(null)
          }}
        />
      )
    }

    render(<LoopHarness />)
    const start = screen.getByTitle('구간 시작 A 설정')
    const end = screen.getByTitle('구간 끝 B 설정')
    const clear = screen.getByTitle('A-B 구간 반복 초기화')

    expect(end).toBeDisabled()
    fireEvent.click(start)
    expect(end).toBeEnabled()
    fireEvent.click(end)
    expect(clear).toHaveClass('bg-accent')
    fireEvent.click(clear)
    expect(end).toBeDisabled()
  })

  it('keeps play, stop, and speed alongside loop as primary controls', () => {
    const props = renderControls()
    fireEvent.click(screen.getByTestId('playback-play'))
    fireEvent.click(screen.getByTestId('playback-stop'))
    fireEvent.change(screen.getByLabelText('속도:'), { target: { value: '1.5' } })
    expect(props.onPlay).toHaveBeenCalled()
    expect(props.onStop).toHaveBeenCalled()
    expect(props.onSpeedChange).toHaveBeenCalledWith(1.5)
  })

  it('keeps transport and loop controls the same size while differentiating their roles', () => {
    renderControls()

    const controls = [
      screen.getByTestId('playback-play'),
      screen.getByTestId('playback-pause'),
      screen.getByTestId('playback-stop'),
      screen.getByTitle('구간 시작 A 설정'),
      screen.getByTitle('구간 끝 B 설정'),
      screen.getByTitle('A-B 구간 반복 초기화'),
    ]

    controls.forEach(control => expect(control).toHaveClass('h-12', 'w-20', 'p-0'))
    expect(screen.getByTestId('playback-play')).toHaveClass('bg-accent')
    expect(screen.getByTestId('playback-stop')).toHaveClass('border-rule-strong')
  })

  it('presents speed and secondary settings as matching rounded controls', () => {
    renderControls()

    expect(screen.getByLabelText('속도:')).toHaveClass('rounded-full')
    expect(screen.getByText('전체 설정').closest('details')).toHaveClass('rounded-2xl')
  })

  it('shows the meaning of every playback action next to its icon', () => {
    renderControls()

    expect(screen.getByRole('button', { name: '재생' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '중지' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A 시작' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'B 종료' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A-B 구간 반복 초기화' })).toBeInTheDocument()
  })
})
