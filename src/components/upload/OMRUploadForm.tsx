'use client'

import React, { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { useCategories } from '@/hooks/useCategories'

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
  const { categories } = useCategories()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    composer: '',
    categoryId: '',
    isPublic: false
  })
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0,
    message: ''
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setUploadStatus({
          isUploading: false,
          progress: 0,
          message: '',
          error: 'Please select a PDF file'
        })
        return
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setUploadStatus({
          isUploading: false,
          progress: 0,
          message: '',
          error: 'File size must be less than 50MB'
        })
        return
      }
      
      setSelectedFile(file)
      setUploadStatus({ isUploading: false, progress: 0, message: '' })
      
      // Auto-fill title from filename if not already set
      if (!formData.title) {
        const nameWithoutExtension = file.name.replace(/\.pdf$/i, '')
        setFormData(prev => ({ ...prev, title: nameWithoutExtension }))
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
        error: 'Please log in to upload sheet music'
      })
      return
    }

    if (!selectedFile) {
      setUploadStatus({
        isUploading: false,
        progress: 0,
        message: '',
        error: 'Please select a PDF file'
      })
      return
    }

    if (!formData.title.trim()) {
      setUploadStatus({
        isUploading: false,
        progress: 0,
        message: '',
        error: 'Please enter a title'
      })
      return
    }

    try {
      setUploadStatus({
        isUploading: true,
        progress: 10,
        message: 'Preparing upload...'
      })

      // Prepare form data
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)
      uploadFormData.append('title', formData.title.trim())
      uploadFormData.append('composer', formData.composer.trim() || 'Unknown')
      if (formData.categoryId) {
        uploadFormData.append('categoryId', formData.categoryId)
      }
      uploadFormData.append('isPublic', formData.isPublic.toString())

      setUploadStatus({
        isUploading: true,
        progress: 30,
        message: 'Uploading PDF...'
      })

      // Upload to OMR service
      const response = await fetch('/api/omr/upload', {
        method: 'POST',
        body: uploadFormData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()

      setUploadStatus({
        isUploading: true,
        progress: 100,
        message: 'Upload successful! OMR processing started...'
      })

      // Call success callback
      if (onUploadStart) {
        onUploadStart({
          sheetMusicId: result.sheetMusicId,
          jobId: result.jobId
        })
      }

      // Reset form
      setFormData({
        title: '',
        composer: '',
        categoryId: '',
        isPublic: false
      })
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      setUploadStatus({
        isUploading: false,
        progress: 0,
        message: 'Upload completed successfully!'
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Upload Sheet Music (PDF)</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Input */}
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
            PDF File *
          </label>
          <input
            ref={fileInputRef}
            type="file"
            id="file"
            accept=".pdf"
            onChange={handleFileSelect}
            disabled={uploadStatus.isUploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            required
          />
          {selectedFile && (
            <p className="mt-1 text-sm text-gray-600">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            disabled={uploadStatus.isUploading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder="Enter the title of the piece"
            required
          />
        </div>

        {/* Composer */}
        <div>
          <label htmlFor="composer" className="block text-sm font-medium text-gray-700 mb-2">
            Composer
          </label>
          <input
            type="text"
            id="composer"
            value={formData.composer}
            onChange={(e) => setFormData(prev => ({ ...prev, composer: e.target.value }))}
            disabled={uploadStatus.isUploading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder="Enter the composer name (optional)"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            id="category"
            value={formData.categoryId}
            onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
            disabled={uploadStatus.isUploading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Select a category (optional)</option>
            {categories.map(category => (
              <option key={category.id} value={category.id.toString()}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Public Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPublic"
            checked={formData.isPublic}
            onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
            disabled={uploadStatus.isUploading}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
          />
          <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
            Make this sheet music public (others can discover and use it)
          </label>
        </div>

        {/* Progress and Status */}
        {(uploadStatus.isUploading || uploadStatus.message || uploadStatus.error) && (
          <div className="mt-4">
            {uploadStatus.isUploading && (
              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{uploadStatus.message}</span>
                  <span>{uploadStatus.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadStatus.progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {uploadStatus.message && !uploadStatus.isUploading && (
              <p className="text-green-600 text-sm">{uploadStatus.message}</p>
            )}
            
            {uploadStatus.error && (
              <p className="text-red-600 text-sm">{uploadStatus.error}</p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!selectedFile || !formData.title.trim() || uploadStatus.isUploading}
          className="w-full"
        >
          {uploadStatus.isUploading ? 'Processing...' : 'Upload and Process'}
        </Button>
      </form>

      {/* Help Text */}
      <div className="mt-6 text-sm text-gray-600">
        <p className="font-medium mb-2">What happens next:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Your PDF will be uploaded and processed using optical music recognition (OMR)</li>
          <li>The system will convert your sheet music into an interactive piano learning experience</li>
          <li>You'll be able to practice with falling notes, finger numbers, and tempo control</li>
          <li>Processing typically takes 30-60 seconds depending on the complexity of the score</li>
        </ol>
      </div>
    </div>
  )
}