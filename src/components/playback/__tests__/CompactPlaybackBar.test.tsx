import { render, screen, fireEvent } from '@testing-library/react'
import CompactPlaybackBar from '../CompactPlaybackBar'

function renderBar(overrides: Partial<React.ComponentProps<typeof CompactPlaybackBar>> = {}) {
  const props = {
    isReady: true,
    currentTime: 30,
    duration: 100,
    playbackSpeed: 1,
    volume: 0.22,
    maxVolume: 1,
    onPause: jest.fn(),
    onStop: jest.fn(),
    onSeek: jest.fn(),
    onSpeedChange: jest.fn(),
    onVolumeChange: jest.fn(),
    ...overrides,
  }
  render(<CompactPlaybackBar {...props} />)
  return props
}

describe('CompactPlaybackBar', () => {
  // The bar exists because a landscape phone has 390px of height in total. What
  // it drops has to be chrome, never a way to operate playback — including for
  // someone who never touches the screen.
  describe('seeking', () => {
    it('exposes the position as a slider a keyboard can reach', () => {
      renderBar()

      const seek = screen.getByRole('slider', { name: '재생 위치' })
      expect(seek).toHaveAttribute('tabindex', '0')
      expect(seek).toHaveAttribute('aria-valuemin', '0')
      expect(seek).toHaveAttribute('aria-valuemax', '100')
      expect(seek).toHaveAttribute('aria-valuenow', '30')
    })

    it('steps the playhead with the arrow keys', () => {
      const props = renderBar()
      const seek = screen.getByRole('slider', { name: '재생 위치' })

      fireEvent.keyDown(seek, { key: 'ArrowRight' })
      expect(props.onSeek).toHaveBeenCalledWith(35)

      fireEvent.keyDown(seek, { key: 'ArrowLeft' })
      expect(props.onSeek).toHaveBeenCalledWith(25)
    })

    it('jumps to either end with Home and End', () => {
      const props = renderBar()
      const seek = screen.getByRole('slider', { name: '재생 위치' })

      fireEvent.keyDown(seek, { key: 'Home' })
      expect(props.onSeek).toHaveBeenCalledWith(0)

      fireEvent.keyDown(seek, { key: 'End' })
      expect(props.onSeek).toHaveBeenCalledWith(100)
    })

    it('clamps a step at the ends rather than seeking outside the score', () => {
      const atEnd = renderBar({ currentTime: 98 })
      fireEvent.keyDown(screen.getByRole('slider', { name: '재생 위치' }), { key: 'ArrowRight' })
      expect(atEnd.onSeek).toHaveBeenCalledWith(100)
    })
  })

  it('keeps the transport and both inputs reachable', () => {
    const props = renderBar()

    fireEvent.click(screen.getByLabelText('일시정지'))
    expect(props.onPause).toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText('정지'))
    expect(props.onStop).toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('재생 속도'), { target: { value: '1.5' } })
    expect(props.onSpeedChange).toHaveBeenCalledWith(1.5)

    fireEvent.change(screen.getByLabelText('음량 (master gain)'), { target: { value: '0.4' } })
    expect(props.onVolumeChange).toHaveBeenCalledWith(0.4)
  })

  it('keeps compact transport and loop controls the same size', () => {
    renderBar({
      loopStart: null,
      loopEnd: null,
      onLoopStart: jest.fn(),
      onLoopEnd: jest.fn(),
      onLoopClear: jest.fn(),
    })

    const controls = [
      screen.getByLabelText('일시정지'),
      screen.getByLabelText('구간 시작 A 설정'),
      screen.getByLabelText('구간 끝 B 설정'),
      screen.getByLabelText('A-B 구간 반복 초기화'),
      screen.getByLabelText('정지'),
    ]

    controls.forEach(control => expect(control).toHaveClass('h-10', 'w-10', 'rounded-full'))
    expect(screen.getByLabelText('재생 속도')).toHaveClass('rounded-full')
  })
})
