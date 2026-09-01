'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import AuthGuard from '@/components/auth/AuthGuard'
import { LibrarySheetMusicList } from '@/components/library/LibrarySheetMusicList'
import { Button } from '@/components/ui'

export default function LibraryPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'all' | 'categories'>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'created'>('recent')

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId)
    if (categoryId !== null) {
      setActiveTab('categories')
    }
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
        
        <Container className="py-8" size="full">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-8 p-1 tab-navigation rounded-full max-w-md">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id === 'all') {
                    setSelectedCategoryId(null)
                  }
                }}
                variant={activeTab === tab.id ? 'outline' : 'ghost'}
                size="sm"
                className="flex-1"
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Button>
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
                  className="w-full rounded-2xl border border-rule-strong bg-surface py-3 pl-10 pr-4 text-ink shadow-sm transition-colors"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'created')}
                  className="h-12 min-w-[160px] appearance-none rounded-full border border-rule-strong bg-surface pl-4 pr-10 text-ink shadow-sm transition-colors hover:bg-surface-muted"
                  aria-label="악보 정렬"
                >
                  <option value="recent">최근 수정</option>
                  <option value="name">이름순</option>
                  <option value="created">생성일순</option>
                </select>
                <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted">
                  <path d="m5.5 7.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
              </div>
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
            />
          </div>

          {/* Floating Action Button */}
          <div className="fixed bottom-6 right-6 z-10">
            <Button
              onClick={() => router.push('/upload')}
              className="h-14 w-14 p-0 text-xl fab-button"
              title="새 악보 업로드"
              aria-label="새 악보 업로드"
            >
              +
            </Button>
          </div>
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
