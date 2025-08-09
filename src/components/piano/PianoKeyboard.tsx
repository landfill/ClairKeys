'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PianoKey, PianoKeyboardProps } from '@/types/piano'
import { keyNumberToNote, isBlackKey, PIANO_KEYS } from '@/utils/piano'
import { useAudio } from '@/hooks/useAudio'

export default function PianoKeyboard({ 
  onKeyPress, 
  onKeyRelease,
  highlightedKeys = [], 
  pressedKeys = [],
  animationActiveKeys = [],
  className = '',
  height = 200
}: PianoKeyboardProps) {
  const [isClient, setIsClient] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height })
  const [keys, setKeys] = useState<PianoKey[]>([])
  const [devicePixelRatio, setDevicePixelRatio] = useState(1)
  const renderingRef = useRef(false) // 중복 렌더링 방지
  const initializationRef = useRef(false) // 초기화 상태 추적
  
  // React 상태 대신 useRef로 관리하여 리렌더링 방지
  const activeKeysRef = useRef<Set<string>>(new Set())
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set()) // 외부 props를 위해 유지

  // Audio integration
  const { playNote, releaseNote, initializeAudio, isReady } = useAudio()

  // 클라이언트 사이드에서만 렌더링
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Generate 88 piano keys (A0 to C8)
  const generateKeys = useCallback((width: number, height: number): PianoKey[] => {
    const keys: PianoKey[] = []
    const whiteKeyWidth = width / PIANO_KEYS.WHITE_KEYS
    const blackKeyWidth = whiteKeyWidth * 0.6
    const blackKeyHeight = height * 0.6
    
    let whiteKeyIndex = 0
    
    for (let keyNumber = 1; keyNumber <= PIANO_KEYS.TOTAL_KEYS; keyNumber++) {
      const noteWithOctave = keyNumberToNote(keyNumber)
      const match = noteWithOctave.match(/^([A-G]#?)(\d+)$/)
      if (!match) continue
      
      const [, noteName, octaveStr] = match
      const octave = parseInt(octaveStr, 10)
      const isBlack = isBlackKey(noteWithOctave)
      
      if (!isBlack) {
        // White key
        const x = whiteKeyIndex * whiteKeyWidth
        keys.push({
          note: noteName,
          octave,
          keyNumber,
          isBlack: false,
          x,
          y: 0,
          width: whiteKeyWidth - 1,
          height
        })
        whiteKeyIndex++
      } else {
        // Black key - position between white keys
        const x = (whiteKeyIndex - 0.3) * whiteKeyWidth
        keys.push({
          note: noteName,
          octave,
          keyNumber,
          isBlack: true,
          x,
          y: 0,
          width: blackKeyWidth,
          height: blackKeyHeight
        })
      }
    }
    
    return keys
  }, [])

  // Handle responsive canvas sizing
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current || renderingRef.current) {
      return
    }
    
    const containerWidth = containerRef.current.clientWidth
    const newWidth = Math.max(containerWidth, 800) // Minimum width for 88 keys
    const ratio = window.devicePixelRatio || 1
    
    // Prevent unnecessary updates
    if (canvasSize.width === newWidth && canvasSize.height === height && devicePixelRatio === ratio) {
      return
    }
    
    renderingRef.current = true
    
    // Batch state updates to prevent multiple renders
    const newKeys = generateKeys(newWidth, height)
    
    setCanvasSize({ width: newWidth, height })
    setDevicePixelRatio(ratio)
    setKeys(newKeys)
    
    // Mark as initialized after first successful render
    setTimeout(() => {
      initializationRef.current = true
      renderingRef.current = false
    }, 50)
  }, [height, generateKeys])

  // Initialize and handle window resize
  useEffect(() => {
    let mounted = true
    
    // Multiple attempts to ensure container is properly sized
    const attemptInitialization = (attempt = 1) => {
      if (!mounted) return
      
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        
        if (containerWidth > 0) {
          updateCanvasSize()
        } else if (attempt < 5) {
          // Retry if container width is 0
          setTimeout(() => attemptInitialization(attempt + 1), 100 * attempt)
        }
      } else if (attempt < 5) {
        setTimeout(() => attemptInitialization(attempt + 1), 100 * attempt)
      }
    }
    
    // Start with immediate attempt and backup timer
    attemptInitialization(1)
    
    const handleResize = () => {
      if (mounted) {
        updateCanvasSize()
      }
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      mounted = false
      window.removeEventListener('resize', handleResize)
    }
  }, [updateCanvasSize]) // updateCanvasSize 다시 추가 - 필요함

  // Performance optimization: Track dirty keys for selective redraw
  const dirtyKeysRef = useRef<Set<string>>(new Set())
  const previousStateRef = useRef<{
    highlightedKeys: string[]
    pressedKeys: string[]
    activeKeys: Set<string>
    animationActiveKeys: string[]
  }>({
    highlightedKeys: [],
    pressedKeys: [],
    activeKeys: new Set(),
    animationActiveKeys: []
  })

  // Offscreen canvas for static elements (performance optimization)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const staticElementsCachedRef = useRef(false)

  // Create offscreen canvas for static elements
  const createOffscreenCanvas = useCallback(() => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas')
    }
    return offscreenCanvasRef.current
  }, [])

  // Draw static elements (white keys background) to offscreen canvas
  const drawStaticElements = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear and draw white keys background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    
    // Draw white key borders
    keys.filter(key => !key.isBlack).forEach(key => {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.strokeRect(key.x, key.y, key.width, key.height)
    })
  }, [keys])

  // Optimized key drawing with dirty rect technique  
  const drawKeys = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = canvasSize
    
    if (keys.length === 0) return
    
    // Check if we need full redraw or can use dirty rect optimization
    const currentState = {
      highlightedKeys,
      pressedKeys,
      activeKeys,
      animationActiveKeys
    }
    
    const previousState = previousStateRef.current
    let needsFullRedraw = false
    
    // Detect changes and mark dirty keys
    const newDirtyKeys = new Set<string>()
    
    // Check for changes in each key state
    const allCurrentKeys = new Set([
      ...highlightedKeys,
      ...pressedKeys,
      ...Array.from(activeKeys),
      ...animationActiveKeys
    ])
    
    const allPreviousKeys = new Set([
      ...previousState.highlightedKeys,
      ...previousState.pressedKeys,
      ...Array.from(previousState.activeKeys),
      ...previousState.animationActiveKeys
    ])
    
    // Mark keys that changed state as dirty
    allCurrentKeys.forEach(keyId => {
      if (!allPreviousKeys.has(keyId)) {
        newDirtyKeys.add(keyId)
      }
    })
    
    allPreviousKeys.forEach(keyId => {
      if (!allCurrentKeys.has(keyId)) {
        newDirtyKeys.add(keyId)
      }
    })
    
    // Check if individual key states changed
    keys.forEach(key => {
      const keyId = `${key.note}${key.octave}`
      const wasHighlighted = previousState.highlightedKeys.includes(keyId)
      const wasPressed = previousState.pressedKeys.includes(keyId) || previousState.activeKeys.has(keyId)
      const wasAnimationActive = previousState.animationActiveKeys.includes(keyId)
      
      const isHighlighted = highlightedKeys.includes(keyId)
      const isPressed = pressedKeys.includes(keyId) || activeKeys.has(keyId)
      const isAnimationActive = animationActiveKeys.includes(keyId)
      
      if (wasHighlighted !== isHighlighted || 
          wasPressed !== isPressed || 
          wasAnimationActive !== isAnimationActive) {
        newDirtyKeys.add(keyId)
      }
    })
    
    // If too many keys are dirty or first render, do full redraw
    if (newDirtyKeys.size > 20 || !staticElementsCachedRef.current) {
      needsFullRedraw = true
    }
    
    
    if (needsFullRedraw) {
      // Full redraw
      ctx.clearRect(0, 0, width, height)
      
      // Cache static elements in offscreen canvas
      const offscreenCanvas = createOffscreenCanvas()
      offscreenCanvas.width = width * devicePixelRatio
      offscreenCanvas.height = height * devicePixelRatio
      offscreenCanvas.style.width = `${width}px`
      offscreenCanvas.style.height = `${height}px`
      
      const offscreenCtx = offscreenCanvas.getContext('2d')
      if (offscreenCtx) {
        offscreenCtx.scale(devicePixelRatio, devicePixelRatio)
        drawStaticElements(offscreenCtx, width, height)
        staticElementsCachedRef.current = true
      }
      
      // Draw all keys
      drawAllKeys(ctx)
    } else {
      // Selective redraw - only dirty keys
      newDirtyKeys.forEach(keyId => {
        const key = keys.find(k => `${k.note}${k.octave}` === keyId)
        if (key) {
          drawSingleKey(ctx, key, keyId)
        }
      })
    }
    
    // Update previous state
    previousStateRef.current = {
      highlightedKeys: [...highlightedKeys],
      pressedKeys: [...pressedKeys],
      activeKeys: new Set(activeKeys),
      animationActiveKeys: [...animationActiveKeys]
    }
  }, [canvasSize, keys, highlightedKeys, pressedKeys, activeKeys, animationActiveKeys, devicePixelRatio, createOffscreenCanvas, drawStaticElements])

  // Draw all keys (used in full redraw)
  const drawAllKeys = useCallback((ctx: CanvasRenderingContext2D) => {
    
    // Use offscreen canvas for static background if available
    if (staticElementsCachedRef.current && offscreenCanvasRef.current) {
      ctx.drawImage(offscreenCanvasRef.current, 0, 0)
    }
    
    const whiteKeys = keys.filter(key => !key.isBlack)
    const blackKeys = keys.filter(key => key.isBlack)
    
    // Draw white keys with states
    whiteKeys.forEach(key => {
      const keyId = `${key.note}${key.octave}`
      drawSingleKey(ctx, key, keyId, false) // false = don't clear background
    })
    
    // Draw black keys on top
    blackKeys.forEach(key => {
      const keyId = `${key.note}${key.octave}`
      drawSingleKey(ctx, key, keyId, true) // true = clear background
    })
    
  }, [keys])

  // Draw single key (optimized for selective updates)
  const drawSingleKey = useCallback((ctx: CanvasRenderingContext2D, key: PianoKey, keyId: string, clearBackground = true) => {
    const isHighlighted = highlightedKeys.includes(keyId)
    const isPressed = pressedKeys.includes(keyId) || activeKeysRef.current.has(keyId)
    const isAnimationActive = animationActiveKeys.includes(keyId)
    
    // Clear the key area if needed
    if (clearBackground) {
      ctx.clearRect(key.x - 1, key.y - 1, key.width + 2, key.height + 2)
      
      // Restore background from offscreen canvas if available
      if (staticElementsCachedRef.current && offscreenCanvasRef.current && !key.isBlack) {
        ctx.drawImage(
          offscreenCanvasRef.current,
          key.x, key.y, key.width, key.height,
          key.x, key.y, key.width, key.height
        )
      }
    }
    
    // Determine key color and style
    let fillStyle: string
    let strokeStyle = '#000000'
    let lineWidth = 1
    let hasShadow = false
    
    if (key.isBlack) {
      if (isPressed) {
        fillStyle = '#404040'
        strokeStyle = '#808080'
        lineWidth = 2
      } else if (isAnimationActive) {
        fillStyle = '#66bb6a'
        strokeStyle = '#4caf50'
        lineWidth = 3
        hasShadow = true
      } else if (isHighlighted) {
        fillStyle = '#ffc107'
        strokeStyle = '#ff8f00'
        lineWidth = 2
      } else {
        fillStyle = '#000000'
      }
    } else {
      if (isPressed) {
        fillStyle = '#e0e0e0'
        strokeStyle = '#666666'
        lineWidth = 2
      } else if (isAnimationActive) {
        fillStyle = '#4caf50'
        strokeStyle = '#2e7d32'
        lineWidth = 3
        hasShadow = true
      } else if (isHighlighted) {
        fillStyle = '#ffeb3b'
        strokeStyle = '#f57f17'
        lineWidth = 2
      } else {
        fillStyle = '#ffffff'
      }
    }
    
    // Draw key background
    ctx.fillStyle = fillStyle
    ctx.fillRect(key.x, key.y, key.width, key.height)
    
    // Draw key border
    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = lineWidth
    
    if (hasShadow) {
      ctx.shadowColor = key.isBlack ? '#66bb6a' : '#4caf50'
      ctx.shadowBlur = 8
    }
    
    ctx.strokeRect(key.x, key.y, key.width, key.height)
    
    // Draw inner border for special states
    if (isPressed || isAnimationActive || isHighlighted) {
      ctx.strokeRect(key.x + 1, key.y + 1, key.width - 2, key.height - 2)
    }
    
    // Reset shadow
    if (hasShadow) {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
    }
  }, [highlightedKeys, pressedKeys, activeKeys, animationActiveKeys])

  // Stable canvas rendering with RAF
  const drawCanvasRef = useRef<number>()
  
  const scheduleCanvasDraw = useCallback(() => {
    if (drawCanvasRef.current) {
      cancelAnimationFrame(drawCanvasRef.current)
    }
    
    drawCanvasRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas || keys.length === 0) {
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return
      }

      // Prevent rendering if canvas dimensions are invalid
      if (canvasSize.width <= 0 || canvasSize.height <= 0) {
        return
      }

      // Set canvas size for high DPI displays
      const scaledWidth = canvasSize.width * devicePixelRatio
      const scaledHeight = canvasSize.height * devicePixelRatio
      
      // Only update canvas size if changed
      if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
        canvas.width = scaledWidth
        canvas.height = scaledHeight
        canvas.style.width = `${canvasSize.width}px`
        canvas.style.height = `${canvasSize.height}px`
        
        ctx.scale(devicePixelRatio, devicePixelRatio)
      }
      
      // Clear and draw
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
      
      try {
        drawKeys(ctx)
      } catch (error) {
        console.error('Canvas drawing error:', error)
      }
    })
  }, [canvasSize, devicePixelRatio, keys, drawKeys])

  // Initial canvas setup
  useEffect(() => {
    if (keys.length > 0) {
      scheduleCanvasDraw()
    }
  }, [canvasSize, devicePixelRatio, keys, scheduleCanvasDraw])
  
  // Key state changes - activeKeys removed to prevent flickering
  useEffect(() => {
    if (keys.length > 0) {
      scheduleCanvasDraw()
    }
  }, [highlightedKeys, pressedKeys, animationActiveKeys, scheduleCanvasDraw])

  // Find key at coordinates
  const findKeyAtPosition = (x: number, y: number): PianoKey | null => {
    // Check black keys first (they're on top)
    for (const key of keys.filter(k => k.isBlack)) {
      if (x >= key.x && x <= key.x + key.width && 
          y >= key.y && y <= key.y + key.height) {
        return key
      }
    }
    
    // Then check white keys
    for (const key of keys.filter(k => !k.isBlack)) {
      if (x >= key.x && x <= key.x + key.width && 
          y >= key.y && y <= key.y + key.height) {
        return key
      }
    }
    
    return null
  }


  // Throttle event handling for performance
  const eventThrottleRef = useRef<number | null>(null)
  const lastEventTimeRef = useRef<number>(0)
  const EVENT_THROTTLE_MS = 16 // ~60fps

  // Optimized event coordinate calculation with caching
  const eventCacheRef = useRef<{
    rect: DOMRect | null
    timestamp: number
    scaleX: number
    scaleY: number
  }>({
    rect: null,
    timestamp: 0,
    scaleX: 1,
    scaleY: 1
  })

  // Get coordinates from event with caching
  const getEventCoordinates = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const now = Date.now()
    const cache = eventCacheRef.current
    
    // Update cache if stale (every 100ms)
    if (!cache.rect || now - cache.timestamp > 100) {
      const rect = canvas.getBoundingClientRect()
      cache.rect = rect
      cache.timestamp = now
      cache.scaleX = canvasSize.width / rect.width
      cache.scaleY = canvasSize.height / rect.height
    }
    
    if ('touches' in event) {
      if (event.touches.length === 0) return null
      const touch = event.touches[0]
      return {
        x: (touch.clientX - cache.rect!.left) * cache.scaleX,
        y: (touch.clientY - cache.rect!.top) * cache.scaleY
      }
    } else {
      return {
        x: (event.clientX - cache.rect!.left) * cache.scaleX,
        y: (event.clientY - cache.rect!.top) * cache.scaleY
      }
    }
  }, [canvasSize])

  // Direct canvas update function
  const updateKeyVisual = useCallback((keyId: string, isPressed: boolean) => {
    if (!keys.length) return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const key = keys.find(k => `${k.note}${k.octave}` === keyId)
    if (!key) return

    // Update visual state immediately without React re-render
    try {
      drawSingleKey(ctx, key, keyId, true)
    } catch (error) {
      console.error('Error updating key visual:', error)
    }
  }, [keys, drawSingleKey])

  // Handle key press with throttling
  const handleKeyDown = useCallback(async (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    
    const now = Date.now()
    
    // Throttle events for performance
    if (now - lastEventTimeRef.current < EVENT_THROTTLE_MS) {
      return
    }
    lastEventTimeRef.current = now
    
    // Initialize audio on first interaction if not ready
    if (!isReady) {
      try {
        await initializeAudio()
      } catch (error) {
        console.error('Failed to initialize audio:', error)
      }
    }
    
    const coords = getEventCoordinates(event)
    if (!coords) return

    const key = findKeyAtPosition(coords.x, coords.y)
    if (!key) return

    const keyId = `${key.note}${key.octave}`
    
    if (!activeKeysRef.current.has(keyId)) {
      // Update ref state (no re-render)
      activeKeysRef.current.add(keyId)
      
      // Update React state for external props (causes re-render but we'll handle it)
      setActiveKeys(new Set(activeKeysRef.current))
      
      // Update visual immediately
      updateKeyVisual(keyId, true)
      
      // Play audio
      playNote(keyId)
      
      // Call external handler
      onKeyPress?.(keyId)
    }
  }, [isReady, initializeAudio, getEventCoordinates, findKeyAtPosition, playNote, onKeyPress, updateKeyVisual])

  // Handle key release with throttling
  const handleKeyUp = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    
    const now = Date.now()
    if (now - lastEventTimeRef.current < EVENT_THROTTLE_MS) {
      return
    }
    lastEventTimeRef.current = now
    
    const coords = getEventCoordinates(event)
    if (!coords) return

    const key = findKeyAtPosition(coords.x, coords.y)
    if (!key) return

    const keyId = `${key.note}${key.octave}`
    
    if (activeKeysRef.current.has(keyId)) {
      // Update ref state (no re-render)
      activeKeysRef.current.delete(keyId)
      
      // Update React state for external props
      setActiveKeys(new Set(activeKeysRef.current))
      
      // Update visual immediately
      updateKeyVisual(keyId, false)
      
      // Release audio
      releaseNote(keyId)
      
      // Call external handler
      onKeyRelease?.(keyId)
    }
  }, [getEventCoordinates, findKeyAtPosition, releaseNote, onKeyRelease, updateKeyVisual])

  // Handle mouse leave to release all keys (optimized)
  const handleMouseLeave = useCallback(() => {
    if (activeKeysRef.current.size === 0) return
    
    // Batch audio releases for better performance
    const keysToRelease = Array.from(activeKeysRef.current)
    
    // Clear active keys immediately
    activeKeysRef.current.clear()
    setActiveKeys(new Set())
    
    // Update visuals and release audio
    keysToRelease.forEach(keyId => {
      updateKeyVisual(keyId, false)
      releaseNote(keyId)
      onKeyRelease?.(keyId)
    })
  }, [releaseNote, onKeyRelease, updateKeyVisual])

  // Handle touch events with optimizations
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    handleKeyDown(event)
  }, [handleKeyDown])

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault()
    
    if (activeKeysRef.current.size === 0) return
    
    // For touch end, release all active keys for better UX
    const keysToRelease = Array.from(activeKeysRef.current)
    activeKeysRef.current.clear()
    setActiveKeys(new Set())
    
    // Batch release for performance
    keysToRelease.forEach(keyId => {
      updateKeyVisual(keyId, false)
      releaseNote(keyId)
      onKeyRelease?.(keyId)
    })
  }, [releaseNote, onKeyRelease, updateKeyVisual])

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault() // Prevent scrolling
    
    // Optional: Handle touch move for slide playing
    // This could be implemented for advanced touch interaction
  }, [])

  // Cleanup and memory management
  useEffect(() => {
    return () => {
      // Cancel pending animation frame
      if (drawCanvasRef.current) {
        cancelAnimationFrame(drawCanvasRef.current)
      }
      
      // Clear event throttle
      if (eventThrottleRef.current) {
        clearTimeout(eventThrottleRef.current)
      }
      
      // Clear cache references
      eventCacheRef.current = {
        rect: null,
        timestamp: 0,
        scaleX: 1,
        scaleY: 1
      }
      
      // Clear dirty keys
      dirtyKeysRef.current.clear()
      
      // Reset static cache flag
      staticElementsCachedRef.current = false
      
      // Clean up offscreen canvas
      if (offscreenCanvasRef.current) {
        const ctx = offscreenCanvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height)
        }
        offscreenCanvasRef.current = null
      }
    }
  }, [])

  // 클라이언트에서만 렌더링
  if (!isClient) {
    return (
      <div 
        className={`piano-keyboard w-full ${className}`}
        style={{
          position: 'relative',
          minHeight: `${height}px`,
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div className="text-gray-500">Loading piano...</div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`piano-keyboard w-full ${className}`}
      style={{
        position: 'relative',
        minHeight: `${height}px`
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleKeyDown}
        onMouseUp={handleKeyUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        className="border border-gray-300 cursor-pointer touch-none select-none"
        style={{ 
          width: '100%', 
          height: `${height}px`,
          maxWidth: '100%'
        }}
      />
    </div>
  )
}