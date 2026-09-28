import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

type Page = { sheetMusic: SheetMusicWithOwner[]; total?: number; hasMore?: boolean }

/** Answers each request from `pages(url)`, the way the public list endpoint would. */
const serve = (pages: (url: URL) => Page = () => ({ sheetMusic: sheets })) => {
  const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost')
    const offset = Number(url.searchParams.get('offset') || 0)
    const page = pages(url)
    return {
      ok: true,
      json: async () => ({
        success: true,
        sheetMusic: page.sheetMusic,
        pagination: {
          total: page.total ?? page.sheetMusic.length,
          limit: 12,
          offset,
          hasMore: page.hasMore ?? false,
        },
        ...(offset === 0 ? { categories: [{ id: 7, name: '클래식', count: 4 }, { id: 9, name: '재즈', count: 1 }] } : {}),
      }),
    } as Response
  })
  global.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

const requested = (fetchMock: jest.Mock) =>
  fetchMock.mock.calls.map(([input]) => new URL(String(input), 'http://localhost'))

const list = () => screen.getByRole('region', { name: '공개 악보 목록' })
const loaded = () => waitFor(() => expect(within(list()).getAllByRole('link').length).toBeGreaterThan(0))

describe('PublicSheetMusicBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    serve()
  })

  // #197: one screen, one list, one request when it opens.
  it('opens with a single request to the public list and shows each sheet once', async () => {
    const fetchMock = serve()
    render(<PublicSheetMusicBrowser />)
    await loaded()

    const urls = requested(fetchMock)
    expect(urls).toHaveLength(1)
    expect(urls[0].pathname).toBe('/api/sheet/public')
    expect(urls[0].searchParams.get('sortBy')).toBe('newest')

    const hrefs = within(list()).getAllByRole('link').map((n) => n.getAttribute('href'))
    expect(hrefs).toEqual(['/sheet/1', '/sheet/2', '/sheet/3', '/sheet/4'])
    expect(screen.getByText('공개 악보 4개')).toBeInTheDocument()

    // "추천"/"인기" were slices of the same newest-first feed (D-080).
    expect(screen.queryByRole('heading', { name: '추천 악보' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '인기 악보' })).not.toBeInTheDocument()
  })

  it('offers search, category and sort on the same screen as the list', async () => {
    const fetchMock = serve()
    render(<PublicSheetMusicBrowser />)
    await loaded()

    expect(screen.getByRole('searchbox', { name: '곡명 또는 저작자로 검색' })).toBeInTheDocument()
    const category = screen.getByRole('combobox', { name: '카테고리' })
    expect(within(category).getAllByRole('option').map(o => o.textContent))
      .toEqual(['전체 카테고리', '클래식 (4)', '재즈 (1)'])

    // A choice from a list is a finished decision; only typing waits out the debounce.
    fireEvent.change(category, { target: { value: '9' } })
    await waitFor(() => expect(requested(fetchMock).at(-1)?.searchParams.get('categoryId')).toBe('9'))

    fireEvent.change(screen.getByRole('combobox', { name: '정렬' }), { target: { value: 'composer' } })
    await waitFor(() => expect(requested(fetchMock).at(-1)?.searchParams.get('sortBy')).toBe('composer'))
    // The earlier choice stays applied: conditions live on this one screen.
    expect(requested(fetchMock).at(-1)?.searchParams.get('categoryId')).toBe('9')
    expect(screen.getByRole('combobox', { name: '카테고리' })).toHaveValue('9')
  })

  it('searches what the reader types', async () => {
    const fetchMock = serve()
    render(<PublicSheetMusicBrowser />)
    await loaded()

    fireEvent.change(screen.getByRole('searchbox', { name: '곡명 또는 저작자로 검색' }), { target: { value: '월광' } })
    await waitFor(() => expect(requested(fetchMock).at(-1)?.searchParams.get('search')).toBe('월광'))
  })

  it('never offers the private-visibility filter the search tab had', async () => {
    render(<PublicSheetMusicBrowser />)
    await loaded()

    // A reader's own private sheets are found in /library, not on the public page.
    expect(screen.queryByRole('combobox', { name: '공개 설정' })).not.toBeInTheDocument()
    expect(screen.queryByText('비공개')).not.toBeInTheDocument()
  })

  it('appends the next page under 더 보기', async () => {
    const fetchMock = serve(url => Number(url.searchParams.get('offset') || 0) === 0
      ? { sheetMusic: sheets, total: 5, hasMore: true }
      : { sheetMusic: [sheet(5, '트로이메라이', '슈만')], total: 5 })
    render(<PublicSheetMusicBrowser />)
    await loaded()

    fireEvent.click(screen.getByRole('button', { name: '더 보기' }))
    await waitFor(() => expect(within(list()).getAllByRole('link')).toHaveLength(5))
    expect(requested(fetchMock).at(-1)?.searchParams.get('offset')).toBe('4')
    expect(screen.queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument()
    // The second page carries no category list; the filter keeps the first one.
    expect(within(screen.getByRole('combobox', { name: '카테고리' })).getAllByRole('option')).toHaveLength(3)
  })

  it('offers the same practice action on every card', async () => {
    render(<PublicSheetMusicBrowser />)
    await loaded()

    for (const link of within(list()).getAllByRole('link')) {
      expect(within(link).getByText('연습 시작 →')).toBeInTheDocument()
    }
  })

  it('never renders a preview surface for sheets that have no preview image', async () => {
    render(<PublicSheetMusicBrowser />)
    await loaded()

    expect(screen.queryByText('악보 미리보기')).not.toBeInTheDocument()
    expect(screen.queryByText('SHEET MUSIC')).not.toBeInTheDocument()
  })

  it('presents composer, category and uploader on the cards', async () => {
    render(<PublicSheetMusicBrowser />)
    await loaded()

    const region = list()
    expect(within(region).getAllByText('드뷔시').length).toBeGreaterThan(0)
    expect(within(region).getAllByText('클래식').length).toBeGreaterThan(0)
    expect(within(region).getAllByText('업로더1').length).toBeGreaterThan(0)
  })

  it('exposes no control that does nothing when activated', async () => {
    render(<PublicSheetMusicBrowser />)
    await loaded()

    expect(screen.queryByRole('button', { name: '전체 보기' })).not.toBeInTheDocument()
  })

  it('uses design tokens instead of hardcoded palette classes', async () => {
    const { container } = render(<PublicSheetMusicBrowser />)
    await loaded()

    const forbidden = /(^|\s)(bg-white|text-gray-\d{3}|border-gray-\d{3}|text-blue-\d{3}|border-blue-\d{3}|from-blue-\d{2,3}|to-indigo-\d{2,3}|from-green-\d{2,3}|to-blue-\d{2,3}|bg-yellow-\d{3}|bg-gray-\d{3}|bg-amber-\d{3}|bg-blue-\d{3})(\s|$)/
    const offenders = Array.from(container.querySelectorAll<HTMLElement>('[class]'))
      .map((n) => n.className)
      .filter((c) => typeof c === 'string' && forbidden.test(c))

    expect(offenders).toEqual([])
  })

  it('gives every card an accessible link to its sheet rather than a bare click handler', async () => {
    render(<PublicSheetMusicBrowser />)
    await loaded()

    const links = screen.getAllByRole('link', { name: /월광 소나타/ })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/sheet/2')
    }
  })

  it('never suppresses the repository-wide keyboard focus ring', async () => {
    const { container } = render(<PublicSheetMusicBrowser />)
    await loaded()

    const suppressed = Array.from(container.querySelectorAll<HTMLElement>('[class]'))
      .map((n) => n.className)
      .filter((c) => typeof c === 'string' && /outline-none/.test(c))

    expect(suppressed).toEqual([])
  })

  it('leaves a modified click to the browser so a card can open in a new tab', async () => {
    const onSheetMusicClick = jest.fn()
    render(<PublicSheetMusicBrowser onSheetMusicClick={onSheetMusicClick} />)
    await loaded()

    const card = screen.getAllByRole('link', { name: /월광 소나타/ })[0]

    for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const) {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
      Object.defineProperty(event, modifier, { value: true })
      fireEvent(card, event)
      expect(onSheetMusicClick).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(false)
    }

    const middle = new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 })
    fireEvent(card, middle)
    expect(onSheetMusicClick).not.toHaveBeenCalled()

    fireEvent.click(card)
    expect(onSheetMusicClick).toHaveBeenCalledTimes(1)
  })

  it('still reports an error state with a retry action', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, statusText: 'Server Error' })
    global.fetch = fetchMock as unknown as typeof fetch
    render(<PublicSheetMusicBrowser />)

    await waitFor(() =>
      expect(screen.getByText('공개 악보를 불러오지 못했습니다')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('still reports the empty state when no public sheet exists', async () => {
    serve(() => ({ sheetMusic: [] }))
    render(<PublicSheetMusicBrowser />)

    await waitFor(() =>
      expect(screen.getByText('아직 공개된 악보가 없습니다')).toBeInTheDocument(),
    )
  })

  it('tells a narrowed search apart from an empty site and offers the way back', async () => {
    const fetchMock = serve(url => url.searchParams.get('search') ? { sheetMusic: [] } : { sheetMusic: sheets })
    render(<PublicSheetMusicBrowser />)
    await loaded()

    const box = screen.getByRole('searchbox', { name: '곡명 또는 저작자로 검색' })
    fireEvent.change(box, { target: { value: '없는 곡' } })
    await waitFor(() => expect(screen.getByText('조건에 맞는 악보가 없습니다')).toBeInTheDocument())
    expect(screen.queryByText('아직 공개된 악보가 없습니다')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '조건 초기화' }))
    await loaded()
    expect(box).toHaveValue('')
    expect(requested(fetchMock).at(-1)?.searchParams.get('search')).toBeNull()
  })
})
