'use client'

import { useState, useEffect } from 'react'
import { SheetMusicWithCategory, UpdateSheetMusicRequest } from '@/types/sheet-music'
import { Button } from '@/components/ui/Button'

interface Category {
  id: number
  name: string
}

interface SheetMusicEditFormProps {
  sheetMusic: SheetMusicWithCategory
  categories: Category[]
  onSave: (data: UpdateSheetMusicRequest) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function SheetMusicEditForm({
  sheetMusic,
  categories,
  onSave,
  onCancel,
  loading = false
}: SheetMusicEditFormProps) {
  const [formData, setFormData] = useState({
    title: sheetMusic.title,
    composer: sheetMusic.composer,
    categoryId: sheetMusic.categoryId || '',
    isPublic: sheetMusic.isPublic
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.composer.trim()) {
      newErrors.composer = 'Composer is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSave({
        title: formData.title.trim(),
        composer: formData.composer.trim(),
        categoryId: formData.categoryId ? parseInt(formData.categoryId.toString()) : null,
        isPublic: formData.isPublic
      })
    } catch (error) {
      console.error('Failed to save sheet music:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Edit Sheet Music</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter song title"
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title}</p>
          )}
        </div>

        <div>
          <label htmlFor="composer" className="block text-sm font-medium text-gray-700 mb-1">
            Composer *
          </label>
          <input
            type="text"
            id="composer"
            value={formData.composer}
            onChange={(e) => setFormData(prev => ({ ...prev, composer: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.composer ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter composer name"
          />
          {errors.composer && (
            <p className="text-red-500 text-sm mt-1">{errors.composer}</p>
          )}
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            value={formData.categoryId}
            onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No Category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Make this sheet music public
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Public sheet music can be viewed and played by other users
          </p>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}