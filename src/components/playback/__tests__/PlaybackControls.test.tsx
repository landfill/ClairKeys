import { fireEvent, render, screen } from '@testing-library/react'
import PlaybackControls from '../PlaybackControls'

function renderControls(overrides: Partial<React.ComponentProps<typeof PlaybackControls>> = {}) {
  const props = {
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
    const props = renderControls()
    fireEvent.click(screen.getByTitle('현재 위치를 A로 설정'))
    expect(props.onLoopStart).toHaveBeenCalled()
    expect(screen.getByTitle('현재 위치를 B로 설정')).toBeDisabled()
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
})
