'use client'

import { useState, useEffect, useRef } from 'react'
import { Badge, Button, StatusState } from '@/components/ui'
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  카테고리
                </label>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  공개 설정
                </label>
                <select
                  value={publicFilter === undefined ? 'all' : publicFilter.toString()}
                  onChange={(e) => {
                    const value = e.target.value
                    setPublicFilter(value === 'all' ? undefined : value === 'true')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체</option>
                  <option value="true">공개만</option>
                  <option value="false">내 비공개만</option>
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  정렬
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title' | 'composer')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="mb-4 text-sm text-gray-600">
          총 {total.toLocaleString()}개의 악보를 찾았습니다
          {data.filters && (
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
              <div
                key={sheetMusic.id}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => onResultClick?.(sheetMusic)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {sheetMusic.title}
                    </h3>
                    <p className="text-gray-600 mb-2">
                      작곡: {sheetMusic.composer}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {sheetMusic.category && (
                        <Badge tone="info">
                          {sheetMusic.category.name}
                        </Badge>
                      )}
                      
                      <Badge>
                        {sheetMusic.isPublic ? '공개' : '비공개'}
                      </Badge>
                      
                      {sheetMusic.owner && (
                        <span>
                          업로드: {sheetMusic.owner.name || '알 수 없음'}
                        </span>
                      )}
                      
                      <span>
                        {formatDate(sheetMusic.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onResultClick?.(sheetMusic)
                      }}
                    >
                      재생
                    </Button>
                  </div>
                </div>
              </div>
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">검색 중...</p>
        </div>
      )}
    </div>
  )
}
