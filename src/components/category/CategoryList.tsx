'use client'

import { Category } from '@/types/category'
import { 
  CategoryReadOnlyProps, 
  CategorySelectableProps, 
  CategoryEditableProps, 
  CategoryDeletableProps 
} from '@/types/interfaces'

// Interface Segregation 적용: 각 컴포넌트별 최소 필요 기능만 포함
export interface CategoryItemProps {
  category: Category
  isSelected: boolean
  isEditing: boolean
  editValue: string
  onSelect: (categoryId: number) => void
  onStartEdit: (category: Category) => void
  onSaveEdit: (id: number) => void
  onCancelEdit: () => void
  onDelete: (id: number) => void
  onEditValueChange: (value: string) => void
}

export interface CategoryListProps 
  extends CategoryReadOnlyProps,
          CategorySelectableProps,
          CategoryEditableProps,
          CategoryDeletableProps {
}

function CategoryItem({
  category,
  isSelected,
  isEditing,
  editValue,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditValueChange
}: CategoryItemProps) {
  const handleClick = () => {
    if (!isEditing) {
      onSelect(category.id)
    }
  }

  return (
    <div
      className={`p-3 rounded-md transition-colors ${
        isSelected
          ? 'bg-blue-100 border-2 border-blue-500'
          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
      }`}
    >
      {isEditing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSaveEdit(category.id)
              } else if (e.key === 'Escape') {
                onCancelEdit()
              }
            }}
          />
          <div className="flex gap-1">
            <button
              onClick={() => onSaveEdit(category.id)}
              disabled={!editValue.trim()}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              저장
            </button>
            <button
              onClick={onCancelEdit}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer"
            onClick={handleClick}
          >
            <span className="text-lg" role="img" aria-label="folder">📁</span>
            <span className="font-medium">{category.name}</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStartEdit(category)
              }}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
              aria-label={`${category.name} 수정`}
            >
              수정
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(category.id)
              }}
              className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
              aria-label={`${category.name} 삭제`}
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function CategoryList({
  categories,
  selectedCategoryId,
  editingId,
  editValue,
  onCategorySelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditValueChange
}: CategoryListProps) {
  return (
    <div className="space-y-2">
      {/* All categories option */}
      <div
        className={`p-3 rounded-md cursor-pointer transition-colors ${
          selectedCategoryId === null
            ? 'bg-blue-100 border-2 border-blue-500'
            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
        }`}
        onClick={() => onCategorySelect?.(null)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="all files">📁</span>
          <span className="font-medium">전체 악보</span>
        </div>
      </div>

      {/* Category items */}
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          isSelected={selectedCategoryId === category.id}
          isEditing={editingId === category.id}
          editValue={editValue || ''}
          onSelect={(id) => onCategorySelect?.(id)}
          onStartEdit={(c) => onStartEdit?.(c)}
          onSaveEdit={(id) => onSaveEdit?.(id)}
          onCancelEdit={() => onCancelEdit?.()}
          onDelete={(id) => onDelete?.(id)}
          onEditValueChange={(val) => onEditValueChange?.(val)}
        />
      ))}

      {/* Empty state */}
      {categories.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>아직 카테고리가 없습니다.</p>
        </div>
      )}
    </div>
  )
}