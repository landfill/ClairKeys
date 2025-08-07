'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { SheetMusicWithOwner } from '@/types/sheet-music'

interface PublicSheetMusicBrowserProps {
  onSheetMusicClick?: (sheetMusic: SheetMusicWithOwner) => void
  showSections?: Array<'featured' | 'popular' | 'recent'>
  className?: string
}

export default function PublicSheetMusicBrowser({
  onSheetMusicClick,
  showSections = ['featured', 'popular', 'recent'],
  className = ''
}: PublicSheetMusicBrowserProps) {
  const [popularSheets, setPopularSheets] = useState<SheetMusicWithOwner[]>([])
  const [recentSheets, setRecentSheets] = useState<SheetMusicWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPublicSheets()
  }, [])

  const loadPublicSheets = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load recent sheets
      const recentResponse = await fetch('/api/sheet/public?limit=8&sortBy=newest')
      if (!recentResponse.ok) throw new Error('Failed to load recent sheets')
      const recentData = await recentResponse.json()
      setRecentSheets(recentData.sheetMusic || [])

      // For now, use same data for popular (in real app, this would be based on play count, likes, etc.)
      setPopularSheets(recentData.sheetMusic?.slice(0, 6) || [])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sheets')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">악보를 불러오는 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">오류가 발생했습니다: {error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadPublicSheets}
          className="mt-3"
        >
          다시 시도
        </Button>
      </div>
    )
  }

  return (
    <div className={`public-sheet-music-browser space-y-8 ${className}`}>
      {/* Featured Section */}
      {showSections.includes('featured') && popularSheets.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">🌟 추천 악보</h2>
            <Button variant="outline" size="sm">
              전체 보기
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularSheets.slice(0, 3).map((sheetMusic) => (
              <div
                key={sheetMusic.id}
                className="group bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
                onClick={() => onSheetMusicClick?.(sheetMusic)}
              >
                {/* Placeholder for sheet music preview image */}
                <div className="h-40 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🎼</div>
                    <p className="text-sm text-gray-600">악보 미리보기</p>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {sheetMusic.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {sheetMusic.composer}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {sheetMusic.owner?.name || '익명'}
                    </span>
                    <span>
                      {formatDate(sheetMusic.createdAt)}
                    </span>
                  </div>
                  
                  {sheetMusic.category && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {sheetMusic.category.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Popular Section */}
      {showSections.includes('popular') && popularSheets.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">🔥 인기 악보</h2>
            <Button variant="outline" size="sm">
              전체 보기
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularSheets.slice(0, 4).map((sheetMusic, index) => (
              <div
                key={sheetMusic.id}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => onSheetMusicClick?.(sheetMusic)}
              >
                {/* Ranking Number */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mr-4 ${
                  index === 0 ? 'bg-yellow-500' : 
                  index === 1 ? 'bg-gray-400' :
                  index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {sheetMusic.title}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    {sheetMusic.composer}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    {sheetMusic.category && (
                      <span className="text-xs text-blue-600">
                        {sheetMusic.category.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {sheetMusic.owner?.name || '익명'}
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-3"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSheetMusicClick?.(sheetMusic)
                  }}
                >
                  재생
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Section */}
      {showSections.includes('recent') && recentSheets.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">🆕 최신 악보</h2>
            <Button variant="outline" size="sm">
              전체 보기
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentSheets.slice(0, 8).map((sheetMusic) => (
              <div
                key={sheetMusic.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer p-4"
                onClick={() => onSheetMusicClick?.(sheetMusic)}
              >
                <div className="text-center mb-3">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center text-lg mb-2">
                    🎵
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(sheetMusic.createdAt)}
                  </div>
                </div>
                
                <h3 className="font-medium text-gray-900 text-sm mb-1 text-center truncate">
                  {sheetMusic.title}
                </h3>
                <p className="text-gray-600 text-xs text-center truncate">
                  {sheetMusic.composer}
                </p>
                
                <div className="mt-3 text-center">
                  {sheetMusic.category && (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {sheetMusic.category.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {recentSheets.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎼</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            아직 공개된 악보가 없습니다
          </h3>
          <p className="text-gray-600">
            첫 번째 악보를 업로드하고 다른 사용자들과 공유해보세요!
          </p>
        </div>
      )}
    </div>
  )
}