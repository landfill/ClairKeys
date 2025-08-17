'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui'
import type { Category } from '@/types/category'

interface OMRUploadFormProps {
  onUploadStart?: (data: { sheetMusicId: number; jobId: string }) => void
  onUploadError?: (error: string) => void
}

interface UploadStatus {
  isUploading: boolean
  progress: number
  message: string
  error?: string
}

export default function OMRUploadForm({ onUploadStart, onUploadError }: OMRUploadFormProps) {
  const { data: session } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    composer: '',
    categoryId: null as number | null,
    isPublic: false
  })
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0,
    message: ''
  })

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
        setFormData(prev => ({ ...prev, categoryId: newCategory.id }))
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

    if (!selectedFile) {
      newErrors.file = 'PDF 파일을 선택해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setErrors(prev => ({ ...prev, file: 'PDF 파일만 업로드 가능합니다.' }))
        return
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setErrors(prev => ({ ...prev, file: '파일 크기는 50MB 이하여야 합니다.' }))
        return
      }

      setSelectedFile(file)
      setErrors(prev => ({ ...prev, file: '' }))
      
      // Auto-fill title from filename if not already set
      if (!formData.title) {
        const nameWithoutExtension = file.name.replace(/\.pdf$/i, '')
        handleInputChange('title', nameWithoutExtension)
      }
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!session?.user) {
      setUploadStatus({
        isUploading: false,
        progress: 0,
        message: '',
        error: '로그인이 필요합니다.'
      })
      return
    }

    if (!validateForm()) {
      return
    }

    try {
      setUploadStatus({
        isUploading: true,
        progress: 10,
        message: '업로드 준비 중...'
      })

      // Prepare form data
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile!)
      uploadFormData.append('title', formData.title.trim())
      uploadFormData.append('composer', formData.composer.trim())
      if (formData.categoryId) {
        uploadFormData.append('categoryId', formData.categoryId.toString())
      }
      uploadFormData.append('isPublic', formData.isPublic.toString())

      setUploadStatus({
        isUploading: true,
        progress: 30,
        message: 'PDF 업로드 중...'
      })

      // Upload to OMR service
      const response = await fetch('/api/omr/upload', {
        method: 'POST',
        body: uploadFormData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '업로드에 실패했습니다.')
      }

      const result = await response.json()
      
      setUploadStatus({
        isUploading: true,
        progress: 100,
        message: '업로드 완료! OMR 처리 시작 중...'
      })

      // Call parent handler
      if (onUploadStart) {
        onUploadStart({
          sheetMusicId: result.sheetMusicId,
          jobId: result.jobId
        })
      }

      // Reset form
      setSelectedFile(null)
      setFormData({
        title: '',
        composer: '',
        categoryId: null,
        isPublic: false
      })
      
      setUploadStatus({
        isUploading: false,
        progress: 0,
        message: ''
      })

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '업로드에 실패했습니다.'
      setUploadStatus({
        isUploading: false,
        progress: 0,
        message: '',
        error: errorMessage
      })
      
      if (onUploadError) {
        onUploadError(errorMessage)
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">OMR 악보 업로드</h3>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PDF 파일 <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>파일 선택</span>
                  <input
                    id="file-upload"
                    ref={fileInputRef}
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={uploadStatus.isUploading}
                  />
                </label>
                <p className="pl-1">또는 드래그 앤 드롭</p>
              </div>
              <p className="text-xs text-gray-500">PDF 파일만 업로드 가능 (최대 50MB)</p>
            </div>
          </div>
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">
              선택된 파일: <span className="font-medium">{selectedFile.name}</span>
            </p>
          )}
          {errors.file && (
            <p className="mt-1 text-sm text-red-600">{errors.file}</p>
          )}
        </div>

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
            disabled={uploadStatus.isUploading}
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
            disabled={uploadStatus.isUploading}
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
              disabled={uploadStatus.isUploading || isLoadingCategories}
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
                disabled={uploadStatus.isUploading}
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
              disabled={uploadStatus.isUploading}
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

        {/* Upload Progress */}
        {uploadStatus.isUploading && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-900">{uploadStatus.message}</p>
              <span className="text-sm text-blue-700">{uploadStatus.progress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadStatus.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {uploadStatus.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">{uploadStatus.error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            size="lg"
            disabled={
              uploadStatus.isUploading ||
              !formData.title.trim() ||
              !formData.composer.trim() ||
              !selectedFile
            }
            className="px-8"
          >
            {uploadStatus.isUploading ? '업로드 중...' : 'OMR 처리 시작'}
          </Button>
        </div>
      </form>
    </div>
  )
}