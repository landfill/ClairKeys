'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Category } from '@/types/category'
import { useCategories } from '@/hooks/useCategories'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Loading from '@/components/ui/Loading'

interface CategoryManagerProps {
  selectedCategoryId?: number | null
  onCategorySelect?: (categoryId: number | null) => void
  showCreateButton?: boolean
  onCategoryChange?: () => void
}

export function CategoryManager({ 
  selectedCategoryId, 
  onCategorySelect, 
  showCreateButton = true,
  onCategoryChange
}: CategoryManagerProps) {
  const { data: session, status } = useSession()
  const { categories, loading, error, createCategory, updateCategory, deleteCategory } = useCategories()
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editCategoryName, setEditCategoryName] = useState('')

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      await createCategory({ name: newCategoryName.trim() })
      setNewCategoryName('')
      setIsCreating(false)
      onCategoryChange?.()
    } catch (error) {
      // Error is handled by the hook
    }
  }

  const handleUpdateCategory = async (id: number) => {
    if (!editCategoryName.trim()) return

    try {
      await updateCategory(id, { name: editCategoryName.trim() })
      setEditingId(null)
      setEditCategoryName('')
      onCategoryChange?.()
    } catch (error) {
      // Error is handled by the hook
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까? 카테고리 내의 악보들은 미분류로 이동됩니다.')) {
      return
    }

    try {
      await deleteCategory(id)
      if (selectedCategoryId === id && onCategorySelect) {
        onCategorySelect(null)
      }
      onCategoryChange?.()
    } catch (error) {
      // Error is handled by the hook
    }
  }

  const startEditing = (category: Category) => {
    setEditingId(category.id)
    setEditCategoryName(category.name)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditCategoryName('')
  }

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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">카테고리</h3>
        {showCreateButton && (
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            disabled={isCreating}
          >
            + 새 카테고리
          </Button>
        )}
      </div>

      {/* Debug session info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs bg-gray-100 p-2 rounded space-y-2">
          <div>Session Status: {status}</div>
          <div>User ID: {session?.user?.id || 'None'}</div>
          <div>User Email: {session?.user?.email || 'None'}</div>
          {status === 'authenticated' && (
            <button
              onClick={() => {
                // 브라우저 저장소 클리어
                localStorage.clear()
                sessionStorage.clear()
                // 페이지 새로고침
                window.location.reload()
              }}
              className="px-2 py-1 bg-red-500 text-white text-xs rounded"
            >
              Clear Session & Reload
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Create new category form */}
      {isCreating && (
        <Card className="p-4">
          <div className="space-y-3">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="카테고리 이름"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCreateCategory}
                size="sm"
                disabled={!newCategoryName.trim()}
              >
                생성
              </Button>
              <Button
                onClick={() => {
                  setIsCreating(false)
                  setNewCategoryName('')
                }}
                variant="outline"
                size="sm"
              >
                취소
              </Button>
            </div>
          </div>
        </Card>
      )}

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
          <span className="text-lg">📁</span>
          <span className="font-medium">전체 악보</span>
        </div>
      </div>

      {/* Category list */}
      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`p-3 rounded-md transition-colors ${
              selectedCategoryId === category.id
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
            }`}
          >
            {editingId === category.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="flex gap-1">
                  <Button
                    onClick={() => handleUpdateCategory(category.id)}
                    size="sm"
                    disabled={!editCategoryName.trim()}
                  >
                    저장
                  </Button>
                  <Button
                    onClick={cancelEditing}
                    variant="outline"
                    size="sm"
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                  onClick={() => onCategorySelect?.(category.id)}
                >
                  <span className="text-lg">📁</span>
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing(category)
                    }}
                    variant="outline"
                    size="sm"
                  >
                    수정
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCategory(category.id)
                    }}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    삭제
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {categories.length === 0 && !isCreating && (
        <div className="text-center py-8 text-gray-500">
          <p>아직 카테고리가 없습니다.</p>
          {showCreateButton && (
            <Button
              onClick={() => setIsCreating(true)}
              variant="outline"
              className="mt-2"
            >
              첫 번째 카테고리 만들기
            </Button>
          )}
        </div>
      )}
    </div>
  )
}