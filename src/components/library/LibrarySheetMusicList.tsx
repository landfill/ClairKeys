'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
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
  const [loadFailed, setLoadFailed] = useState(false)
  const latestLoad = useRef(0)
  // 편집 대화상자를 연 동작. 닫힐 때 포커스를 여기로 돌려준다 — 그러지 않으면 사라지는 버튼과 함께
  // 포커스가 `body`로 떨어져 키보드 사용자는 목록 맨 앞부터 다시 Tab해야 한다 (PR158 3차 리뷰).
  const editTrigger = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // 데이터 로드. 카테고리 변경은 즉시 반영하고 키 입력만 debounce한다.
  //
  // 실패 여부는 조회 함수가 돌려준 값으로만 판정한다. 훅의 `error`는 수정·삭제 실패에도 설정되고,
  // 조회가 실패해도 이전 행이 남는다 — 전체 목록을 받은 뒤 카테고리 조회가 실패하면 이전 행이 새
  // 카테고리 이름 아래 그대로 보였다 (PR158 리뷰). 늦게 도착한 이전 요청이 최신 결과를 덮지 않도록
  // 가장 최근 요청의 결과만 반영한다.
  const loadSheetMusic = useCallback(async () => {
    const request = ++latestLoad.current
    try {
      const succeeded = await fetchUserSheetMusic({
        categoryId: selectedCategoryId || undefined,
        search: debouncedSearchQuery || undefined
      })
      if (request === latestLoad.current) setLoadFailed(succeeded === false)
    } catch (error) {
      console.error('Failed to load sheet music:', error)
      if (request === latestLoad.current) setLoadFailed(true)
    }
  }, [selectedCategoryId, debouncedSearchQuery, fetchUserSheetMusic])

  useEffect(() => {
    loadSheetMusic()
  }, [loadSheetMusic])

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
      // 선택된 카테고리에서 이동한 항목을 제거하기 위해 한 번만 새로고침한다. 실패 추적이 한
      // 경로에만 있도록 같은 조회 함수를 쓴다.
      await loadSheetMusic()
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
    editTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
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

  // 대화상자가 닫힌 뒤(취소·저장 성공) 연 동작으로 포커스를 돌려준다. 카드는 id를 key로 다시
  // 그려지므로 저장 뒤에도 같은 버튼이 남아 있다. 그 사이 버튼이 사라졌다면 아무것도 하지 않는다.
  useEffect(() => {
    if (editingSheet !== null) return
    const trigger = editTrigger.current
    editTrigger.current = null
    if (trigger && trigger.isConnected) trigger.focus()
  }, [editingSheet])

  // 로딩 상태
  if (sheetMusicLoading) {
    return <Loading />
  }

  /*
    불러오기 실패. 빈 상태보다 먼저 판정해야 한다 — 목록을 받지 못한 것과 목록이 비어 있는 것은
    원인이 다르므로 다음 행동도 다르다. 이전에는 둘이 같은 화면이어서 실패한 사람에게 업로드를
    권했다 (이슈 #146 stage 4). 원시 서버 문구는 노출하지 않는다.

    판정은 가장 최근 조회의 실패 여부(`loadFailed`)다. 훅의 `error`나 남은 행 수로 판정하지 않는다 —
    `error`는 저장 실패에도 설정되고, 행은 실패한 조회 뒤에도 이전 질의의 것이 남는다. 이전 행을
    보여 주면 다른 카테고리·검색어의 결과를 지금 질의의 결과처럼 말하게 된다. 저장·삭제 실패는
    `loadFailed`를 건드리지 않으므로 목록과 그 자리의 인라인 안내가 그대로 유지된다.
  */
  if (loadFailed) {
    return (
      <StatusState
        tone="error"
        title="악보 목록을 불러오지 못했습니다"
        detail="연결을 확인한 뒤 다시 시도해 주세요. 악보는 지워지지 않았습니다."
        action={<Button variant="outline" onClick={() => { loadSheetMusic() }}>다시 시도</Button>}
      />
    )
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
        
        <div data-testid="library-sheet-grid" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-4">
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
