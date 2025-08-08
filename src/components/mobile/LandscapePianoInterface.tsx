'use client'

/**
 * Landscape Piano Interface Component
 * 가로모드 전용 88키 피아노 인터페이스
 * Features: 가로 스크롤, 줌, 최소한의 컨트롤
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useMobileKeyboardSize } from '@/hooks/useMobileKeyboardSize'
import PianoKeyboard from '@/components/piano/PianoKeyboard'
import MobileTouchOptimizer from '@/components/mobile/MobileTouchOptimizer'
import MobileGestures from '@/components/mobile/MobileGestures'

interface LandscapePianoInterfaceProps {
  onKeyPress?: (keyId: string) => void
  onKeyRelease?: (keyId: string) => void
  highlightedKeys?: string[]
  pressedKeys?: string[]
  animationActiveKeys?: string[]
  showKeyLabels?: boolean
  enableZoom?: boolean
  enableAutoScroll?: boolean
  enableGestures?: boolean
  className?: string
}

interface KeyRange {
  start: number // 0-87 (88 keys total)
  end: number
  label: string
}

const KEY_RANGES: KeyRange[] = [
  { start: 0, end: 11, label: 'C1-B1' },
  { start: 12, end: 23, label: 'C2-B2' },
  { start: 24, end: 35, label: 'C3-B3' },
  { start: 36, end: 47, label: 'C4-B4' }, // Middle C
  { start: 48, end: 59, label: 'C5-B5' },
  { start: 60, end: 71, label: 'C6-B6' },
  { start: 72, end: 87, label: 'C7-C8' }
]

export default function LandscapePianoInterface({
  onKeyPress,
  onKeyRelease,
  highlightedKeys = [],
  pressedKeys = [],
  animationActiveKeys = [],
  showKeyLabels = false,
  enableZoom = true,
  enableAutoScroll = true,
  enableGestures = true,
  className = ''
}: LandscapePianoInterfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pianoRef = useRef<HTMLDivElement>(null)
  
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [selectedRange, setSelectedRange] = useState<KeyRange | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartScroll, setDragStartScroll] = useState(0)
  
  const { 
    screenSize, 
    isMobileDevice, 
    isLandscape,
    canFitFullKeyboard 
  } = useMobileKeyboardSize()

  // Calculate optimal dimensions for landscape mode
  const pianoConfig = useMemo(() => {
    const availableWidth = screenSize.width
    const availableHeight = screenSize.height - 100 // Reserve space for controls
    
    // Base keyboard dimensions (for 88 keys)
    const baseKeyWidth = 20 // Base width per white key
    const totalWhiteKeys = 52 // 88 keys = 52 white + 36 black
    const baseKeyboardWidth = totalWhiteKeys * baseKeyWidth
    
    // Calculate scale to fit screen width at minimum zoom
    const minScale = Math.min(1.0, availableWidth / (baseKeyboardWidth * 0.8))
    const maxScale = Math.min(2.5, availableWidth / (baseKeyboardWidth * 0.3))
    
    return {
      keyHeight: Math.min(availableHeight * 0.7, 200),
      keyboardWidth: baseKeyboardWidth,
      minZoom: minScale,
      maxZoom: maxScale,
      whiteKeyWidth: baseKeyWidth,
      blackKeyWidth: baseKeyWidth * 0.6,
      blackKeyHeight: Math.min(availableHeight * 0.45, 130)
    }
  }, [screenSize])

  // Handle zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(pianoConfig.maxZoom, prev + 0.2))
  }, [pianoConfig.maxZoom])

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(pianoConfig.minZoom, prev - 0.2))
  }, [pianoConfig.minZoom])
  
  const setZoom = useCallback((zoom: number) => {
    setZoomLevel(Math.max(pianoConfig.minZoom, Math.min(pianoConfig.maxZoom, zoom)))
  }, [pianoConfig.minZoom, pianoConfig.maxZoom])

  const resetZoom = useCallback(() => {
    setZoomLevel(1.0)
    setScrollPosition(0)
  }, [])

  // Handle range selection
  const handleRangeSelect = useCallback((range: KeyRange) => {
    setSelectedRange(range)
    
    if (enableAutoScroll && pianoRef.current) {
      const keyboardWidth = pianoConfig.keyboardWidth * zoomLevel
      const rangeStartPercent = range.start / 88
      const targetScrollPosition = (keyboardWidth - screenSize.width) * rangeStartPercent
      
      setScrollPosition(Math.max(0, Math.min(targetScrollPosition, keyboardWidth - screenSize.width)))
    }
  }, [enableAutoScroll, pianoConfig.keyboardWidth, zoomLevel, screenSize.width])

  // Handle touch/mouse dragging for horizontal scroll
  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true)
    setDragStartX(clientX)
    setDragStartScroll(scrollPosition)
  }, [scrollPosition])

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return
    
    const deltaX = dragStartX - clientX
    const newScrollPosition = dragStartScroll + deltaX
    const maxScroll = Math.max(0, (pianoConfig.keyboardWidth * zoomLevel) - screenSize.width)
    
    setScrollPosition(Math.max(0, Math.min(newScrollPosition, maxScroll)))
  }, [isDragging, dragStartX, dragStartScroll, pianoConfig.keyboardWidth, zoomLevel, screenSize.width])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  // Handle gesture-based controls
  const handleGesture = useCallback((gesture: any) => {
    if (!enableGestures) return
    
    switch (gesture.type) {
      case 'pinch':
        if (enableZoom && gesture.scale) {
          const newZoom = zoomLevel * gesture.scale
          setZoom(newZoom)
        }
        break
        
      case 'swipe':
        if (gesture.direction === 'left' || gesture.direction === 'right') {
          const deltaX = gesture.direction === 'left' ? 100 : -100
          const keyboardWidth = pianoConfig.keyboardWidth * zoomLevel
          const maxScroll = Math.max(0, keyboardWidth - screenSize.width)
          const newScrollPosition = scrollPosition + deltaX
          setScrollPosition(Math.max(0, Math.min(newScrollPosition, maxScroll)))
        }
        break
        
      case 'doubleClick':
        if (enableZoom) {
          resetZoom()
        }
        break
    }
  }, [enableGestures, enableZoom, zoomLevel, setZoom, pianoConfig.keyboardWidth, screenSize.width, scrollPosition, resetZoom])

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX)
  }, [handleDragStart])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientX)
  }, [handleDragMove])

  const handleMouseUp = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX)
    }
  }, [handleDragStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragMove(e.touches[0].clientX)
    }
  }, [handleDragMove])

  const handleTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // Auto-scroll to active keys
  useEffect(() => {
    if (!enableAutoScroll || animationActiveKeys.length === 0) return

    // Find the leftmost active key to scroll to
    const activeKeyIndices = animationActiveKeys
      .map(keyId => {
        // Convert keyId to piano key index (0-87)
        // This is a simplified conversion - you might need to adjust based on your key naming
        const match = keyId.match(/([A-G][#b]?)(\d+)/)
        if (!match) return -1
        
        const [, note, octave] = match
        const octaveNum = parseInt(octave)
        
        // Simplified note to index conversion
        const noteOffsets: { [key: string]: number } = {
          'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 
          'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 
          'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        }
        
        return (octaveNum - 1) * 12 + (noteOffsets[note] || 0)
      })
      .filter(index => index >= 0 && index < 88)

    if (activeKeyIndices.length === 0) return

    const leftmostKeyIndex = Math.min(...activeKeyIndices)
    const keyboardWidth = pianoConfig.keyboardWidth * zoomLevel
    const targetPercent = Math.max(0, (leftmostKeyIndex - 5) / 88) // Scroll a bit before the key
    const targetScrollPosition = (keyboardWidth - screenSize.width) * targetPercent
    
    setScrollPosition(Math.max(0, Math.min(targetScrollPosition, keyboardWidth - screenSize.width)))
  }, [enableAutoScroll, animationActiveKeys, pianoConfig.keyboardWidth, zoomLevel, screenSize.width])

  // Global mouse/touch event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleDragMove(e.clientX)
    const handleGlobalMouseUp = () => handleDragEnd()
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) handleDragMove(e.touches[0].clientX)
    }
    const handleGlobalTouchEnd = () => handleDragEnd()

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false })
      document.addEventListener('touchend', handleGlobalTouchEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('touchmove', handleGlobalTouchMove)
      document.removeEventListener('touchend', handleGlobalTouchEnd)
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  return (
    <div className={`landscape-piano-interface w-full h-full relative ${className}`}>
      {/* Top Control Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gray-800 bg-opacity-90 backdrop-blur-sm">
        <div className="flex justify-between items-center px-4 py-2">
          {/* Range Selection */}
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm font-medium">범위:</span>
            <select 
              value={selectedRange?.label || ''}
              onChange={(e) => {
                const range = KEY_RANGES.find(r => r.label === e.target.value)
                if (range) handleRangeSelect(range)
              }}
              className="bg-gray-700 text-white text-sm px-2 py-1 rounded border-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              {KEY_RANGES.map(range => (
                <option key={range.label} value={range.label}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Zoom Controls */}
          {enableZoom && (
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm">줌:</span>
              <button
                onClick={handleZoomOut}
                className="text-white hover:text-blue-300 p-1 rounded transition-colors"
                disabled={zoomLevel <= pianoConfig.minZoom}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"/>
                </svg>
              </button>
              <span className="text-white text-sm min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="text-white hover:text-blue-300 p-1 rounded transition-colors"
                disabled={zoomLevel >= pianoConfig.maxZoom}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
                </svg>
              </button>
              <button
                onClick={resetZoom}
                className="text-white hover:text-blue-300 text-sm px-2 py-1 rounded transition-colors"
                title="줌 리셋 (더블탭 가능)"
              >
                리셋
              </button>
            </div>
          )}

          {/* Info */}
          <div className="text-white text-sm">
            88키 전체 피아노
          </div>
        </div>
      </div>

      {/* Piano Container */}
      <div 
        ref={containerRef}
        className="piano-scroll-container absolute inset-0 pt-12 overflow-hidden cursor-grab select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {enableGestures ? (
          <MobileGestures
            onGesture={handleGesture}
            onPinch={(scale) => enableZoom && setZoom(zoomLevel * scale)}
            onSwipe={(direction, velocity) => {
              if (direction === 'left' || direction === 'right') {
                const deltaX = direction === 'left' ? Math.min(200, velocity * 0.5) : -Math.min(200, velocity * 0.5)
                const keyboardWidth = pianoConfig.keyboardWidth * zoomLevel
                const maxScroll = Math.max(0, keyboardWidth - screenSize.width)
                const newScrollPosition = scrollPosition + deltaX
                setScrollPosition(Math.max(0, Math.min(newScrollPosition, maxScroll)))
              }
            }}
            onDoubleClick={() => enableZoom && resetZoom()}
            enableSwipe={true}
            enablePinch={enableZoom}
            enableDoubleClick={enableZoom}
            className="w-full h-full"
          >
        ) : null}
        
        <MobileTouchOptimizer
          enableHapticFeedback={isMobileDevice}
          touchSensitivity="medium"
          preventScrolling={true}
        >
          <div 
            ref={pianoRef}
            className="piano-wrapper relative"
            style={{
              width: `${pianoConfig.keyboardWidth * zoomLevel}px`,
              height: `${pianoConfig.keyHeight}px`,
              transform: `translateX(-${scrollPosition}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
          >
            <PianoKeyboard
              onKeyPress={onKeyPress}
              onKeyRelease={onKeyRelease}
              highlightedKeys={highlightedKeys}
              pressedKeys={pressedKeys}
              animationActiveKeys={animationActiveKeys}
              height={pianoConfig.keyHeight}
              keyWidth={pianoConfig.whiteKeyWidth * zoomLevel}
              showKeyLabels={showKeyLabels}
              className="landscape-keyboard"
            />
          </div>
        </MobileTouchOptimizer>
        
        {enableGestures ? (
          </MobileGestures>
        ) : null}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-gray-800 bg-opacity-70 rounded-full px-3 py-1">
          <div className="flex items-center justify-between text-white text-sm">
            <span>위치:</span>
            <div className="flex-1 mx-3 bg-gray-600 rounded-full h-2 relative">
              <div 
                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-200"
                style={{ 
                  width: `${Math.min(100, (screenSize.width / (pianoConfig.keyboardWidth * zoomLevel)) * 100)}%`,
                  transform: `translateX(${(scrollPosition / Math.max(1, (pianoConfig.keyboardWidth * zoomLevel) - screenSize.width)) * 100}%)`
                }}
              />
            </div>
            <span>{Math.round((scrollPosition / Math.max(1, (pianoConfig.keyboardWidth * zoomLevel) - screenSize.width)) * 100)}%</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .landscape-piano-interface {
          touch-action: none;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        
        .piano-scroll-container::-webkit-scrollbar {
          display: none;
        }
        
        .landscape-keyboard {
          pointer-events: auto;
        }
        
        .landscape-keyboard .piano-key {
          transition: all 0.1s ease;
        }
        
        .landscape-keyboard .piano-key:active {
          transform: scale(0.98);
        }
        
        /* 제스처 피드백 */
        .piano-scroll-container.gesture-active {
          background: rgba(59, 130, 246, 0.05);
          transition: background-color 0.2s ease;
        }
      `}</style>
    </div>
  )
}