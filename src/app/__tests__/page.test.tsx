/**
 * 홈의 DS-2 계약.
 *
 * 이전 버전은 "가로 스크롤되는 건반 미리보기가 키보드로 도달 가능한가"를 지켰다. 그 요소는
 * 사라졌다 — 정지한 `min-w-[800px]` 그림 대신 실제 플레이어가 들어왔고, 그 건반은 D-020의
 * 반응형 폭 계산으로 컨테이너에 맞춰지므로 가로 스크롤이 없다. 원래 우려는 특정 요소가 아니라
 * 일반 가드로 옮겼다.
 */
import { render, screen } from '@testing-library/react'
import Home from '../page'
import { HOME_SAMPLE_ANIMATION } from '@/fixtures/homeSample'
import { MAX_UPLOAD_MB } from '@/lib/upload/pdfInspection'

/**
 * 플레이어 자체는 DS-5 소유이고 자기 테스트가 있다. 여기서는 홈이 그것을 **샘플 데이터와 함께**
 * 놓는지만 본다. jsdom에는 레이아웃도 오디오도 없어 실물을 렌더하면 이 테스트가 홈이 아니라
 * 플레이어를 시험하게 된다.
 */
jest.mock('@/components/animation/FallingNotesPlayer', () => ({
  __esModule: true,
  default: ({ animationData }: { animationData: { title: string } }) => (
    <div data-testid="falling-notes-player" data-title={animationData.title} />
  ),
}))

describe('Home — 로그인 전 가치 전달 (DS-2)', () => {
  it('leads with what the user gets, not with the product name', () => {
    render(<Home />)
    expect(
      screen.getByRole('heading', { level: 1, name: /가지고 있는 PDF 악보를/ })
    ).toBeInTheDocument()
  })

  it('uses 내 악보로 시작하기 as the primary CTA (이슈 #76 완료 조건 2)', () => {
    render(<Home />)
    expect(screen.getByRole('link', { name: '내 악보로 시작하기' })).toHaveAttribute(
      'href',
      '/upload'
    )
  })

  it('plays a real sample rather than a still image', () => {
    render(<Home />)
    const player = screen.getByTestId('falling-notes-player')
    expect(player).toHaveAttribute('data-title', HOME_SAMPLE_ANIMATION.title)
  })

  it('names the sample piece so it is not mistaken for the visitor\'s own score', () => {
    render(<Home />)
    expect(
      screen.getByText(new RegExp(`샘플: ${HOME_SAMPLE_ANIMATION.title}`))
    ).toBeInTheDocument()
  })

  it('states the file limit and the wait before the visitor commits', () => {
    render(<Home />)
    expect(screen.getByText(new RegExp(`최대 ${MAX_UPLOAD_MB}MB`))).toBeInTheDocument()
    // 대기 시간은 CTA 옆 사실 목록과 3단계 설명 양쪽에 나온다. 둘 다 있어야 한다.
    expect(screen.getAllByText(/1~3분/).length).toBeGreaterThanOrEqual(2)
  })

  it('shows the three steps between a PDF and practice', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: '어떻게 되나요' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3)
  })
})

describe('Home — 접근성 가드', () => {
  it('never leaves a horizontally scrollable region without keyboard reach', () => {
    // WCAG 2.1.1. 스크롤되는 영역은 마우스 없이도 스크롤할 수 있어야 한다.
    const { container } = render(<Home />)
    const scrollers = container.querySelectorAll('[class*="overflow-x-auto"], [class*="overflow-x-scroll"]')

    for (const scroller of Array.from(scrollers)) {
      expect(scroller).toHaveAttribute('tabindex', '0')
    }
  })

  it('gives every heading a single h1', () => {
    render(<Home />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
