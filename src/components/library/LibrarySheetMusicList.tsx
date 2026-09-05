'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useSheetMusic } from '@/hooks/useSheetMusic'
import { useCategories } from '@/hooks/useCategories'
import { SheetMusicCard } from '@/components/sheet/SheetMusicCard'
import type { SheetMusicWithCategory } from '@/types/sheet-music'
import Button from '@/components/ui/Button'
import Loading from '@/components/ui/Loading'
import StatusState from '@/components/ui/StatusState'
import TempoInput from '@/components/upload/TempoInput'
import { quarterBpm, TEMPO_ERROR, type TempoUnit } from '@/utils/tempoInput'

export interface LibrarySheetMusicListProps {
  selectedCategoryId?: number | null
  searchQuery?: string
  sortBy?: 'recent' | 'name' | 'created'
  showCategorySelector?: boolean
  onCategorySelect?: (categoryId: number | null) => void
  onSheetMusicMove?: (sheetMusicId: number, newCategoryId: number | null) => void
}

export function LibrarySheetMusicList({
  selectedCategoryId = null,
  searchQuery = '',
  sortBy = 'recent',
  showCategorySelector = false,
  onCategorySelect,
  onSheetMusicMove
}: LibrarySheetMusicListProps) {
  const { sheetMusic, loading: sheetMusicLoading, fetchUserSheetMusic, updateSheetMusic, deleteSheetMusic } = useSheetMusic()
  const { categories } = useCategories()
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery)
  const [editingSheet, setEditingSheet] = useState<SheetMusicWithCategory | null>(null)
  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [tempo, setTempo] = useState('')
  const [tempoUnit, setTempoUnit] = useState<TempoUnit>('quarter')
  const [tempoError, setTempoError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // 데이터 로드. 카테고리 변경은 즉시 반영하고 키 입력만 debounce한다.
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchUserSheetMusic({
          categoryId: selectedCategoryId || undefined,
          search: debouncedSearchQuery || undefined
        })
      } catch (error) {
        console.error('Failed to load sheet music:', error)
      }
    }
    
    loadData()
  }, [selectedCategoryId, debouncedSearchQuery, fetchUserSheetMusic])

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
      // 선택된 카테고리에서 이동한 항목을 제거하기 위해 한 번만 새로고침한다.
      await fetchUserSheetMusic({
        categoryId: selectedCategoryId || undefined,
        search: debouncedSearchQuery || undefined
      })
    } catch (error) {
      console.error('Failed to move sheet music:', error)
    }
  }

  const handleDeleteSheetMusic = async (sheetMusicId: number) => {
    try {
      setErrorMessage(null)
      await deleteSheetMusic(sheetMusicId)
    } catch (error) {
      console.error('Failed to delete sheet music:', error)
      setErrorMessage('악보를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  const openTitleEditor = (sheet: SheetMusicWithCategory) => {
    setTitle(sheet.title)
    setTitleError(null)
    setTempo('')
    setTempoUnit('quarter')
    setTempoError(undefined)
    setEditingSheet(sheet)
  }

  const saveTitle = async (event: FormEvent) => {
    event.preventDefault()
    if (!editingSheet || saving) return
    if (!title.trim()) {
      setTitleError('제목을 입력해 주세요.')
      return
    }

    let bpm: number | null
    try { bpm = quarterBpm(tempo, tempoUnit) } catch { setTempoError(TEMPO_ERROR); return }

    try {
      setSaving(true)
      setTitleError(null)
      setTempoError(undefined)
      setErrorMessage(null)
      await updateSheetMusic(editingSheet.id, { title: title.trim(), ...(bpm !== null ? { tempo: bpm } : {}) })
      setEditingSheet(null)
    } catch (error) {
      console.error('Failed to update sheet music title:', error)
      setErrorMessage('악보 정보를 저장하지 못했습니다. 새로고침한 뒤 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  // 로딩 상태
  if (sheetMusicLoading) {
    return <Loading />
  }

  // 빈 상태
  if (filteredAndSortedSheetMusic.length === 0) {
    return (
      <StatusState
        title={searchQuery ? '검색 결과가 없습니다' : '악보가 없습니다'}
        detail={searchQuery ? '다른 검색어로 다시 찾아보세요.' : '연습할 PDF 악보를 올려 보세요.'}
        action={!searchQuery
          ? <a href="/upload"><Button as="span">새 악보 업로드</Button></a>
          : <a href="/library"><Button as="span" variant="outline">검색 초기화</Button></a>}
      />
    )
  }

  return (
    <div className="space-y-8">
      {errorMessage && (
        <p role="alert" className="rounded-lg border border-state-error bg-surface px-4 py-3 text-sm text-ink">
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
                  p-3 rounded-2xl border-2 transition-colors text-left
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
            <h2 id="edit-sheet-title" className="text-lg font-semibold text-ink">악보 정보 수정</h2>
            <label className="mt-4 block text-sm font-medium text-ink" htmlFor="sheet-title">제목</label>
            <input
              id="sheet-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setTitleError(null)
              }}
              className="mt-1 w-full rounded-md border border-rule-strong bg-surface px-3 py-2 text-ink"
              autoFocus
              required
              aria-describedby={titleError ? 'sheet-title-error' : undefined}
            />
            {titleError && <p id="sheet-title-error" role="alert" className="mt-2 text-sm text-state-error">{titleError}</p>}
            {editingSheet.availability === 'ready' && <div className="mt-4">
              <TempoInput value={tempo} unit={tempoUnit} onChange={setTempo} onUnitChange={setTempoUnit}
                editing disabled={saving} error={tempoError} />
            </div>}
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" disabled={saving} onClick={() => {
                setTitleError(null)
                setEditingSheet(null)
              }}>취소</Button>
              <Button type="submit" disabled={saving}>{saving ? '저장 중…' : '저장'}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
