'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SheetMusicWithCategory } from '@/types/sheet-music'
import { Category } from '@/types/category'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { DeleteConfirmDialog } from '@/components/ui/ConfirmDialog'

interface SheetMusicCardProps {
  sheetMusic: SheetMusicWithCategory
  showMoveOptions?: boolean
  categories?: Category[]
  onMove?: (sheetMusicId: number, newCategoryId: number | null) => void
  onEdit?: (sheetMusic: SheetMusicWithCategory) => void
  onDelete?: (sheetMusicId: number) => void
}

export function SheetMusicCard({
  sheetMusic,
  showMoveOptions = false,
  categories = [],
  onMove,
  onEdit,
  onDelete
}: SheetMusicCardProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleMove = (newCategoryId: number | null) => {
    onMove?.(sheetMusic.id, newCategoryId)
    setShowMoveMenu(false)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 h-full flex flex-col">
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header with title and composer */}
        <div className="space-y-1 flex-shrink-0">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors min-h-[3.5rem]">
            {sheetMusic.title}
          </h3>
          <p className="text-gray-600 text-sm truncate">{sheetMusic.composer}</p>
        </div>

        {/* Category and visibility info */}
        <div className="flex items-center gap-2 text-xs flex-shrink-0">
          <span className="px-2 py-1 bg-gray-100 rounded-full truncate">
            📁 {sheetMusic.category?.name || '미분류'}
          </span>
          <span className={`px-2 py-1 rounded-full ${
            sheetMusic.isPublic 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {sheetMusic.isPublic ? '🌍 공개' : '🔒 비공개'}
          </span>
        </div>

        {/* Date */}
        <p className="text-xs text-gray-500 flex-shrink-0">
          {formatDate(sheetMusic.createdAt)}
        </p>

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1"></div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 flex-shrink-0">
          <Link href={`/sheet/${sheetMusic.id}`} className="flex-1">
            <Button className="w-full" size="sm">
              연주
            </Button>
          </Link>
          
          {onEdit && (
            <Button
              onClick={() => onEdit(sheetMusic)}
              variant="outline"
              size="sm"
              className="min-w-[3.5rem] flex-shrink-0"
            >
              수정
            </Button>
          )}

          {showMoveOptions && categories.length > 0 && (
            <div className="relative">
              <Button
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                variant="outline"
                size="sm"
                className="min-w-[3.5rem] flex-shrink-0"
              >
                이동
              </Button>
              
              {showMoveMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[150px]">
                  <div className="py-1">
                    <button
                      onClick={() => handleMove(null)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                    >
                      📁 미분류
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleMove(category.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                        disabled={sheetMusic.categoryId === category.id}
                      >
                        📁 {category.name}
                        {sheetMusic.categoryId === category.id && (
                          <span className="text-xs text-gray-500">(현재)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {onDelete && (
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:border-red-300 min-w-[3.5rem] flex-shrink-0"
            >
              삭제
            </Button>
          )}
        </div>
      </div>

      {/* Click outside to close move menu */}
      {showMoveMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowMoveMenu(false)}
        />
      )}
      
      {/* Delete confirmation dialog */}
      {onDelete && (
        <DeleteConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={() => {
            onDelete(sheetMusic.id)
            setShowDeleteDialog(false)
          }}
          itemName={sheetMusic.title}
          itemType="악보"
        />
      )}
    </Card>
  )
}