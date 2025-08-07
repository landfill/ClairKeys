'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'

interface PublicToggleProps {
  sheetMusicId: number
  initialIsPublic: boolean
  onToggle?: (isPublic: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export default function PublicToggle({
  sheetMusicId,
  initialIsPublic,
  onToggle,
  disabled = false,
  size = 'md',
  showLabel = true,
  className = ''
}: PublicToggleProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = async () => {
    if (loading || disabled) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/sheet/${sheetMusicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isPublic: !isPublic
        })
      })

      if (!response.ok) {
        throw new Error('공개 설정 변경에 실패했습니다')
      }

      const newIsPublic = !isPublic
      setIsPublic(newIsPublic)
      onToggle?.(newIsPublic)

    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  return (
    <div className={`public-toggle ${className}`}>
      <div className="flex items-center space-x-2">
        {showLabel && (
          <span className={`text-gray-700 ${
            size === 'sm' ? 'text-xs' : 
            size === 'lg' ? 'text-base' : 'text-sm'
          }`}>
            공개 설정:
          </span>
        )}
        
        <button
          onClick={handleToggle}
          disabled={loading || disabled}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isPublic ? 'bg-blue-600' : 'bg-gray-200'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
              transition duration-200 ease-in-out
              ${isPublic ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
        
        <span className={`font-medium ${
          isPublic ? 'text-green-700' : 'text-gray-600'
        } ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
          {isPublic ? '공개' : '비공개'}
        </span>
        
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        )}
      </div>
      
      {error && (
        <div className="mt-1 text-red-600 text-xs">
          {error}
        </div>
      )}
      
      {showLabel && (
        <div className={`mt-1 ${
          size === 'sm' ? 'text-xs' : 'text-sm'
        } text-gray-500`}>
          {isPublic 
            ? '다른 사용자들이 검색하고 재생할 수 있습니다' 
            : '나만 볼 수 있습니다'
          }
        </div>
      )}
    </div>
  )
}

// Bulk public toggle for multiple sheets
interface BulkPublicToggleProps {
  sheetMusicIds: number[]
  onComplete?: (results: Array<{ id: number; success: boolean; isPublic?: boolean }>) => void
  className?: string
}

export function BulkPublicToggle({ 
  sheetMusicIds, 
  onComplete, 
  className = '' 
}: BulkPublicToggleProps) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Array<{ id: number; success: boolean; isPublic?: boolean }>>([])

  const handleBulkToggle = async (makePublic: boolean) => {
    if (loading) return

    try {
      setLoading(true)
      const newResults: Array<{ id: number; success: boolean; isPublic?: boolean }> = []

      // Process each sheet music
      for (const id of sheetMusicIds) {
        try {
          const response = await fetch(`/api/sheet/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              isPublic: makePublic
            })
          })

          if (response.ok) {
            newResults.push({ id, success: true, isPublic: makePublic })
          } else {
            newResults.push({ id, success: false })
          }
        } catch (err) {
          newResults.push({ id, success: false })
        }
      }

      setResults(newResults)
      onComplete?.(newResults)

    } catch (err) {
      console.error('Bulk toggle error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`bulk-public-toggle space-y-3 ${className}`}>
      <div className="flex space-x-2">
        <Button
          onClick={() => handleBulkToggle(true)}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? '처리 중...' : '모두 공개로 변경'}
        </Button>
        
        <Button
          onClick={() => handleBulkToggle(false)}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? '처리 중...' : '모두 비공개로 변경'}
        </Button>
      </div>
      
      {results.length > 0 && (
        <div className="text-sm">
          <p className="text-gray-600">
            성공: {results.filter(r => r.success).length}개, 
            실패: {results.filter(r => !r.success).length}개
          </p>
        </div>
      )}
    </div>
  )
}