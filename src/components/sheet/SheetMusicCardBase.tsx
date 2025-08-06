'use client'

import { SheetMusicWithCategory } from '@/types/sheet-music'
import Card from '@/components/ui/Card'
import { 
  SheetMusicDisplayProps, 
  SheetMusicInteractiveProps 
} from '@/types/interfaces'

// Interface Segregation 적용: 표시 관련 기능만 포함
export interface SheetMusicInfoProps extends SheetMusicDisplayProps {}

export interface SheetMusicCardBaseProps 
  extends SheetMusicInfoProps, 
          SheetMusicInteractiveProps {
  children?: React.ReactNode
}

export function SheetMusicInfo({
  sheetMusic,
  showMetadata = true,
  showDate = true,
  className = ''
}: SheetMusicInfoProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with title and composer */}
      <div className="space-y-1">
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
          {sheetMusic.title}
        </h3>
        <p className="text-gray-600 text-sm">{sheetMusic.composer}</p>
      </div>

      {/* Category and visibility info */}
      {showMetadata && (
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-gray-100 rounded-full">
            📁 {sheetMusic.category?.name || '미분류'}
          </span>
          <span className={`px-2 py-1 rounded-full ${
            sheetMusic.isPublic 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {sheetMusic.isPublic ? '🌍 공개' : '🔒 비공개'}
          </span>
        </div>
      )}

      {/* Date */}
      {showDate && (
        <p className="text-xs text-gray-500">
          {formatDate(sheetMusic.createdAt)}
        </p>
      )}
    </div>
  )
}

export function SheetMusicCardBase({
  sheetMusic,
  showMetadata = true,
  showDate = true,
  className = '',
  children,
  onClick,
  isHoverable = true
}: SheetMusicCardBaseProps) {
  const cardClasses = `
    ${isHoverable ? 'group hover:shadow-lg transition-shadow duration-200' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `

  return (
    <Card className={cardClasses} onClick={onClick}>
      <div className="p-4 space-y-3">
        <SheetMusicInfo
          sheetMusic={sheetMusic}
          showMetadata={showMetadata}
          showDate={showDate}
        />
        {children}
      </div>
    </Card>
  )
}