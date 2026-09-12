import { render, screen } from '@testing-library/react'
import { SheetMusicCard } from '../SheetMusicCard'

describe('SheetMusicCard', () => {
  const sheetMusic = {
    id: 27,
    title: 'Princess_Mononoke_Ashitaka_and_San_print_300dpi',
    composer: '조',
    userId: 'user-1',
    categoryId: 2,
    category: { id: 2, name: '애니메이션', userId: 'user-1', createdAt: new Date('2026-08-28') },
    isPublic: true,
    animationDataUrl: 'https://storage.example/score.json',
    provenance: 'omr' as const,
    availability: 'ready' as const,
    createdAt: new Date('2026-08-28'),
    updatedAt: new Date('2026-08-28'),
  }

  it('keeps public visibility neutral and reserves the green badge for readiness', () => {
    render(<SheetMusicCard sheetMusic={sheetMusic} availability="ready" />)

    expect(screen.getByText('🌍 공개')).toHaveClass('bg-surface-muted', 'text-ink')
    expect(screen.getByText('연습 가능')).toHaveClass('bg-state-ready', 'text-on-accent')
  })

  /**
   * 이슈 #146 stage 4. 카드가 여러 장 있는 목록에서 "수정"만 곡명을 달고 "이동"·"삭제"·주 동작은
   * 달지 않으면, 화면을 보지 않는 사람에게는 같은 이름의 동작이 카드 수만큼 반복된다. 어느
   * 악보의 삭제인지 이름만으로 골라낼 수 없다.
   */
  it('names every action after the sheet it acts on', () => {
    render(
      <SheetMusicCard
        sheetMusic={sheetMusic}
        availability="ready"
        categories={[sheetMusic.category]}
        showMoveOptions={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )

    expect(screen.getByRole('link', { name: `${sheetMusic.title} 연습 시작` })).toHaveAttribute('href', '/sheet/27')
    expect(screen.getByRole('button', { name: `${sheetMusic.title} 제목 수정` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `${sheetMusic.title} 카테고리 이동` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `${sheetMusic.title} 삭제` })).toBeInTheDocument()

    // 화면에 보이는 글자는 그대로다 — 이름만 길어지고 표현은 바뀌지 않는다.
    expect(screen.getByText('연습 시작')).toBeInTheDocument()
    expect(screen.getByText('이동')).toBeInTheDocument()
    expect(screen.getByText('삭제')).toBeInTheDocument()
  })

  /**
   * 처리 중 카드의 주 동작만 `flex-1`을 들고 있었다. 부모가 flex가 아니라 아무 효과가 없고,
   * `min-h-11`이 없어 다른 상태보다 낮다. 같은 자리의 같은 역할이 상태에 따라 크기가 달라지면
   * 변환이 끝나는 순간 카드가 흔들린다. 실제 높이는 E2E가 잰다.
   */
  it('keeps the processing action the same shape as the playable one', () => {
    const { rerender } = render(<SheetMusicCard sheetMusic={sheetMusic} availability="ready" />)
    const readyClasses = screen.getByRole('link', { name: `${sheetMusic.title} 연습 시작` }).firstElementChild?.className ?? ''

    rerender(<SheetMusicCard sheetMusic={{ ...sheetMusic, animationDataUrl: '' }} availability="processing" />)
    const processing = screen.getByRole('button', { name: `${sheetMusic.title} 처리 중` })

    for (const shape of ['w-full', 'min-h-11', 'whitespace-nowrap']) {
      expect(readyClasses).toContain(shape)
      expect(processing).toHaveClass(shape)
    }
    expect(processing.className).not.toContain('flex-1')
    expect(processing).toBeDisabled()
  })

  it('separates the primary practice action from the evenly sized management actions', () => {
    render(
      <SheetMusicCard
        sheetMusic={sheetMusic}
        availability="ready"
        categories={[sheetMusic.category]}
        showMoveOptions={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )

    expect(screen.getByRole('link', { name: `${sheetMusic.title} 연습 시작` })).toHaveClass('w-full')
    expect(screen.getByRole('button', { name: `${sheetMusic.title} 제목 수정` }).parentElement).toHaveClass('grid', 'grid-cols-3')
  })
})
