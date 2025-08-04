'use client'

import { useState, useCallback } from 'react'

export interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
  success: boolean
}

export interface FileUploadOptions {
  maxSizeBytes?: number
  acceptedTypes?: string[]
  onSuccess?: (result: any) => void
  onError?: (error: string) => void
}

export function useFileUpload(options: FileUploadOptions = {}) {
  const {
    maxSizeBytes = 10 * 1024 * 1024, // 10MB
    acceptedTypes = ['application/pdf'],
    onSuccess,
    onError
  } = options

  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false
  })

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return 'PDF 파일만 업로드 가능합니다.'
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024))
      return `파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB까지 업로드 가능합니다.`
    }

    // Check if file is empty
    if (file.size === 0) {
      return '빈 파일은 업로드할 수 없습니다.'
    }

    // Check file name
    if (!file.name || file.name.trim() === '') {
      return '유효하지 않은 파일명입니다.'
    }

    return null
  }, [acceptedTypes, maxSizeBytes])

  const uploadFile = useCallback(async (
    file: File,
    metadata: {
      title: string
      composer: string
      category?: string
      categoryId?: number | null
      isPublic?: boolean
    }
  ) => {
    // Validate file first
    const validationError = validateFile(file)
    if (validationError) {
      setUploadState(prev => ({
        ...prev,
        error: validationError,
        success: false
      }))
      onError?.(validationError)
      return null
    }

    // Validate metadata
    if (!metadata.title.trim()) {
      const error = '곡명을 입력해주세요.'
      setUploadState(prev => ({
        ...prev,
        error,
        success: false
      }))
      onError?.(error)
      return null
    }

    if (!metadata.composer.trim()) {
      const error = '저작자를 입력해주세요.'
      setUploadState(prev => ({
        ...prev,
        error,
        success: false
      }))
      onError?.(error)
      return null
    }

    // Reset state and start upload
    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
      success: false
    })

    try {
      // Create FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', metadata.title.trim())
      formData.append('composer', metadata.composer.trim())
      
      // Handle category - prefer categoryId over category string
      if (metadata.categoryId) {
        formData.append('category', metadata.categoryId.toString())
      } else if (metadata.category) {
        formData.append('category', metadata.category)
      }
      
      formData.append('isPublic', String(metadata.isPublic || false))

      // Simulate upload progress (in real implementation, you'd use XMLHttpRequest for progress tracking)
      const progressInterval = setInterval(() => {
        setUploadState(prev => {
          if (prev.progress >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return {
            ...prev,
            progress: prev.progress + Math.random() * 10
          }
        })
      }, 200)

      // Make the actual upload request
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `업로드 실패: ${response.status}`)
      }

      const result = await response.json()

      // Complete the upload
      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        success: true
      })

      onSuccess?.(result)
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.'
      
      setUploadState({
        isUploading: false,
        progress: 0,
        error: errorMessage,
        success: false
      })

      onError?.(errorMessage)
      return null
    }
  }, [validateFile, onSuccess, onError])

  const resetUpload = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      success: false
    })
  }, [])

  return {
    uploadState,
    uploadFile,
    resetUpload,
    validateFile
  }
}