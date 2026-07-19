'use client'

import { useState, useRef, useEffect } from 'react'
import { Category } from '@/types/category'
import { SheetMusicMovableProps } from '@/types/interfaces'

export interface MoveMenuProps {
  categories: Category[]
  currentCategoryId: number | null
  onMove: (categoryId: number | null) => void
  onClose: () => void
  isVisible: boolean
  position?: 'left' | 'right'
  className?: string
}

export function MoveMenu({
  categories,
  currentCategoryId,
  onMove,
  onClose,
  isVisible,
  position = 'right',
  className = ''
}: MoveMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVisible, onClose])

  const handleMove = (categoryId: number | null) => {
    onMove(categoryId)
    onClose()
  }

  if (!isVisible) return null

  const positionClasses = {
    left: 'left-0',
    right: 'right-0'
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-10" onClick={onClose} />
      
      {/* Menu */}
      <div 
        ref={menuRef}
        className={`
          absolute ${positionClasses[position]} top-full mt-1 
          bg-white border border-gray-200 rounded-md shadow-lg z-20 
          min-w-[180px] max-h-60 overflow-y-auto
          ${className}
        `}
      >
        <div className="py-1">
          {/* Move to uncategorized */}
          <button
            onClick={() => handleMove(null)}
            disabled={currentCategoryId === null}
            className={`
              w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors
              ${currentCategoryId === null 
                ? 'bg-blue-50 text-blue-700 cursor-default' 
                : 'hover:bg-gray-100'
              }
            `}
          >
            <span className="text-lg">📁</span>
            <span>미분류</span>
            {currentCategoryId === null && (
              <span className="text-xs text-blue-500 ml-auto">(현재)</span>
            )}
          </button>

          {/* Separator */}
          {categories.length > 0 && (
            <div className="border-t border-gray-100 my-1" />
          )}

          {/* Categories */}
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleMove(category.id)}
              disabled={currentCategoryId === category.id}
              className={`
                w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors
                ${currentCategoryId === category.id 
                  ? 'bg-blue-50 text-blue-700 cursor-default' 
                  : 'hover:bg-gray-100'
                }
              `}
            >
              <span className="text-lg">📁</span>
              <span className="truncate">{category.name}</span>
              {currentCategoryId === category.id && (
                <span className="text-xs text-blue-500 ml-auto">(현재)</span>
              )}
            </button>
          ))}

          {/* Empty state */}
          {categories.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              사용 가능한 카테고리가 없습니다
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Interface Segregation 적용: 이동 관련 기능만 포함
export interface SheetMusicMoveMenuProps extends SheetMusicMovableProps {
  trigger?: React.ReactNode
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
}

export function SheetMusicMoveMenu({
  categories = [],
  currentCategoryId,
  onMove,
  trigger,
  buttonProps = {},
  position = 'right'
}: SheetMusicMoveMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  const handleMove = (categoryId: number | null) => {
    onMove(categoryId)
    setIsOpen(false)
  }

  const defaultTrigger = (
    <button
      onClick={handleToggle}
      className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      {...buttonProps}
    >
      📁 이동
    </button>
  )

  return (
    <div className="relative">
      {trigger ? (
        <div onClick={handleToggle}>
          {trigger}
        </div>
      ) : (
        defaultTrigger
      )}
      
      <MoveMenu
        categories={categories}
        currentCategoryId={currentCategoryId}
        onMove={handleMove}
        onClose={() => setIsOpen(false)}
        isVisible={isOpen}
        position={position}
      />
    </div>
  )
}