'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Category } from '@/types/category'
import { useCategories } from '@/hooks/useCategories'
import Loading from '@/components/ui/Loading'
import { CategoryList } from './CategoryList'
import { CategoryCreateForm } from './CategoryForm'
import { CategoryHeaderActions } from './CategoryActions'

export interface CategoryManagerProps {
  selectedCategoryId?: number | null
  onCategorySelect?: (categoryId: number | null) => void
  showCreateButton?: boolean
  onCategoryChange?: () => void
}

export function CategoryManagerRefactored({ 
  selectedCategoryId, 
  onCategorySelect, 
  showCreateButton = true,
  onCategoryChange
}: CategoryManagerProps) {
  const { data: session, status } = useSession()
  const { categories, loading, error, createCategory, updateCategory, deleteCategory } = useCategories()
  
  // UI State
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  // Handlers
  const handleCreateCategory = useCallback(async (name: string) => {
    try {
      await createCategory({ name })
      setIsCreating(false)
      onCategoryChange?.()
    } catch (error) {
      // Error is handled by the hook
      throw error
    }
  }, [createCategory, onCategoryChange])

  const handleUpdateCategory = useCallback(async (id: number) => {
    if (!editValue.trim()) return

    try {
      await updateCategory(id, { name: editValue.trim() })
      setEditingId(null)
      setEditValue('')
      onCategoryChange?.()
    } catch (error) {
      // Error is handled by the hook
      throw error
    }
  }, [editValue, updateCategory, onCategoryChange])

  const handleDeleteCategory = useCallback(async (id: number) => {
    try {
      await deleteCategory(id)
      if (selectedCategoryId === id && onCategorySelect) {
        onCategorySelect(null)
      }
      onCategoryChange?.()
    } catch (error) {
      // Error is handled by the hook
      console.error('Delete category error:', error)
    }
  }, [deleteCategory, selectedCategoryId, onCategorySelect, onCategoryChange])

  const handleStartEdit = useCallback((category: Category) => {
    setEditingId(category.id)
    setEditValue(category.name)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditValue('')
  }, [])

  const handleCategorySelect = useCallback((categoryId: number | null) => {
    onCategorySelect?.(categoryId)
  }, [onCategorySelect])

  // Loading states
  if (status === 'loading' || loading) {
    return <Loading />
  }

  if (status === 'unauthenticated') {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>카테고리를 사용하려면 로그인이 필요합니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">카테고리</h3>
        <CategoryHeaderActions
          onCreateNew={() => setIsCreating(true)}
          showCreateButton={showCreateButton}
          isCreating={isCreating}
        />
      </div>

      {/* Development Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs bg-gray-100 p-2 rounded space-y-2">
          <div>Session Status: {status}</div>
          <div>User ID: {session?.user?.id || 'None'}</div>
          <div>User Email: {session?.user?.email || 'None'}</div>
          {status === 'authenticated' && (
            <button
              onClick={() => {
                localStorage.clear()
                sessionStorage.clear()
                window.location.reload()
              }}
              className="px-2 py-1 bg-red-500 text-white text-xs rounded"
            >
              Clear Session & Reload
            </button>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md" role="alert">
          {error}
        </div>
      )}

      {/* Create Form */}
      <CategoryCreateForm
        isVisible={isCreating}
        onSubmit={handleCreateCategory}
        onCancel={() => setIsCreating(false)}
      />

      {/* Category List */}
      <CategoryList
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        editingId={editingId}
        editValue={editValue}
        onCategorySelect={handleCategorySelect}
        onStartEdit={handleStartEdit}
        onSaveEdit={handleUpdateCategory}
        onCancelEdit={handleCancelEdit}
        onDelete={handleDeleteCategory}
        onEditValueChange={setEditValue}
      />

      {/* Empty State */}
      {categories.length === 0 && !isCreating && (
        <div className="text-center py-8 text-gray-500">
          <p>아직 카테고리가 없습니다.</p>
          {showCreateButton && (
            <button
              onClick={() => setIsCreating(true)}
              className="mt-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              첫 번째 카테고리 만들기
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Re-export for backward compatibility
export { CategoryManagerRefactored as CategoryManager }