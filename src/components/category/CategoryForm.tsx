'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'

export interface CategoryFormProps {
  isVisible: boolean
  initialValue?: string
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
  submitLabel?: string
  placeholder?: string
  autoFocus?: boolean
}

export function CategoryForm({
  isVisible,
  initialValue = '',
  onSubmit,
  onCancel,
  submitLabel = '생성',
  placeholder = '카테고리 이름',
  autoFocus = true
}: CategoryFormProps) {
  const [value, setValue] = useState(initialValue)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!value.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(value.trim())
      setValue('')
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setValue('')
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (!isVisible) return null

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus={autoFocus}
          disabled={isSubmitting}
          maxLength={50}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!value.trim() || isSubmitting}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '처리 중...' : submitLabel}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </Card>
  )
}

export interface CategoryCreateFormProps {
  isVisible: boolean
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

export function CategoryCreateForm({
  isVisible,
  onSubmit,
  onCancel
}: CategoryCreateFormProps) {
  return (
    <CategoryForm
      isVisible={isVisible}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="생성"
      placeholder="새 카테고리 이름"
    />
  )
}

export interface CategoryEditFormProps {
  isVisible: boolean
  initialValue: string
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

export function CategoryEditForm({
  isVisible,
  initialValue,
  onSubmit,
  onCancel
}: CategoryEditFormProps) {
  return (
    <CategoryForm
      isVisible={isVisible}
      initialValue={initialValue}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="저장"
      placeholder="카테고리 이름 수정"
    />
  )
}