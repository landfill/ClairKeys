'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import { SheetMusicSearch } from '@/components/search'
import { PublicSheetMusicBrowser } from '@/components/browse'
import { SheetMusicWithOwner } from '@/types/sheet-music'

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'search'>('browse')
  const router = useRouter()

  const handleSheetMusicClick = (sheetMusic: SheetMusicWithOwner) => {
    // Navigate to the sheet music page
    router.push(`/sheet/${sheetMusic.id}`)
  }

  const tabs = [
    { id: 'browse' as const, label: '탐색' },
    { id: 'search' as const, label: '검색' }
  ]

  return (
    <MainLayout>
      <PageHeader
        title="공개 악보 탐색"
        description="다른 사용자들이 공유한 악보를 찾아보고 연습해보세요"
      />
      
      <Container className="py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 p-1 bg-gray-100 rounded-lg max-w-md mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-screen">
          {activeTab === 'browse' && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-lg text-gray-600">
                  인기 있는 악보와 최신 악보를 둘러보세요
                </h2>
              </div>
              
              <PublicSheetMusicBrowser 
                onSheetMusicClick={handleSheetMusicClick}
                showSections={['featured', 'popular', 'recent']}
                className="w-full"
              />
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-lg text-gray-600">
                  원하는 악보를 검색하고 필터를 사용해 찾아보세요
                </h2>
              </div>
              
              <SheetMusicSearch 
                onResultClick={handleSheetMusicClick}
                showFilters={true}
                defaultPublicOnly={true}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="fixed bottom-6 right-6">
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => router.push('/upload')}
              className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
              title="악보 업로드"
            >
              <span className="text-xl">+</span>
            </button>
          </div>
        </div>
      </Container>
    </MainLayout>
  )
}
