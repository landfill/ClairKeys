'use client'

import { SheetMusicWithCategory } from '@/types/sheet-music'
import { Category } from '@/types/category'
import { SheetMusicCardBase } from './SheetMusicCardBase'
import { SheetMusicActions } from './SheetMusicActions'
import { SheetMusicMoveMenu } from './SheetMusicMoveMenu'

export interface SheetMusicCardProps {
  sheetMusic: SheetMusicWithCategory
  categories?: Category[]
  onMove?: (sheetMusicId: number, newCategoryId: number | null) => void
  onEdit?: (sheetMusic: SheetMusicWithCategory) => void
  onDelete?: (sheetMusicId: number) => void
  showMoveOptions?: boolean
  showEditOptions?: boolean
  showDeleteOptions?: boolean
  showPlayButton?: boolean
  showMetadata?: boolean
  showDate?: boolean
  layout?: 'card' | 'compact' | 'list'
  className?: string
}

export function SheetMusicCardRefactored({
  sheetMusic,
  categories = [],
  onMove,
  onEdit,
  onDelete,
  showMoveOptions = false,
  showEditOptions = true,
  showDeleteOptions = true,
  showPlayButton = true,
  showMetadata = true,
  showDate = true,
  layout = 'card',
  className = ''
}: SheetMusicCardProps) {
  const handleMove = (newCategoryId: number | null) => {
    onMove?.(sheetMusic.id, newCategoryId)
  }

  // Compact layout for list views
  if (layout === 'compact') {
    return (
      <div className={`flex items-center gap-4 p-3 bg-white rounded-md border hover:shadow-sm transition-shadow ${className}`}>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{sheetMusic.title}</h4>
          <p className="text-xs text-gray-600 truncate">{sheetMusic.composer}</p>
        </div>
        <div className="flex items-center gap-1">
          <SheetMusicActions
            sheetMusic={sheetMusic}
            onEdit={onEdit}
            onDelete={onDelete}
            showEdit={showEditOptions}
            showDelete={showDeleteOptions}
            showPlay={showPlayButton}
            showMove={false}
            layout="horizontal"
          />
          {showMoveOptions && categories.length > 0 && (
            <SheetMusicMoveMenu
              categories={categories}
              currentCategoryId={sheetMusic.categoryId}
              onMove={handleMove}
            />
          )}
        </div>
      </div>
    )
  }

  // List layout for table-like views
  if (layout === 'list') {
    return (
      <div className={`grid grid-cols-12 gap-4 p-3 bg-white rounded-md border hover:shadow-sm transition-shadow ${className}`}>
        <div className="col-span-4">
          <h4 className="font-medium text-sm truncate">{sheetMusic.title}</h4>
          <p className="text-xs text-gray-600 truncate">{sheetMusic.composer}</p>
        </div>
        <div className="col-span-2 flex items-center text-xs">
          <span className="px-2 py-1 bg-gray-100 rounded-full truncate">
            📁 {sheetMusic.category?.name || '미분류'}
          </span>
        </div>
        <div className="col-span-2 flex items-center text-xs">
          <span className={`px-2 py-1 rounded-full ${
            sheetMusic.isPublic 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {sheetMusic.isPublic ? '🌍 공개' : '🔒 비공개'}
          </span>
        </div>
        <div className="col-span-2 flex items-center text-xs text-gray-500">
          {new Date(sheetMusic.createdAt).toLocaleDateString('ko-KR')}
        </div>
        <div className="col-span-2 flex items-center gap-1">
          <SheetMusicActions
            sheetMusic={sheetMusic}
            onEdit={onEdit}
            onDelete={onDelete}
            showEdit={showEditOptions}
            showDelete={showDeleteOptions}
            showPlay={showPlayButton}
            showMove={false}
            layout="horizontal"
          />
          {showMoveOptions && categories.length > 0 && (
            <SheetMusicMoveMenu
              categories={categories}
              currentCategoryId={sheetMusic.categoryId}
              onMove={handleMove}
            />
          )}
        </div>
      </div>
    )
  }

  // Default card layout
  return (
    <SheetMusicCardBase 
      sheetMusic={sheetMusic} 
      showMetadata={showMetadata}
      showDate={showDate}
      className={className}
    >
      {/* Action buttons */}
      <div className="flex gap-2">
        <div className="flex-1">
          <SheetMusicActions
            sheetMusic={sheetMusic}
            onEdit={onEdit}
            onDelete={onDelete}
            showEdit={showEditOptions}
            showDelete={showDeleteOptions}
            showPlay={showPlayButton}
            showMove={false}
            layout="horizontal"
          />
        </div>
        
        {/* Move menu */}
        {showMoveOptions && categories.length > 0 && (
          <SheetMusicMoveMenu
            categories={categories}
            currentCategoryId={sheetMusic.categoryId}
            onMove={handleMove}
            position="right"
          />
        )}
      </div>
    </SheetMusicCardBase>
  )
}

// Re-export for backward compatibility
export { SheetMusicCardRefactored as SheetMusicCard }