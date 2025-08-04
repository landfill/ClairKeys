'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui'

export interface FileUploadProps {
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  selectedFile: File | null
  isUploading?: boolean
  uploadProgress?: number
  error?: string | null
  maxSizeBytes?: number
  acceptedTypes?: string[]
  className?: string
}

export default function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  isUploading = false,
  uploadProgress = 0,
  error = null,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['application/pdf'],
  className = ''
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    return null
  }, [acceptedTypes, maxSizeBytes])

  const handleFileSelection = useCallback((file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      // You might want to show this error in the parent component
      console.error('File validation error:', validationError)
      return
    }

    onFileSelect(file)
  }, [validateFile, onFileSelect])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isUploading) return

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [isUploading])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (isUploading) return

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }, [isUploading, handleFileSelection])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0])
    }
  }, [handleFileSelection])

  const handleClick = useCallback(() => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [isUploading])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getDropzoneClasses = () => {
    let classes = `
      border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
      ${className}
    `

    if (isUploading) {
      classes += ' border-blue-300 bg-blue-50 cursor-not-allowed'
    } else if (dragActive) {
      classes += ' border-blue-500 bg-blue-50 scale-105'
    } else if (selectedFile && !error) {
      classes += ' border-green-500 bg-green-50'
    } else if (error) {
      classes += ' border-red-500 bg-red-50'
    } else {
      classes += ' border-gray-300 hover:border-gray-400 hover:bg-gray-50'
    }

    return classes
  }

  return (
    <div className="space-y-4">
      <div
        className={getDropzoneClasses()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="text-4xl">⏳</div>
            <h3 className="text-lg font-semibold text-blue-700">업로드 중...</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-blue-600">{uploadProgress}% 완료</p>
          </div>
        ) : selectedFile && !error ? (
          <div className="space-y-4">
            <div className="text-4xl">✅</div>
            <h3 className="text-lg font-semibold text-green-700">파일이 선택되었습니다</h3>
            <div className="space-y-2">
              <p className="font-medium text-green-600">{selectedFile.name}</p>
              <p className="text-sm text-green-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onFileRemove()
              }}
              size="sm"
            >
              다른 파일 선택
            </Button>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="text-4xl">❌</div>
            <h3 className="text-lg font-semibold text-red-700">오류가 발생했습니다</h3>
            <p className="text-red-600">{error}</p>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onFileRemove()
              }}
              size="sm"
            >
              다시 시도
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-4xl">📄</div>
            <h3 className="text-lg font-semibold text-gray-900">
              {dragActive ? 'PDF 파일을 여기에 놓으세요' : 'PDF 파일을 드래그하거나 클릭하세요'}
            </h3>
            <div className="space-y-2">
              <p className="text-gray-600">
                최대 {Math.round(maxSizeBytes / (1024 * 1024))}MB까지 업로드 가능
              </p>
              <p className="text-sm text-gray-500">
                지원 형식: PDF
              </p>
            </div>
            <Button variant="primary" size="sm">
              파일 선택
            </Button>
          </div>
        )}
      </div>

      {/* File validation info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• PDF 형식의 악보 파일만 업로드 가능합니다</p>
        <p>• 파일 크기는 최대 {Math.round(maxSizeBytes / (1024 * 1024))}MB입니다</p>
        <p>• 업로드된 원본 PDF는 처리 후 자동으로 삭제됩니다</p>
      </div>
    </div>
  )
}