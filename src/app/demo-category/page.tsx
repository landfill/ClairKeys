'use client'

import { useState } from 'react'
import { CategoryManager } from '@/components/category/CategoryManager'
import { CategorySheetMusicList } from '@/components/category/CategorySheetMusicList'

export default function DemoCategoryPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">카테고리 관리 시스템 데모</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar with Category Manager */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <CategoryManager
                selectedCategoryId={selectedCategoryId}
                onCategorySelect={setSelectedCategoryId}
                showCreateButton={true}
              />
            </div>
          </div>

          {/* Main content with Sheet Music List */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              <CategorySheetMusicList
                selectedCategoryId={selectedCategoryId}
                onSheetMusicMove={(sheetMusicId, newCategoryId) => {
                  console.log(`Moved sheet music ${sheetMusicId} to category ${newCategoryId}`)
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}