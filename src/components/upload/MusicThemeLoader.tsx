'use client'

import { useEffect, useState } from 'react'
import { UploadStage } from './MultiStageUploadUI'

export interface MusicThemeLoaderProps {
  isActive: boolean
  stage: UploadStage
}

const MUSIC_SYMBOLS = ['♪', '♫', '♬', '♩', '♭', '♯', '♮', '𝄞', '𝄢', '𝄡']

const STAGE_THEMES = {
  upload: {
    color: 'text-blue-500',
    symbols: ['⬆️', '📁', '💾', '☁️'],
    message: '파일을 업로드하고 있어요...'
  },
  parsing: {
    color: 'text-purple-500',
    symbols: ['📄', '🔍', '📖', '💭'],
    message: 'PDF를 분석하고 있어요...'
  },
  omr: {
    color: 'text-green-500',
    symbols: ['🎼', '👁️', '🤖', '🧠'],
    message: '악보를 디지털로 변환하고 있어요...'
  },
  validation: {
    color: 'text-yellow-500',
    symbols: ['✅', '🔍', '📊', '⚖️'],
    message: '데이터를 검증하고 있어요...'
  },
  generation: {
    color: 'text-indigo-500',
    symbols: ['🎹', '✨', '🎬', '🎨'],
    message: '애니메이션을 생성하고 있어요...'
  }
} as const

export function MusicThemeLoader({ isActive, stage }: MusicThemeLoaderProps) {
  const [currentSymbolIndex, setCurrentSymbolIndex] = useState(0)
  const [floatingNotes, setFloatingNotes] = useState<Array<{
    id: number
    symbol: string
    x: number
    y: number
    duration: number
    delay: number
  }>>([])

  // Rotating symbol animation
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setCurrentSymbolIndex(prev => (prev + 1) % MUSIC_SYMBOLS.length)
    }, 500)

    return () => clearInterval(interval)
  }, [isActive])

  // Floating notes animation
  useEffect(() => {
    if (!isActive) return

    const createFloatingNote = () => {
      const id = Date.now() + Math.random()
      const symbol = MUSIC_SYMBOLS[Math.floor(Math.random() * MUSIC_SYMBOLS.length)]
      const x = Math.random() * 300
      const y = 100
      const duration = 3000 + Math.random() * 2000
      const delay = Math.random() * 1000

      return { id, symbol, x, y, duration, delay }
    }

    // Create initial notes
    const initialNotes = Array.from({ length: 5 }, createFloatingNote)
    setFloatingNotes(initialNotes)

    // Add new notes periodically
    const interval = setInterval(() => {
      setFloatingNotes(prev => {
        // Remove old notes and add new ones
        const now = Date.now()
        const activeNotes = prev.filter(note => now - note.id < note.duration + note.delay)
        
        if (activeNotes.length < 8) {
          return [...activeNotes, createFloatingNote()]
        }
        return activeNotes
      })
    }, 800)

    return () => {
      clearInterval(interval)
      setFloatingNotes([])
    }
  }, [isActive])

  if (!isActive) return null

  const theme = STAGE_THEMES[stage as keyof typeof STAGE_THEMES]
  if (!theme) return null

  return (
    <div className="relative w-full h-32 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
      {/* Floating musical notes background */}
      <div className="absolute inset-0">
        {floatingNotes.map((note) => (
          <div
            key={note.id}
            className={`absolute text-2xl opacity-20 animate-bounce ${theme.color}`}
            style={{
              left: `${note.x}px`,
              top: `${note.y}px`,
              animationDelay: `${note.delay}ms`,
              animationDuration: `${note.duration}ms`
            }}
          >
            {note.symbol}
          </div>
        ))}
      </div>

      {/* Main loader content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center space-y-4">
        {/* Pulsing musical symbol */}
        <div className={`text-6xl animate-pulse ${theme.color}`}>
          {MUSIC_SYMBOLS[currentSymbolIndex]}
        </div>

        {/* Stage-specific animation */}
        <div className="flex items-center space-x-2">
          {theme.symbols.map((symbol, index) => (
            <div
              key={symbol}
              className={`text-3xl animate-bounce ${theme.color}`}
              style={{
                animationDelay: `${index * 0.2}s`,
                animationDuration: '1.5s'
              }}
            >
              {symbol}
            </div>
          ))}
        </div>

        {/* Loading message */}
        <p className={`text-lg font-medium ${theme.color.replace('text-', 'text-').replace('-500', '-700')}`}>
          {theme.message}
        </p>

        {/* Animated dots */}
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full animate-pulse ${theme.color.replace('text-', 'bg-')}`}
              style={{
                animationDelay: `${i * 0.3}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>

      {/* Animated border */}
      <div className="absolute inset-0 border-2 border-transparent">
        <div className={`absolute inset-0 border-2 border-dashed animate-spin ${theme.color.replace('text-', 'border-')} rounded-lg`} 
             style={{ animationDuration: '8s' }} />
      </div>
    </div>
  )
}