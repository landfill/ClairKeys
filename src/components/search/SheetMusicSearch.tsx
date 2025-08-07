'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { useSheetMusicSearch } from '@/hooks/useSheetMusicSearch'
import { useCategories } from '@/hooks/useCategories'

interface SheetMusicSearchProps {
  onResultClick?: (sheetMusic: any) => void
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

  const { data: categories } = useCategories()
  
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
      sortOrder: 'desc'
    },
    autoSearch: true,
    debounceMs: 500
  })

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
                  {categories?.map(category => (
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
                  onChange={(e) => setSortBy(e.target.value as any)}
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
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">검색 중 오류가 발생했습니다: {error}</p>
        </div>
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
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {sheetMusic.category.name}
                        </span>
                      )}
                      
                      <span className={`px-2 py-1 rounded ${
                        sheetMusic.isPublic 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sheetMusic.isPublic ? '공개' : '비공개'}
                      </span>
                      
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
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? '검색 결과가 없습니다' : '검색어를 입력해보세요'}
          </div>
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