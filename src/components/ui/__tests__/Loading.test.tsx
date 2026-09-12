import { render, screen } from '@testing-library/react'
import Loading from '../Loading'

/**
 * 이슈 #146 stage 4. DS-7은 빈 상태와 오류 상태를 `StatusState`로 통일했지만 로딩 상태는
 * 그 정리에 들어가지 않았다. 화면을 보지 않는 사람에게 아무 이름도 없는 회전 아이콘은
 * "아무 일도 일어나지 않는 화면"과 구별되지 않는다.
 */
describe('Loading', () => {
  it('announces that something is loading', () => {
    render(<Loading />)

    const status = screen.getByRole('status')
    expect(status).toHaveAccessibleName('불러오는 중')
  })

  it('uses the given text as the announced name instead of repeating a generic one', () => {
    render(<Loading text="악보를 불러오는 중" />)

    expect(screen.getByRole('status')).toHaveAccessibleName('악보를 불러오는 중')
    expect(screen.getByText('악보를 불러오는 중')).toBeInTheDocument()
  })

  it('draws the spinner with the palette tokens the rest of the app uses', () => {
    const { container } = render(<Loading />)

    // `--ck-*` 토큰만 쓴다는 것이 이 이슈의 공통 시각 규칙이다. 로딩만 원시 팔레트를 쓰면
    // 같은 화면 안에서 강조색이 두 가지가 된다.
    const spinner = container.querySelector('svg')
    expect(spinner).toHaveClass('text-accent')
    expect(spinner?.getAttribute('class')).not.toMatch(/text-blue-/)
    expect(spinner).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps the optional text on the muted ink token', () => {
    render(<Loading text="불러오는 중" />)

    const text = screen.getByText('불러오는 중')
    expect(text).toHaveClass('text-ink-muted')
    expect(text.className).not.toMatch(/text-gray-/)
  })
})
