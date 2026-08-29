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

    expect(screen.getByRole('link', { name: '연습 시작' })).toHaveClass('w-full')
    expect(screen.getByRole('button', { name: `${sheetMusic.title} 제목 수정` }).parentElement).toHaveClass('grid', 'grid-cols-3')
  })
})
