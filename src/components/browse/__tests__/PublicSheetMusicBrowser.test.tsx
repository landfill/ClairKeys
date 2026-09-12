import { render, screen, waitFor, within } from '@testing-library/react'
import PublicSheetMusicBrowser from '../PublicSheetMusicBrowser'
import type { SheetMusicWithOwner } from '@/types/sheet-music'

const sheet = (id: number, title: string, composer: string): SheetMusicWithOwner => ({
  id,
  title,
  composer,
  userId: `user-${id}`,
  categoryId: 7,
  category: { id: 7, name: '클래식' },
  isPublic: true,
  animationDataUrl: `https://example.test/${id}.json`,
  provenance: 'omr',
  createdAt: new Date('2026-03-04T00:00:00Z'),
  updatedAt: new Date('2026-03-04T00:00:00Z'),
  owner: { id: `user-${id}`, name: `업로더${id}` },
})

const sheets = [
  sheet(1, '아주 긴 제목을 가진 공개 악보 아라베스크 제1번 다장조', '드뷔시'),
  sheet(2, '월광 소나타', '베토벤'),
  sheet(3, '짐노페디 제1번', '사티'),
  sheet(4, '아라베스크', '부르그뮐러'),
]

const mockFetchOk = () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ sheetMusic: sheets }),
  }) as unknown as typeof fetch
}

const sectionFor = (heading: string) =>
  screen.getByRole('heading', { name: heading }).closest('section') as HTMLElement

describe('PublicSheetMusicBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchOk()
  })

  it('keeps the three existing sections and their data order', async () => {
    render(<PublicSheetMusicBrowser />)

    await waitFor(() => expect(screen.getByRole('heading', { name: '추천 악보' })).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: '인기 악보' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '최신 악보' })).toBeInTheDocument()

    // Section sizes and ordering are the preserved contract: 3 / 4 / 8 from the same feed.
    // Assert the hrefs rather than rendered text, so ordering stays verifiable independently
    // of presentation details such as the screen-reader-only rank prefix.
    const hrefsIn = (heading: string) =>
      Array.from(sectionFor(heading).querySelectorAll('a[href]')).map((n) => n.getAttribute('href'))

    expect(hrefsIn('추천 악보')).toEqual(['/sheet/1', '/sheet/2', '/sheet/3'])
    expect(hrefsIn('인기 악보')).toEqual(['/sheet/1', '/sheet/2', '/sheet/3', '/sheet/4'])
    expect(hrefsIn('최신 악보')).toEqual(['/sheet/1', '/sheet/2', '/sheet/3', '/sheet/4'])

    // Every section still renders each sheet's own title.
    for (const heading of ['추천 악보', '인기 악보', '최신 악보']) {
      expect(within(sectionFor(heading)).getByText(sheets[1].title)).toBeInTheDocument()
    }
  })

  it('never renders a preview surface for sheets that have no preview image', async () => {
    render(<PublicSheetMusicBrowser />)
    await waitFor(() => expect(screen.getByRole('heading', { name: '추천 악보' })).toBeInTheDocument())

    // The audit rejected the large empty placeholder that claimed a preview existed.
    expect(screen.queryByText('악보 미리보기')).not.toBeInTheDocument()
    expect(screen.queryByText('SHEET MUSIC')).not.toBeInTheDocument()
  })

  it('presents composer, category and uploader for every card in every section', async () => {
    render(<PublicSheetMusicBrowser />)
    await waitFor(() => expect(screen.getByRole('heading', { name: '추천 악보' })).toBeInTheDocument())

    for (const heading of ['추천 악보', '인기 악보', '최신 악보']) {
      const section = sectionFor(heading)
      expect(within(section).getAllByText('드뷔시').length).toBeGreaterThan(0)
      expect(within(section).getAllByText('클래식').length).toBeGreaterThan(0)
      expect(within(section).getAllByText('업로더1').length).toBeGreaterThan(0)
    }
  })

  it('exposes no control that does nothing when activated', async () => {
    render(<PublicSheetMusicBrowser />)
    await waitFor(() => expect(screen.getByRole('heading', { name: '추천 악보' })).toBeInTheDocument())

    // "전체 보기" had no handler and no destination; an inert control fails the action hierarchy.
    expect(screen.queryByRole('button', { name: '전체 보기' })).not.toBeInTheDocument()
  })

  it('uses design tokens instead of hardcoded palette classes', async () => {
    const { container } = render(<PublicSheetMusicBrowser />)
    await waitFor(() => expect(screen.getByRole('heading', { name: '추천 악보' })).toBeInTheDocument())

    const forbidden = /(^|\s)(bg-white|text-gray-\d{3}|border-gray-\d{3}|text-blue-\d{3}|border-blue-\d{3}|from-blue-\d{2,3}|to-indigo-\d{2,3}|from-green-\d{2,3}|to-blue-\d{2,3}|bg-yellow-\d{3}|bg-gray-\d{3}|bg-amber-\d{3}|bg-blue-\d{3})(\s|$)/
    const offenders = Array.from(container.querySelectorAll<HTMLElement>('[class]'))
      .map((n) => n.className)
      .filter((c) => typeof c === 'string' && forbidden.test(c))

    expect(offenders).toEqual([])
  })

  it('gives every card an accessible link to its sheet rather than a bare click handler', async () => {
    render(<PublicSheetMusicBrowser />)
    await waitFor(() => expect(screen.getByRole('heading', { name: '추천 악보' })).toBeInTheDocument())

    const links = screen.getAllByRole('link', { name: /월광 소나타/ })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/sheet/2')
    }
  })

  it('still reports an error state with a retry action', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
    render(<PublicSheetMusicBrowser />)

    await waitFor(() =>
      expect(screen.getByText('공개 악보를 불러오지 못했습니다')).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('still reports the empty state when no public sheet exists', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sheetMusic: [] }),
    }) as unknown as typeof fetch
    render(<PublicSheetMusicBrowser />)

    await waitFor(() =>
      expect(screen.getByText('아직 공개된 악보가 없습니다')).toBeInTheDocument(),
    )
  })
})
