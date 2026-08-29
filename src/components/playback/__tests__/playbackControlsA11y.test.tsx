/**
 * 재생 컨트롤의 접근 가능한 이름 (D-027).
 *
 * DS-2가 이 컴포넌트를 홈의 로그인 전 체험에 올리면서 두 결함이 드러났다. 전송 버튼은 이모지만
 * 담고 있어 스크린리더에 "버튼"으로만 읽혔고, 속도·모드 `<select>`는 옆의 `<label>`이 `htmlFor`로
 * 연결돼 있지 않아 이름이 없었다. CI의 axe 검사가 후자를 `select-name` 위반으로 잡았다.
 *
 * 둘 다 인증 뒤에 있을 때는 눈에 띄지 않았다. 다시 잃으면 CI보다 여기서 먼저 걸리게 한다.
 */
import { render, screen } from '@testing-library/react'
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

  it('leaves focus styling to the shared :focus-visible rule', () => {
    const { container } = render(<PlaybackControls {...baseProps} />)

    for (const select of Array.from(container.querySelectorAll('select'))) {
      expect(select.className).not.toMatch(/focus:ring|focus:border/)
    }
  })
})
