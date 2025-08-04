'use client'

import { useState } from 'react'
import { SheetMusicWithCategory } from '@/types/sheet-music'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface SheetMusicListProps {
  sheetMusic: SheetMusicWithCategory[]
  onEdit: (sheet: SheetMusicWithCategory) => void
  onDelete: (id: number) => void
  onPlay: (id: number) => void
  loading?: boolean
}

export function SheetMusicList({
  sheetMusic,
  onEdit,
  onDelete,
  onPlay,
  loading = false
}: SheetMusicListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingId(id)
      await onDelete(id)
    } catch (error) {
      console.error('Failed to delete sheet music:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded mb-4 w-3/4"></div>
            <div className="flex space-x-2">
              <div className="h-8 bg-gray-200 rounded flex-1"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (sheetMusic.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">🎵</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No sheet music found</h3>
        <p className="text-gray-500">Upload your first PDF sheet music to get started!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sheetMusic.map((sheet) => (
        <Card key={sheet.id} className="hover:shadow-lg transition-shadow">
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg text-gray-900 truncate">
                {sheet.title}
              </h3>
              {sheet.isPublic && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2">
                  Public
                </span>
              )}
            </div>
            
            <p className="text-gray-600 text-sm mb-2 truncate">
              by {sheet.composer}
            </p>
            
            {sheet.category && (
              <p className="text-blue-600 text-xs mb-2">
                📁 {sheet.category.name}
              </p>
            )}
            
            <p className="text-gray-400 text-xs mb-4">
              Updated {formatDate(sheet.updatedAt)}
            </p>
            
            <div className="flex space-x-2">
              <Button
                onClick={() => onPlay(sheet.id)}
                className="flex-1 text-sm"
              >
                ▶ Play
              </Button>
              <Button
                variant="secondary"
                onClick={() => onEdit(sheet)}
                className="text-sm"
              >
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(sheet.id, sheet.title)}
                disabled={deletingId === sheet.id}
                className="text-sm"
              >
                {deletingId === sheet.id ? '...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}