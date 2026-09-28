'use client'

import { useRef, useState, type FormEvent, type MouseEvent } from 'react'
import Link from 'next/link'
import { Badge, Button, Card, StatusState } from '@/components/ui'
import { usePublicSheetMusic } from '@/hooks/usePublicSheetMusic'
import type { PublicSheetMusicQuery, SheetMusicWithOwner } from '@/types/sheet-music'

interface PublicSheetMusicBrowserProps {
  onSheetMusicClick?: (sheetMusic: SheetMusicWithOwner) => void
  className?: string
}

/** Enough to fill four rows of the three-column grid before 더 보기. */
const PAGE_SIZE = 12

type SortBy = NonNullable<PublicSheetMusicQuery['sortBy']>

const SORTS: Array<[SortBy, string]> = [
  ['newest', '최신순'],
  ['oldest', '오래된순'],
  ['title', '제목순'],
  ['composer', '작곡가순'],
]

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

const fieldClass = 'w-full rounded-md border border-rule-strong bg-surface px-3 py-2 text-sm text-ink'

/**
 * The one place to find public sheets (#197, D-091). The explore page used to
 * offer this list twice — a browse tab and a search tab that, with no query,
 * showed the same sheets in the same order from a second endpoint. Search,
 * category and sort now sit above a single newest-first list, and everything
 * comes from `/api/sheet/public`.
 */
export default function PublicSheetMusicBrowser({
  onSheetMusicClick,
  className = ''
}: PublicSheetMusicBrowserProps) {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    params,
    data,
    loading,
    error,
    updateParams,
    triggerSearch,
    loadMore,
    hasMore,
    total
  } = usePublicSheetMusic({
    initialParams: { limit: PAGE_SIZE, sortBy: 'newest', offset: 0 },
    autoSearch: true,
    debounceMs: 500
  })

  // Parameters change from the handlers, never from an effect mirroring local
  // state: that mirror is what once sent a second request on every page open.
  const changeQuery = (value: string) => {
    setQuery(value)
    updateParams({ search: value.trim() || undefined, offset: 0 })
  }
  const changeCategory = (value: string) => {
    const next = value ? parseInt(value, 10) : undefined
    setCategoryId(next)
    updateParams({ categoryId: next, offset: 0 }, { immediate: true })
  }
  const changeSort = (value: SortBy) => {
    setSortBy(value)
    updateParams({ sortBy: value, offset: 0 }, { immediate: true })
  }
  // Clears what narrows the list; the order is a preference, not a filter.
  const clearConditions = () => {
    setQuery('')
    setCategoryId(undefined)
    updateParams({ search: undefined, categoryId: undefined, offset: 0 }, { immediate: true })
  }
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    triggerSearch()
  }

  // The card is a real link so keyboard, middle-click and open-in-new-tab all work.
  // When a caller supplies onSheetMusicClick we defer to it, so the existing
  // router-push navigation contract is unchanged — but only for a plain
  // activation. A modified click (Cmd/Ctrl/Shift/Alt) or a non-primary button is the
  // reader asking for a new tab or window, and swallowing it here would defeat the
  // reason these cards became links at all.
  const linkProps = (sheetMusic: SheetMusicWithOwner) => ({
    href: `/sheet/${sheetMusic.id}`,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (!onSheetMusicClick) return
      const wantsNewContext =
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
      if (wantsNewContext) return
      event.preventDefault()
      onSheetMusicClick(sheetMusic)
    }
  })

  const sheets = data?.sheetMusic ?? []
  const categories = data?.categories ?? []
  const narrowed = Boolean(params.search || params.categoryId)

  return (
    <div className={`public-sheet-music-browser ${className}`}>
      <form role="search" aria-label="공개 악보 찾기" onSubmit={handleSubmit} className="mb-6 space-y-3">
        <div className="flex gap-2">
          {/* The wrapper sets the width and the input fills it. A flexed input
              keeps its intrinsic width under WebKit's CSS zoom and widened the
              1440px page to 2153px at 200%. */}
          <div className="min-w-0 flex-1">
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={event => changeQuery(event.target.value)}
              placeholder="곡명 또는 저작자로 검색..."
              aria-label="곡명 또는 저작자로 검색"
              className={`${fieldClass} px-4`}
            />
          </div>
          <Button type="submit" variant="primary" className="shrink-0">검색</Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="min-w-0">
            <label htmlFor="explore-category" className="mb-1 block text-sm font-medium text-ink">카테고리</label>
            <select
              id="explore-category"
              value={categoryId ?? ''}
              onChange={event => changeCategory(event.target.value)}
              className={fieldClass}
            >
              <option value="">전체 카테고리</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name} ({category.count})</option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="explore-sort" className="mb-1 block text-sm font-medium text-ink">정렬</label>
            <select
              id="explore-sort"
              value={sortBy}
              onChange={event => changeSort(event.target.value as SortBy)}
              className={fieldClass}
            >
              {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
      </form>

      {error ? (
        <StatusState
          title="공개 악보를 불러오지 못했습니다"
          detail="잠시 연결이 끊겼습니다. 다시 시도해 주세요."
          tone="error"
          action={<Button variant="outline" size="sm" onClick={triggerSearch}>다시 시도</Button>}
        />
      ) : !data ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <span className="ml-3 text-ink-muted">악보를 불러오는 중...</span>
        </div>
      ) : (
        // Named for what it holds rather than its order: "최근 공개된 악보"
        // stops being true as soon as the reader sorts by title.
        <section aria-label="공개 악보 목록" aria-busy={loading}>
          {sheets.length > 0 ? (
            <>
              <p className="mb-3 text-sm text-ink-muted" aria-live="polite">공개 악보 {total.toLocaleString()}개</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sheets.map((sheetMusic) => (
                  <Link
                    key={sheetMusic.id}
                    {...linkProps(sheetMusic)}
                    className="group block"
                  >
                    {/* No stored preview image exists, so the card leads with the title
                        instead of a placeholder surface that implies one does. */}
                    <Card padding="none" className="h-full min-w-0 flex flex-col group-hover:shadow-md group-focus-visible:shadow-md transition-shadow duration-200">
                      <div className="flex flex-1 flex-col gap-1 p-4">
                        <h3
                          title={sheetMusic.title}
                          className="font-semibold text-base text-ink break-words line-clamp-2 group-hover:text-accent transition-colors"
                        >
                          {sheetMusic.title}
                        </h3>
                        <p className="text-sm text-ink-muted break-words line-clamp-1">
                          {sheetMusic.composer}
                        </p>
                        {sheetMusic.category && (
                          <div className="mt-1">
                            <Badge className="truncate">{sheetMusic.category.name}</Badge>
                          </div>
                        )}
                        <div className="flex-1" />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="flex min-w-0 items-center gap-1 text-xs text-ink-muted">
                            <span className="truncate">{sheetMusic.owner?.name || '익명'}</span>
                            <span aria-hidden="true">·</span>
                            <span className="shrink-0">{formatDate(sheetMusic.createdAt)}</span>
                          </p>
                          <span className="shrink-0 text-xs font-medium text-accent">연습 시작 →</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
              {hasMore && (
                <div className="py-6 text-center">
                  <Button variant="outline" onClick={loadMore} disabled={loading} aria-busy={loading}>
                    더 보기
                  </Button>
                </div>
              )}
            </>
          ) : narrowed ? (
            <StatusState
              title="조건에 맞는 악보가 없습니다"
              detail="검색어나 카테고리를 바꿔 다시 찾아보세요."
              action={<Button variant="outline" size="sm" onClick={() => { clearConditions(); searchInputRef.current?.focus() }}>조건 초기화</Button>}
            />
          ) : (
            <StatusState
              title="아직 공개된 악보가 없습니다"
              detail="공개 악보가 올라오면 여기에서 함께 연습할 수 있습니다."
              action={<Link href="/upload"><Button as="span">첫 악보 올리기</Button></Link>}
            />
          )}
        </section>
      )}
    </div>
  )
}
