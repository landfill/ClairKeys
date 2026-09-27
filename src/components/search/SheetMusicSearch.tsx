'use client'

import { useState, useEffect, useRef, type MouseEvent } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Badge, Button, Card, StatusState } from '@/components/ui'
import { useSheetMusicSearch } from '@/hooks/useSheetMusicSearch'
import { SheetMusicWithOwner } from '@/types/sheet-music'

interface SheetMusicSearchProps {
  onResultClick?: (sheetMusic: SheetMusicWithOwner) => void
  showFilters?: boolean
  defaultPublicOnly?: boolean
  className?: string
}

export default function SheetMusicSearch({
  onResultClick,
  showFilters = true,
  defaultPublicOnly = true,
  className = ''
}: SheetMusicSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>()
  const [publicFilter, setPublicFilter] = useState<boolean | undefined>(defaultPublicOnly ? true : undefined)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'composer'>('newest')
  const searchInputRef = useRef<HTMLInputElement>(null)
  // Private sheets only exist for their owner, so the visibility filter and the
  // private count mean nothing to a signed-out reader.
  const { status } = useSession()
  const isSignedIn = status === 'authenticated'

  const {
    data,
    loading,
    error,
    updateParams,
    triggerSearch,
    loadMore,
    hasResults,
    hasMore,
    total
  } = useSheetMusicSearch({
    initialParams: {
      isPublic: publicFilter,
      limit: 10,
      sortBy,
      sortOrder: 'desc',
      offset: 0
    },
    autoSearch: true,
    debounceMs: 500
  })

  const categories = data?.filters?.categories ?? []

  // Update search parameters when filters change
  useEffect(() => {
    updateParams({
      search: searchQuery || undefined,
      categoryId: selectedCategory,
      isPublic: publicFilter,
      sortBy,
      offset: 0 // Reset to first page when search changes
    })
  }, [searchQuery, selectedCategory, publicFilter, sortBy, updateParams])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    triggerSearch()
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Same contract as the explore cards: a real link, and a plain activation defers to
  // the caller while a modified click is left to the browser for a new tab.
  const handleResultClick = (event: MouseEvent<HTMLAnchorElement>, sheetMusic: SheetMusicWithOwner) => {
    if (!onResultClick) return
    const wantsNewContext =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
    if (wantsNewContext) return
    event.preventDefault()
    onResultClick(sheetMusic)
  }

  const fieldClass = 'w-full rounded-md border border-rule-strong bg-surface px-3 py-2 text-ink'

  return (
    <div className={`sheet-music-search ${className}`}>
      {/* Search Header */}
      <div className="mb-6">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          {/* Main Search Input */}
          <div className="flex space-x-2">
            <div className="flex-1">
              <input
                type="text"
                ref={searchInputRef}
                placeholder="곡명 또는 저작자로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="곡명 또는 저작자로 검색"
                className={`${fieldClass} rounded-full px-4`}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? '검색중...' : '검색'}
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className={`grid grid-cols-1 gap-4 ${isSignedIn ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              {/* Category Filter */}
              <div>
                <label htmlFor="search-category" className="block text-sm font-medium text-ink mb-1">
                  카테고리
                </label>
                <select
                  id="search-category"
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : undefined)}
                  className={fieldClass}
                >
                  <option value="">전체 카테고리</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Public/Private Filter */}
              {isSignedIn && <div>
                <label htmlFor="search-visibility" className="block text-sm font-medium text-ink mb-1">
                  공개 설정
                </label>
                <select
                  id="search-visibility"
                  value={publicFilter === undefined ? 'all' : publicFilter.toString()}
                  onChange={(e) => {
                    const value = e.target.value
                    setPublicFilter(value === 'all' ? undefined : value === 'true')
                  }}
                  className={fieldClass}
                >
                  <option value="all">전체</option>
                  <option value="true">공개만</option>
                  <option value="false">내 비공개만</option>
                </select>
              </div>}

              {/* Sort Filter */}
              <div>
                <label htmlFor="search-sort" className="block text-sm font-medium text-ink mb-1">
                  정렬
                </label>
                <select
                  id="search-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title' | 'composer')}
                  className={fieldClass}
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="title">제목순</option>
                  <option value="composer">작곡가순</option>
                </select>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Search Stats */}
      {data && (
        <div className="mb-4 text-sm text-ink-muted">
          총 {total.toLocaleString()}개의 악보를 찾았습니다
          {isSignedIn && data.filters && (
            <span className="ml-2">
              (공개: {data.filters.totalPublic}, 비공개: {data.filters.totalPrivate})
            </span>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <StatusState className="mb-4" title="악보를 검색하지 못했습니다" detail="검색 서비스에 잠시 문제가 있습니다. 다시 시도해 주세요." tone="error" action={<Button variant="outline" size="sm" onClick={triggerSearch}>다시 시도</Button>} />
      )}

      {/* Results */}
      <div className="space-y-4">
        {hasResults ? (
          <>
            {data!.sheetMusic.map((sheetMusic) => (
              <Link
                key={sheetMusic.id}
                href={`/sheet/${sheetMusic.id}`}
                onClick={(event) => handleResultClick(event, sheetMusic)}
                className="group block"
              >
                <Card padding="none" className="flex min-w-0 items-start justify-between gap-4 p-4 group-hover:shadow-md group-focus-visible:shadow-md transition-shadow">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-ink break-words group-hover:text-accent transition-colors">
                      {sheetMusic.title}
                    </h3>
                    <p className="text-sm text-ink-muted break-words">
                      {sheetMusic.composer}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      {sheetMusic.category && (
                        <Badge className="truncate">{sheetMusic.category.name}</Badge>
                      )}
                      {isSignedIn && (
                        <Badge>{sheetMusic.isPublic ? '공개' : '비공개'}</Badge>
                      )}
                      {sheetMusic.owner && (
                        <span className="truncate">{sheetMusic.owner.name || '익명'}</span>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">{formatDate(sheetMusic.createdAt)}</span>
                    </div>
                  </div>

                  <span className="shrink-0 self-center text-xs font-medium text-accent">연습 시작 →</span>
                </Card>
              </Link>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center py-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? '로딩 중...' : '더 보기'}
                </Button>
              </div>
            )}
          </>
        ) : !loading && (
          <StatusState
            title={searchQuery ? '검색 결과가 없습니다' : '검색어를 입력해 주세요'}
            detail={searchQuery ? '다른 검색어로 다시 찾아보세요.' : '곡명이나 저작자로 악보를 찾아보세요.'}
            action={searchQuery
              ? <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>검색어 지우기</Button>
              : <Button variant="outline" size="sm" onClick={() => searchInputRef.current?.focus()}>검색어 입력하기</Button>}
          />
        )}
      </div>

      {/* Loading State */}
      {loading && !data && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <p className="mt-2 text-ink-muted">검색 중...</p>
        </div>
      )}
    </div>
  )
}
