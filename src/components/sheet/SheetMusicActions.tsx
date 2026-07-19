'use client'

import Link from 'next/link'
import { SheetMusicWithCategory } from '@/types/sheet-music'
import Button from '@/components/ui/Button'
import { SheetMusicActionableProps } from '@/types/interfaces'

// Interface Segregation 적용: 액션 관련 기능만 포함
export interface SheetMusicActionsProps extends SheetMusicActionableProps {
  onMove?: () => void
  showMove?: boolean
  className?: string
}

export function SheetMusicActions({
  sheetMusic,
  onEdit,
  onDelete,
  onMove,
  showEdit = true,
  showDelete = true,
  showMove = false,
  showPlay = true,
  layout = 'horizontal',
  className = ''
}: SheetMusicActionsProps) {
  const handleDelete = () => {
    const confirmed = window.confirm(
      `"${sheetMusic.title}" 악보를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    )
    
    if (confirmed) {
      onDelete?.(sheetMusic.id)
    }
  }

  const containerClasses = `
    flex gap-2 pt-2
    ${layout === 'vertical' ? 'flex-col' : ''}
    ${className}
  `

  return (
    <div className={containerClasses}>
      {/* Play Button */}
      {showPlay && (
        <Link href={`/sheet/${sheetMusic.id}`} className={layout === 'horizontal' ? 'flex-1' : ''}>
          <Button 
            className={layout === 'horizontal' ? 'w-full' : ''} 
            size="sm"
            aria-label={`${sheetMusic.title} 연주하기`}
          >
            🎹 연주하기
          </Button>
        </Link>
      )}
      
      {/* Edit Button */}
      {showEdit && onEdit && (
        <Button
          onClick={() => onEdit(sheetMusic)}
          variant="outline"
          size="sm"
          aria-label={`${sheetMusic.title} 수정`}
        >
          ✏️ 수정
        </Button>
      )}

      {/* Move Button */}
      {showMove && onMove && (
        <Button
          onClick={onMove}
          variant="outline"
          size="sm"
          aria-label={`${sheetMusic.title} 이동`}
        >
          📁 이동
        </Button>
      )}

      {/* Delete Button */}
      {showDelete && onDelete && (
        <Button
          onClick={handleDelete}
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700"
          aria-label={`${sheetMusic.title} 삭제`}
        >
          🗑️ 삭제
        </Button>
      )}
    </div>
  )
}

export interface QuickActionsProps {
  sheetMusic: SheetMusicWithCategory
  onEdit?: (sheetMusic: SheetMusicWithCategory) => void
  onDelete?: (sheetMusicId: number) => void
}

export function QuickActions({
  sheetMusic,
  onEdit,
  onDelete
}: QuickActionsProps) {
  return (
    <SheetMusicActions
      sheetMusic={sheetMusic}
      onEdit={onEdit}
      onDelete={onDelete}
      showPlay={false}
      showMove={false}
      layout="horizontal"
      className="opacity-0 group-hover:opacity-100 transition-opacity"
    />
  )
}

export interface BulkActionsProps {
  selectedSheets: number[]
  onBulkDelete: (sheetIds: number[]) => void
  onBulkMove: (sheetIds: number[], categoryId: number | null) => void
  onClearSelection: () => void
}

export function BulkActions({
  selectedSheets,
  onBulkDelete,
  onBulkMove,
  onClearSelection
}: BulkActionsProps) {
  const handleBulkDelete = () => {
    const confirmed = window.confirm(
      `선택된 ${selectedSheets.length}개의 악보를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    )
    
    if (confirmed) {
      onBulkDelete(selectedSheets)
    }
  }

  if (selectedSheets.length === 0) return null

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
      <span className="text-sm text-blue-700">
        {selectedSheets.length}개 선택됨
      </span>
      <div className="flex gap-2">
        <Button
          onClick={() => {
            // This would typically open a category selection modal
            // For now, just move to uncategorized
            onBulkMove(selectedSheets, null)
          }}
          size="sm"
          variant="outline"
        >
          일괄 이동
        </Button>
        <Button
          onClick={handleBulkDelete}
          size="sm"
          className="bg-red-600 text-white hover:bg-red-700"
        >
          일괄 삭제
        </Button>
        <Button
          onClick={onClearSelection}
          size="sm"
          variant="outline"
        >
          선택 해제
        </Button>
      </div>
    </div>
  )
}