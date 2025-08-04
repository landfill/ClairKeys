'use client'

import { useState, useEffect } from 'react'
import { useSheetMusic } from '@/hooks/useSheetMusic'
import { SheetMusicList } from '@/components/sheet/SheetMusicList'
import { SheetMusicEditForm } from '@/components/sheet/SheetMusicEditForm'
import { SheetMusicWithCategory, UpdateSheetMusicRequest } from '@/types/sheet-music'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

interface Category {
  id: number
  name: string
}

export default function DemoSheetCRUDPage() {
  const router = useRouter()
  const {
    sheetMusic,
    loading,
    error,
    fetchUserSheetMusic,
    updateSheetMusic,
    deleteSheetMusic
  } = useSheetMusic()

  const [categories, setCategories] = useState<Category[]>([])
  const [editingSheet, setEditingSheet] = useState<SheetMusicWithCategory | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>()

  useEffect(() => {
    fetchUserSheetMusic()
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const handleSearch = () => {
    fetchUserSheetMusic({
      search: searchTerm || undefined,
      categoryId: selectedCategory
    })
  }

  const handleEdit = (sheet: SheetMusicWithCategory) => {
    setEditingSheet(sheet)
  }

  const handleSaveEdit = async (data: UpdateSheetMusicRequest) => {
    if (!editingSheet) return

    try {
      await updateSheetMusic(editingSheet.id, data)
      setEditingSheet(null)
    } catch (error) {
      console.error('Failed to update sheet music:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingSheet(null)
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteSheetMusic(id)
    } catch (error) {
      console.error('Failed to delete sheet music:', error)
    }
  }

  const handlePlay = (id: number) => {
    router.push(`/sheet/${id}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Sheet Music CRUD Demo
        </h1>
        <p className="text-gray-600">
          This page demonstrates the complete CRUD functionality for sheet music metadata management.
        </p>
      </div>

      {/* Search and Filter Section */}
      <Card className="mb-6">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Search & Filter</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search by title or composer
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter search term..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleSearch}>
              Search
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory(undefined)
                fetchUserSheetMusic()
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <div className="p-4">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        </Card>
      )}

      {/* Edit Form */}
      {editingSheet && (
        <Card className="mb-6">
          <div className="p-4">
            <SheetMusicEditForm
              sheetMusic={editingSheet}
              categories={categories}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              loading={loading}
            />
          </div>
        </Card>
      )}

      {/* Sheet Music List */}
      <Card>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Your Sheet Music ({sheetMusic.length})
            </h2>
            <Button
              onClick={() => router.push('/upload')}
              className="bg-green-600 hover:bg-green-700"
            >
              + Upload New Sheet
            </Button>
          </div>
          
          <SheetMusicList
            sheetMusic={sheetMusic}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPlay={handlePlay}
            loading={loading}
          />
        </div>
      </Card>

      {/* API Documentation */}
      <Card className="mt-8">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">API Endpoints</h2>
          <div className="space-y-4 text-sm">
            <div>
              <strong>GET /api/sheet</strong> - Get user's sheet music list
              <div className="text-gray-600 ml-4">
                Query params: categoryId, search, public
              </div>
            </div>
            <div>
              <strong>POST /api/sheet</strong> - Create new sheet music
              <div className="text-gray-600 ml-4">
                Body: title, composer, categoryId, isPublic, animationDataUrl
              </div>
            </div>
            <div>
              <strong>GET /api/sheet/[id]</strong> - Get specific sheet music
            </div>
            <div>
              <strong>PUT /api/sheet/[id]</strong> - Update sheet music metadata
              <div className="text-gray-600 ml-4">
                Body: title, composer, categoryId, isPublic
              </div>
            </div>
            <div>
              <strong>DELETE /api/sheet/[id]</strong> - Delete sheet music
            </div>
            <div>
              <strong>GET /api/sheet/public</strong> - Get public sheet music list
              <div className="text-gray-600 ml-4">
                Query params: search, categoryId, limit, offset
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}