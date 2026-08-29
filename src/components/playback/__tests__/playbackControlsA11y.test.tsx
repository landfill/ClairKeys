/**
 * 재생 컨트롤의 접근 가능한 이름 (D-027).
 *
 * DS-2가 이 컴포넌트를 홈의 로그인 전 체험에 올리면서 두 결함이 드러났다. 전송 버튼은 이모지만
 * 담고 있어 스크린리더에 "버튼"으로만 읽혔고, 속도·모드 `<select>`는 옆의 `<label>`이 `htmlFor`로
 * 연결돼 있지 않아 이름이 없었다. CI의 axe 검사가 후자를 `select-name` 위반으로 잡았다.
 *
 * 둘 다 인증 뒤에 있을 때는 눈에 띄지 않았다. 다시 잃으면 CI보다 여기서 먼저 걸리게 한다.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import PlaybackControls from '../PlaybackControls'

const baseProps = {
  isPlaying: false,
  currentTime: 0,
  duration: 10,
  playbackSpeed: 1,
  playbackMode: 'listen' as const,
  isReady: true,
  onPlay: jest.fn(),
  onPause: jest.fn(),
  onStop: jest.fn(),
  onSeek: jest.fn(),
  onSpeedChange: jest.fn(),
  onModeChange: jest.fn(),
}

describe('PlaybackControls — 접근 가능한 이름', () => {
  it('names every transport button', () => {
    render(<PlaybackControls {...baseProps} />)

    expect(screen.getByRole('button', { name: '재생' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '정지' })).toBeInTheDocument()
  })

  it('hides the decorative glyphs from assistive technology', () => {
    const { container } = render(<PlaybackControls {...baseProps} />)

    // 이모지는 이름이 아니라 그림이다. 교체는 DS-5 몫이지만 그때까지 읽히지는 않게 한다.
    for (const glyph of ['▶️', '⏸️', '⏹️']) {
      const node = Array.from(container.querySelectorAll('span')).find(
        (el) => el.textContent === glyph
      )
      expect(node).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('associates each select with its visible label', () => {
    render(<PlaybackControls {...baseProps} />)

    // axe `select-name`. `<label>`이 옆에 있는 것만으로는 이름이 되지 않는다.
    expect(screen.getByLabelText('속도:')).toHaveValue('1')
    expect(screen.getByLabelText('모드:')).toHaveValue('listen')
  })

  /**
   * seek 바는 `onClick`만 달린 `div`였다 — `role`도 `tabIndex`도 키 핸들러도 없어 마우스로만 조작할
   * 수 있었다 (WCAG 2.1.1). axe는 이런 "마우스 전용 인터랙션"을 잡지 못한다. 정적 검사로는
   * `div`에 핸들러가 붙었는지 알 수 없기 때문이다.
   */
  describe('구간 이동 (seek)', () => {
    it('exposes the progress bar as a keyboard-operable slider', () => {
      render(<PlaybackControls {...baseProps} currentTime={4} duration={10} />)

      const slider = screen.getByRole('slider', { name: '재생 위치' })
      expect(slider).toHaveAttribute('tabindex', '0')
      expect(slider).toHaveAttribute('aria-valuemin', '0')
      expect(slider).toHaveAttribute('aria-valuemax', '10')
      expect(slider).toHaveAttribute('aria-valuenow', '4')
      expect(slider).toHaveAttribute('aria-valuetext', '0:04 / 0:10')
    })

    it('seeks with the arrow keys', () => {
      const onSeek = jest.fn()
      render(<PlaybackControls {...baseProps} currentTime={4} duration={10} onSeek={onSeek} />)
      const slider = screen.getByRole('slider', { name: '재생 위치' })

      fireEvent.keyDown(slider, { key: 'ArrowRight' })
      expect(onSeek).toHaveBeenLastCalledWith(5)

      fireEvent.keyDown(slider, { key: 'ArrowLeft' })
      expect(onSeek).toHaveBeenLastCalledWith(3)
    })

    it('jumps to both ends with Home and End', () => {
      const onSeek = jest.fn()
      render(<PlaybackControls {...baseProps} currentTime={4} duration={10} onSeek={onSeek} />)
      const slider = screen.getByRole('slider', { name: '재생 위치' })

      fireEvent.keyDown(slider, { key: 'Home' })
      expect(onSeek).toHaveBeenLastCalledWith(0)

      fireEvent.keyDown(slider, { key: 'End' })
      expect(onSeek).toHaveBeenLastCalledWith(10)
    })

    it('never seeks outside the piece', () => {
      const onSeek = jest.fn()
      const { rerender } = render(
        <PlaybackControls {...baseProps} currentTime={0} duration={10} onSeek={onSeek} />
      )
      fireEvent.keyDown(screen.getByRole('slider', { name: '재생 위치' }), { key: 'ArrowLeft' })
      expect(onSeek).toHaveBeenLastCalledWith(0)

      rerender(<PlaybackControls {...baseProps} currentTime={10} duration={10} onSeek={onSeek} />)
      fireEvent.keyDown(screen.getByRole('slider', { name: '재생 위치' }), { key: 'ArrowRight' })
      expect(onSeek).toHaveBeenLastCalledWith(10)
    })

    it('stays out of the tab order while there is nothing to seek', () => {
      render(<PlaybackControls {...baseProps} isReady={false} duration={0} />)
      expect(screen.getByRole('slider', { name: '재생 위치' })).toHaveAttribute('tabindex', '-1')
    })
  })

  /**
   * 재생·정지는 눈으로 보면 알지만 화면을 보지 않는 사용자에게는 아무 변화가 없었다. 표시 문구는
   * 이미 있었고 live region만 없었다.
   */
  it('announces whether playback is running', () => {
    const { rerender } = render(<PlaybackControls {...baseProps} isPlaying={false} />)
    const status = screen.getByRole('status', { name: '재생 상태' })
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('일시정지')

    rerender(<PlaybackControls {...baseProps} isPlaying />)
    expect(screen.getByRole('status', { name: '재생 상태' })).toHaveTextContent('재생 중')
  })

  it('leaves focus styling to the shared :focus-visible rule', () => {
    const { container } = render(<PlaybackControls {...baseProps} />)

    for (const select of Array.from(container.querySelectorAll('select'))) {
      expect(select.className).not.toMatch(/focus:ring|focus:border/)
    }
  })
})
