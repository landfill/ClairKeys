'use client'

import { useState } from 'react'
import { MainLayout, PageHeader, Container } from '@/components/layout'
import { Card, Button } from '@/components/ui'

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')

  const filters = [
    { id: 'all', label: '전체' },
    { id: 'classical', label: '클래식' },
    { id: 'pop', label: '팝송' },
    { id: 'jazz', label: '재즈' },
    { id: 'other', label: '기타' }
  ]

  const popularSheets = [
    {
      id: 1,
      title: 'Canon in D',
      composer: 'Pachelbel',
      uploader: 'user123',
      views: 1200,
      rating: 4.8,
      category: 'classical'
    },
    {
      id: 2,
      title: 'Für Elise',
      composer: 'Beethoven',
      uploader: 'pianist_pro',
      views: 856,
      rating: 4.9,
      category: 'classical'
    },
    {
      id: 3,
      title: 'River Flows in You',
      composer: 'Yiruma',
      uploader: 'music_lover',
      views: 743,
      rating: 4.7,
      category: 'pop'
    },
    {
      id: 4,
      title: 'Moonlight Sonata',
      composer: 'Beethoven',
      uploader: 'classical_fan',
      views: 692,
      rating: 4.9,
      category: 'classical'
    }
  ]

  const filteredSheets = selectedFilter === 'all' 
    ? popularSheets 
    : popularSheets.filter(sheet => sheet.category === selectedFilter)

  return (
    <MainLayout>
      <PageHeader
        title="공개 악보 탐색"
        description="다른 사용자들이 공유한 악보를 찾아보세요"
      />
      
      <Container className="py-8">
        {/* Search and Filters */}
        <div className="space-y-6 mb-8">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="곡명, 저작자로 검색..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${selectedFilter === filter.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Popular Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">인기 악보</h2>
          <div className="space-y-4">
            {filteredSheets.map((sheet) => (
              <Card key={sheet.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🎵</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {sheet.title}
                      </h3>
                      <p className="text-gray-600">{sheet.composer}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center">
                          <span className="mr-1">👤</span>
                          {sheet.uploader}
                        </span>
                        <span className="flex items-center">
                          <span className="mr-1">👁</span>
                          {sheet.views.toLocaleString()}
                        </span>
                        <span className="flex items-center">
                          <span className="mr-1">⭐</span>
                          {sheet.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      미리보기
                    </Button>
                    <Button size="sm">
                      연습하기
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Categories Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">카테고리별 탐색</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filters.slice(1).map((category) => (
              <Card 
                key={category.id} 
                className="text-center hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedFilter(category.id)}
              >
                <div className="text-3xl mb-2">
                  {category.id === 'classical' && '🎼'}
                  {category.id === 'pop' && '🎤'}
                  {category.id === 'jazz' && '🎷'}
                  {category.id === 'other' && '🎵'}
                </div>
                <h3 className="font-semibold text-gray-900">{category.label}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {Math.floor(Math.random() * 50) + 10}개 악보
                </p>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </MainLayout>
  )
}