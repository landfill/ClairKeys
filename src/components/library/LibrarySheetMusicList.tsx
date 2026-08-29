'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useSheetMusic } from '@/hooks/useSheetMusic'
import { useCategories } from '@/hooks/useCategories'
import { SheetMusicCard } from '@/components/sheet/SheetMusicCard'
import type { SheetMusicWithCategory } from '@/types/sheet-music'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'

interface LibrarySheetMusicListProps {
  selectedCategoryId?: number | null
  searchQuery?: string
  sortBy?: 'recent' | 'name' | 'created'
  showCategorySelector?: boolean
  onCategorySelect?: (categoryId: number | null) => void
  onSheetMusicMove?: (sheetMusicId: number, newCategoryId: number | null) => void
  onCategoryChange?: () => void
}

export function LibrarySheetMusicList({
  selectedCategoryId = null,
  searchQuery = '',
  sortBy = 'recent',
  showCategorySelector = false,
  onCategorySelect,
  onSheetMusicMove,
  onCategoryChange: _onCategoryChange
}: LibrarySheetMusicListProps) {
  const { sheetMusic, loading: sheetMusicLoading, fetchUserSheetMusic, updateSheetMusic, deleteSheetMusic } = useSheetMusic()
  const { categories, loading: categoriesLoading } = useCategories()
  const [editingSheet, setEditingSheet] = useState<SheetMusicWithCategory | null>(null)
  const [title, setTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchUserSheetMusic({
          categoryId: selectedCategoryId || undefined,
          search: searchQuery || undefined
        })
      } catch (error) {
        console.error('Failed to load sheet music:', error)
      }
    }
    
    loadData()
  }, [selectedCategoryId, searchQuery, fetchUserSheetMusic])

  // 필터링 및 정렬
  const filteredAndSortedSheetMusic = sheetMusic
    .filter(sheet => {
      // 검색 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          sheet.title.toLowerCase().includes(query) ||
          (sheet.composer && sheet.composer.toLowerCase().includes(query))
        )
      }
      return true
    })
    .sort((a, b) => {
      // 정렬 로직
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title)
        case 'created':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'recent':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })

  // 핸들러 함수들
  const handleMoveSheetMusic = async (sheetMusicId: number, newCategoryId: number | null) => {
    try {
      await updateSheetMusic(sheetMusicId, { categoryId: newCategoryId })
      onSheetMusicMove?.(sheetMusicId, newCategoryId)
      // 새로고침
      await fetchUserSheetMusic({
        categoryId: selectedCategoryId || undefined,
        search: searchQuery || undefined
      })
    } catch (error) {
      console.error('Failed to move sheet music:', error)
    }
  }

  const handleDeleteSheetMusic = async (sheetMusicId: number) => {
    try {
      setErrorMessage(null)
      await deleteSheetMusic(sheetMusicId)
      // 새로고침
      await fetchUserSheetMusic({
        categoryId: selectedCategoryId || undefined,
        search: searchQuery || undefined
      })
    } catch (error) {
      console.error('Failed to delete sheet music:', error)
      setErrorMessage('악보를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  const openTitleEditor = (sheet: SheetMusicWithCategory) => {
    setTitle(sheet.title)
    setEditingSheet(sheet)
  }

  const saveTitle = async (event: FormEvent) => {
    event.preventDefault()
    if (!editingSheet || !title.trim()) return

    try {
      setErrorMessage(null)
      await updateSheetMusic(editingSheet.id, { title: title.trim() })
      setEditingSheet(null)
    } catch (error) {
      console.error('Failed to update sheet music title:', error)
      setErrorMessage('제목을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  // 로딩 상태
  if (sheetMusicLoading || categoriesLoading) {
    return <Loading />
  }

  // 빈 상태
  if (filteredAndSortedSheetMusic.length === 0) {
    return (
      <div className="text-center py-16 text-ink-muted">
        <div className="text-6xl mb-4">🎵</div>
        <h3 className="text-lg font-medium mb-2">
          {searchQuery ? '검색 결과가 없습니다' : '악보가 없습니다'}
        </h3>
        <p className="text-sm">
          {searchQuery ? '다른 검색어로 시도해보세요' : '첫 번째 악보를 업로드해보세요!'}
        </p>
        {!searchQuery && (
          <a href="/upload" className="inline-flex mt-6 px-4 py-2 rounded-md bg-accent text-on-accent hover:bg-accent-hover">
            새 악보 업로드
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {errorMessage && (
        <p role="alert" className="rounded-md border border-state-error bg-surface px-4 py-3 text-sm text-ink">
          {errorMessage}
        </p>
      )}
      {/* 카테고리 선택 UI */}
      {showCategorySelector && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">카테고리 선택</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategorySelect?.(category.id)}
                className={`
                  p-3 rounded-lg border-2 transition-colors text-left
                  ${selectedCategoryId === category.id
                    ? 'border-accent bg-surface-muted text-ink'
                    : 'border-rule bg-surface hover:bg-surface-muted'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">📁</span>
                  <span className="text-sm font-medium truncate">{category.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 악보 그리드 */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-ink">
            {selectedCategoryId === null 
              ? '전체 악보' 
              : categories.find(c => c.id === selectedCategoryId)?.name || '카테고리'
            }
            <span className="ml-2 text-sm text-ink-muted">
              ({filteredAndSortedSheetMusic.length}개)
            </span>
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {filteredAndSortedSheetMusic.map((sheet) => (
            <SheetMusicCard
              key={sheet.id}
              sheetMusic={sheet}
              categories={categories}
              onMove={handleMoveSheetMusic}
              onDelete={handleDeleteSheetMusic}
              onEdit={openTitleEditor}
              availability={sheet.availability}
              showMoveOptions={true}
            />
          ))}
        </div>
      </div>

      {editingSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-sheet-title">
          <form onSubmit={saveTitle} className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl">
            <h2 id="edit-sheet-title" className="text-lg font-semibold text-ink">악보 제목 수정</h2>
            <label className="mt-4 block text-sm font-medium text-ink" htmlFor="sheet-title">제목</label>
            <input
              id="sheet-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-md border border-rule-strong bg-surface px-3 py-2 text-ink"
              autoFocus
              required
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingSheet(null)}>취소</Button>
              <Button type="submit">저장</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
