'use client'

import { useState } from 'react'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import { Button } from '@/components/ui'
import AuthGuard from '@/components/auth/AuthGuard'
import Link from 'next/link'
import { CategoryManager } from '@/components/category/CategoryManager'
import { CategorySheetMusicList } from '@/components/category/CategorySheetMusicList'

// Sidebar content for library page
function LibrarySidebar({ 
  selectedCategoryId, 
  onCategorySelect,
  onCategoryChange
}: { 
  selectedCategoryId: number | null
  onCategorySelect: (categoryId: number | null) => void
  onCategoryChange?: () => void
}) {
  return (
    <div className="space-y-6">
      <CategoryManager
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={onCategorySelect}
        showCreateButton={true}
        onCategoryChange={onCategoryChange}
      />
    </div>
  )
}

export default function LibraryPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId)
  }

  const handleSheetMusicMove = (sheetMusicId: number, newCategoryId: number | null) => {
    // Trigger refresh of both category list and sheet music list
    setRefreshKey(prev => prev + 1)
  }

  const handleCategoryChange = () => {
    // Trigger refresh when categories are created, updated, or deleted
    setRefreshKey(prev => prev + 1)
  }

  return (
    <AuthGuard>
      <MainLayout 
        showSidebar={true} 
        sidebarContent={
          <LibrarySidebar 
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={handleCategorySelect}
            onCategoryChange={handleCategoryChange}
          />
        }
      >
        <PageHeader
          title="내 악보"
          description="업로드한 악보를 관리하고 연습하세요"
          actions={
            <Link href="/upload">
              <Button>새 악보 업로드</Button>
            </Link>
          }
        />
        
        <Container className="py-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="곡명, 저작자로 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Category-based Sheet Music List */}
          <CategorySheetMusicList
            key={refreshKey}
            selectedCategoryId={selectedCategoryId}
            onSheetMusicMove={handleSheetMusicMove}
          />
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}