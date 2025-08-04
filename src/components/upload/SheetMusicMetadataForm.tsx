'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import type { Category } from '@/types/category'

export interface SheetMusicFormData {
  title: string
  composer: string
  categoryId: number | null
  isPublic: boolean
}

interface SheetMusicMetadataFormProps {
  formData: SheetMusicFormData
  onChange: (data: SheetMusicFormData) => void
  onSubmit?: () => void
  isSubmitting?: boolean
  submitLabel?: string
  showSubmitButton?: boolean
  className?: string
}

export default function SheetMusicMetadataForm({
  formData,
  onChange,
  onSubmit,
  isSubmitting = false,
  submitLabel = '저장',
  showSubmitButton = false,
  className = ''
}: SheetMusicMetadataFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load user categories
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true)
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      setIsCreatingCategory(true)
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (response.ok) {
        const newCategory = await response.json()
        setCategories(prev => [...prev, newCategory])
        onChange({ ...formData, categoryId: newCategory.id })
        setNewCategoryName('')
        setShowNewCategoryInput(false)
      } else {
        const error = await response.json()
        setErrors(prev => ({ ...prev, category: error.message || '카테고리 생성에 실패했습니다.' }))
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, category: '카테고리 생성 중 오류가 발생했습니다.' }))
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = '곡명은 필수 입력 항목입니다.'
    }

    if (!formData.composer.trim()) {
      newErrors.composer = '저작자는 필수 입력 항목입니다.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm() && onSubmit) {
      onSubmit()
    }
  }

  const handleInputChange = (field: keyof SheetMusicFormData, value: any) => {
    onChange({ ...formData, [field]: value })
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">악보 정보</h3>
        
        {/* Title Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            곡명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="곡명을 입력하세요"
            disabled={isSubmitting}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
        </div>

        {/* Composer Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            저작자 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.composer}
            onChange={(e) => handleInputChange('composer', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.composer ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="작곡가 또는 저작자를 입력하세요"
            disabled={isSubmitting}
          />
          {errors.composer && (
            <p className="mt-1 text-sm text-red-600">{errors.composer}</p>
          )}
        </div>

        {/* Category Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            카테고리
          </label>
          <div className="space-y-2">
            <select
              value={formData.categoryId || ''}
              onChange={(e) => handleInputChange('categoryId', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting || isLoadingCategories}
            >
              <option value="">카테고리 선택 (선택사항)</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            
            {/* New Category Creation */}
            {!showNewCategoryInput ? (
              <button
                type="button"
                onClick={() => setShowNewCategoryInput(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                disabled={isSubmitting}
              >
                + 새 카테고리 만들기
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="새 카테고리 이름"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isCreatingCategory}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || isCreatingCategory}
                >
                  {isCreatingCategory ? '생성 중...' : '생성'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewCategoryInput(false)
                    setNewCategoryName('')
                  }}
                  disabled={isCreatingCategory}
                >
                  취소
                </Button>
              </div>
            )}
            
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category}</p>
            )}
          </div>
        </div>

        {/* Public/Private Toggle */}
        <div>
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => handleInputChange('isPublic', e.target.checked)}
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-700">
                다른 사용자와 공유 (공개 설정)
              </span>
              <p className="text-xs text-gray-500 mt-1">
                공개로 설정하면 다른 사용자들이 이 악보를 검색하고 연주할 수 있습니다.
              </p>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        {showSubmitButton && (
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || !formData.title.trim() || !formData.composer.trim()}
              className="px-8"
            >
              {isSubmitting ? '처리 중...' : submitLabel}
            </Button>
          </div>
        )}
      </div>
    </form>
  )
}