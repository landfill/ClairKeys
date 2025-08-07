'use client'

import { useState, useEffect } from 'react'
import { SheetMusicWithCategory } from '@/types/sheet-music'
import { Category } from '@/types/category'
import { useSheetMusic } from '@/hooks/useSheetMusic'
import { useCategories } from '@/hooks/useCategories'
import { SheetMusicCard } from '@/components/sheet/SheetMusicCard'
import Loading from '@/components/ui/Loading'
import { Button } from '@/components/ui/Button'

interface CategorySheetMusicListProps {
  selectedCategoryId?: number | null
  onSheetMusicMove?: (sheetMusicId: number, newCategoryId: number | null) => void
}

interface GroupedSheetMusic {
  category: Category | null
  sheetMusic: SheetMusicWithCategory[]
}

export function CategorySheetMusicList({ 
  selectedCategoryId, 
  onSheetMusicMove 
}: CategorySheetMusicListProps) {
  const { sheetMusic, loading: sheetMusicLoading, updateSheetMusic, deleteSheetMusic, fetchUserSheetMusic } = useSheetMusic()
  const { categories, loading: categoriesLoading } = useCategories()
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [dragOverCategory, setDragOverCategory] = useState<number | null>(null)

  // Fetch sheet music data on component mount and when selectedCategoryId changes
  useEffect(() => {
    const loadSheetMusic = async () => {
      await fetchUserSheetMusic({
        categoryId: selectedCategoryId || undefined
      })
    }
    
    loadSheetMusic()
  }, [selectedCategoryId, fetchUserSheetMusic])

  // Group sheet music by category
  const groupedSheetMusic: GroupedSheetMusic[] = []
  

  
  if (selectedCategoryId === null) {
    // Show all categories with their sheet music
    const categoriesMap = new Map(categories.map(cat => [cat.id, cat]))
    
    // Add uncategorized sheet music
    const uncategorizedSheetMusic = sheetMusic.filter(sm => sm.categoryId === null)
    if (uncategorizedSheetMusic.length > 0) {
      groupedSheetMusic.push({
        category: null,
        sheetMusic: uncategorizedSheetMusic
      })
    }
    
    // Add categorized sheet music
    categories.forEach(category => {
      const categorySheetMusic = sheetMusic.filter(sm => sm.categoryId === category.id)
      if (categorySheetMusic.length > 0) {
        groupedSheetMusic.push({
          category,
          sheetMusic: categorySheetMusic
        })
      }
    })
  } else {
    // Show only selected category
    const selectedCategory = categories.find(cat => cat.id === selectedCategoryId)
    const categorySheetMusic = sheetMusic.filter(sm => sm.categoryId === selectedCategoryId)
    
    if (categorySheetMusic.length > 0 || selectedCategory) {
      groupedSheetMusic.push({
        category: selectedCategory || null,
        sheetMusic: categorySheetMusic
      })
    }
  }

  const handleDragStart = (sheetMusicId: number) => {
    setDraggedItem(sheetMusicId)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverCategory(null)
  }

  const handleDragOver = (e: React.DragEvent, categoryId: number | null) => {
    e.preventDefault()
    setDragOverCategory(categoryId)
  }

  const handleDragLeave = () => {
    setDragOverCategory(null)
  }

  const handleDrop = async (e: React.DragEvent, targetCategoryId: number | null) => {
    e.preventDefault()
    
    if (!draggedItem) return

    try {
      await updateSheetMusic(draggedItem, { categoryId: targetCategoryId })
      onSheetMusicMove?.(draggedItem, targetCategoryId)
      // Refresh the sheet music list to reflect changes
      await fetchUserSheetMusic({
        categoryId: selectedCategoryId || undefined
      })
    } catch (error) {
      console.error('Failed to move sheet music:', error)
    }

    setDraggedItem(null)
    setDragOverCategory(null)
  }

  const handleDeleteSheetMusic = async (sheetMusicId: number) => {
    try {
      await deleteSheetMusic(sheetMusicId)
      // Refresh the list after deletion
      await fetchUserSheetMusic({
        categoryId: selectedCategoryId || undefined
      })
    } catch (error) {
      console.error('Failed to delete sheet music:', error)
      alert('악보 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleMoveSheetMusic = async (sheetMusicId: number, newCategoryId: number | null) => {
    try {
      await updateSheetMusic(sheetMusicId, { categoryId: newCategoryId })
      onSheetMusicMove?.(sheetMusicId, newCategoryId)
      // Refresh the sheet music list to reflect changes
      await fetchUserSheetMusic({
        categoryId: selectedCategoryId || undefined
      })
    } catch (error) {
      console.error('Failed to move sheet music:', error)
    }
  }

  if (sheetMusicLoading || categoriesLoading) {
    return <Loading />
  }

  if (groupedSheetMusic.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-6xl mb-4">🎵</div>
        <h3 className="text-lg font-medium mb-2">악보가 없습니다</h3>
        <p className="text-sm">첫 번째 악보를 업로드해보세요!</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {groupedSheetMusic.map((group, index) => (
        <div key={group.category?.id || 'uncategorized'} className="space-y-4">
          {/* Category header */}
          <div
            className={`flex items-center gap-3 p-4 rounded-lg border-2 border-dashed transition-colors ${
              dragOverCategory === (group.category?.id || null)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
            }`}
            onDragOver={(e) => handleDragOver(e, group.category?.id || null)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, group.category?.id || null)}
          >
            <span className="text-2xl">📁</span>
            <div>
              <h3 className="text-lg font-semibold">
                {group.category?.name || '미분류'}
              </h3>
              <p className="text-sm text-gray-600">
                {group.sheetMusic.length}개의 악보
              </p>
            </div>
          </div>

          {/* Sheet music grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.sheetMusic.map((sheet) => (
              <div
                key={sheet.id}
                draggable
                onDragStart={() => handleDragStart(sheet.id)}
                onDragEnd={handleDragEnd}
                className={`transition-opacity ${
                  draggedItem === sheet.id ? 'opacity-50' : 'opacity-100'
                }`}
              >
                <SheetMusicCard
                  sheetMusic={sheet}
                  showMoveOptions={selectedCategoryId === null}
                  categories={categories}
                  onMove={handleMoveSheetMusic}
                  onDelete={handleDeleteSheetMusic}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Drag and drop instructions */}
      {selectedCategoryId === null && sheetMusic.length > 0 && (
        <div className="text-center py-4 text-sm text-gray-500 border-t">
          💡 악보를 드래그하여 다른 카테고리로 이동할 수 있습니다
        </div>
      )}
    </div>
  )
}