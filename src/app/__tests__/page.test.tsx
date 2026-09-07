/**
 * Home static practice example and entry links.
 * The image is a labeled capture of the existing player; this page mounts no
 * live player and starts no audio. Player behavior is tested separately.
 */
import { render, screen } from '@testing-library/react'
import Home from '../page'
import { MAX_UPLOAD_MB } from '@/lib/upload/pdfInspection'

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

  it('shows a labeled static practice example without mounting a player', () => {
    render(<Home />)
    expect(screen.getByTestId('falling-notes-result-area')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /낙하 노트와 피아노 건반/ })).toBeInTheDocument()
    expect(screen.getByText('연습 화면 예시')).toBeInTheDocument()
    expect(screen.queryByTestId('falling-notes-player')).not.toBeInTheDocument()
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
