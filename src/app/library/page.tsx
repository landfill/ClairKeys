'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import { Button } from '@/components/ui'
import AuthGuard from '@/components/auth/AuthGuard'
import { LibrarySheetMusicList } from '@/components/library/LibrarySheetMusicList'

export default function LibraryPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'all' | 'categories'>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'created'>('recent')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId)
    if (categoryId !== null) {
      setActiveTab('categories')
    }
  }

  const handleSheetMusicMove = (sheetMusicId: number, newCategoryId: number | null) => {
    setRefreshKey(prev => prev + 1)
  }

  const handleCategoryChange = () => {
    setRefreshKey(prev => prev + 1)
  }

  const tabs = [
    { id: 'all' as const, label: '전체 악보', icon: '📚' },
    { id: 'categories' as const, label: '카테고리별', icon: '📁' }
  ]

  return (
    <AuthGuard>
      <MainLayout>
        <PageHeader
          title="내 악보"
          description="업로드한 악보를 관리하고 연습하세요"
        />
        
        <Container className="py-8">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-8 p-1 tab-navigation rounded-lg max-w-md">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id === 'all') {
                    setSelectedCategoryId(null)
                  }
                }}
                className={`
                  flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search and Filter Bar */}
          <div className="mb-8 space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="곡명, 저작자로 검색..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'created')}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[140px]"
              >
                <option value="recent">최근 수정</option>
                <option value="name">이름순</option>
                <option value="created">생성일순</option>
              </select>
            </div>
          </div>

          {/* Content Area */}
          <div className="min-h-screen">
            <LibrarySheetMusicList
              selectedCategoryId={activeTab === 'categories' ? selectedCategoryId : null}
              searchQuery={searchQuery}
              sortBy={sortBy}
              showCategorySelector={activeTab === 'categories'}
              onCategorySelect={handleCategorySelect}
              onSheetMusicMove={handleSheetMusicMove}
              onCategoryChange={handleCategoryChange}
              key={refreshKey}
            />
          </div>

          {/* Floating Action Button */}
          <div className="fixed bottom-6 right-6 z-10">
            <button
              onClick={() => router.push('/upload')}
              className="w-14 h-14 fab-button text-white rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="새 악보 업로드"
              aria-label="새 악보 업로드"
            >
              <span className="text-xl">+</span>
            </button>
          </div>
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}