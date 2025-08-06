'use client'

import { Category } from '@/types/category'

export interface CategoryActionsProps {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (id: number) => void
  showEditButton?: boolean
  showDeleteButton?: boolean
  size?: 'sm' | 'md'
  variant?: 'default' | 'minimal'
}

export function CategoryActions({
  category,
  onEdit,
  onDelete,
  showEditButton = true,
  showDeleteButton = true,
  size = 'sm',
  variant = 'default'
}: CategoryActionsProps) {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(category)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    const confirmed = window.confirm(
      `"${category.name}" 카테고리를 삭제하시겠습니까?\n\n카테고리 내의 악보들은 미분류로 이동됩니다.`
    )
    
    if (confirmed) {
      onDelete(category.id)
    }
  }

  const getButtonClasses = (type: 'edit' | 'delete') => {
    const baseClasses = 'focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors'
    
    const sizeClasses = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-2 text-sm'
    }

    if (variant === 'minimal') {
      return `${baseClasses} ${sizeClasses[size]} text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded`
    }

    // Default variant
    const typeClasses = {
      edit: 'border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:ring-gray-500',
      delete: 'border border-red-300 text-red-600 rounded hover:bg-red-50 focus:ring-red-500'
    }

    return `${baseClasses} ${sizeClasses[size]} ${typeClasses[type]}`
  }

  if (!showEditButton && !showDeleteButton) {
    return null
  }

  return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {showEditButton && (
        <button
          onClick={handleEdit}
          className={getButtonClasses('edit')}
          aria-label={`${category.name} 수정`}
          title="카테고리 이름 수정"
        >
          {variant === 'minimal' ? '✏️' : '수정'}
        </button>
      )}
      
      {showDeleteButton && (
        <button
          onClick={handleDelete}
          className={getButtonClasses('delete')}
          aria-label={`${category.name} 삭제`}
          title="카테고리 삭제 (악보는 미분류로 이동)"
        >
          {variant === 'minimal' ? '🗑️' : '삭제'}
        </button>
      )}
    </div>
  )
}

export interface CategoryHeaderActionsProps {
  onCreateNew: () => void
  showCreateButton?: boolean
  isCreating?: boolean
}

export function CategoryHeaderActions({
  onCreateNew,
  showCreateButton = true,
  isCreating = false
}: CategoryHeaderActionsProps) {
  if (!showCreateButton) return null

  return (
    <button
      onClick={onCreateNew}
      disabled={isCreating}
      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label="새 카테고리 만들기"
    >
      {isCreating ? '생성 중...' : '+ 새 카테고리'}
    </button>
  )
}

export interface BulkCategoryActionsProps {
  selectedCategories: number[]
  onBulkDelete: (categoryIds: number[]) => void
  onClearSelection: () => void
}

export function BulkCategoryActions({
  selectedCategories,
  onBulkDelete,
  onClearSelection
}: BulkCategoryActionsProps) {
  const handleBulkDelete = () => {
    const confirmed = window.confirm(
      `선택된 ${selectedCategories.length}개의 카테고리를 삭제하시겠습니까?\n\n카테고리 내의 악보들은 미분류로 이동됩니다.`
    )
    
    if (confirmed) {
      onBulkDelete(selectedCategories)
    }
  }

  if (selectedCategories.length === 0) return null

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
      <span className="text-sm text-blue-700">
        {selectedCategories.length}개 선택됨
      </span>
      <div className="flex gap-2">
        <button
          onClick={handleBulkDelete}
          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          일괄 삭제
        </button>
        <button
          onClick={onClearSelection}
          className="px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          선택 해제
        </button>
      </div>
    </div>
  )
}