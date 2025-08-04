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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height })
  const [keys, setKeys] = useState<PianoKey[]>([])
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set())
  const [devicePixelRatio, setDevicePixelRatio] = useState(1)

  // Audio integration
  const { playNote, releaseNote, initializeAudio, isReady } = useAudio()

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
    if (!containerRef.current) return
    
    const containerWidth = containerRef.current.clientWidth
    const newWidth = Math.max(containerWidth, 800) // Minimum width for 88 keys
    const ratio = window.devicePixelRatio || 1
    
    setCanvasSize({ width: newWidth, height })
    setDevicePixelRatio(ratio)
    setKeys(generateKeys(newWidth, height))
  }, [height, generateKeys])

  // Initialize and handle window resize
  useEffect(() => {
    updateCanvasSize()
    
    const handleResize = () => updateCanvasSize()
    window.addEventListener('resize', handleResize)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [updateCanvasSize])

  // Draw piano keys
  const drawKeys = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = canvasSize
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Draw white keys first
    keys.filter(key => !key.isBlack).forEach(key => {
      const keyId = `${key.note}${key.octave}`
      const isHighlighted = highlightedKeys.includes(keyId)
      const isPressed = pressedKeys.includes(keyId) || activeKeys.has(keyId)
      const isAnimationActive = animationActiveKeys.includes(keyId)
      
      // Key background - priority: pressed > animation active > highlighted > default
      if (isPressed) {
        ctx.fillStyle = '#e0e0e0'
      } else if (isAnimationActive) {
        ctx.fillStyle = '#4caf50' // Green for animation active notes
      } else if (isHighlighted) {
        ctx.fillStyle = '#ffeb3b' // Yellow for highlighted notes
      } else {
        ctx.fillStyle = '#ffffff'
      }
      
      ctx.fillRect(key.x, key.y, key.width, key.height)
      
      // Key border
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.strokeRect(key.x, key.y, key.width, key.height)
      
      // Special border effects
      if (isPressed || isAnimationActive || isHighlighted) {
        if (isPressed) {
          ctx.strokeStyle = '#666666'
          ctx.lineWidth = 2
        } else if (isAnimationActive) {
          ctx.strokeStyle = '#2e7d32' // Darker green border
          ctx.lineWidth = 3
          // Add glow effect for animation
          ctx.shadowColor = '#4caf50'
          ctx.shadowBlur = 8
        } else if (isHighlighted) {
          ctx.strokeStyle = '#f57f17'
          ctx.lineWidth = 2
        }
        
        ctx.strokeRect(key.x + 1, key.y + 1, key.width - 2, key.height - 2)
        
        // Reset shadow
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }
    })
    
    // Draw black keys on top
    keys.filter(key => key.isBlack).forEach(key => {
      const keyId = `${key.note}${key.octave}`
      const isHighlighted = highlightedKeys.includes(keyId)
      const isPressed = pressedKeys.includes(keyId) || activeKeys.has(keyId)
      const isAnimationActive = animationActiveKeys.includes(keyId)
      
      // Key background - priority: pressed > animation active > highlighted > default
      if (isPressed) {
        ctx.fillStyle = '#404040'
      } else if (isAnimationActive) {
        ctx.fillStyle = '#66bb6a' // Lighter green for black keys
      } else if (isHighlighted) {
        ctx.fillStyle = '#ffc107'
      } else {
        ctx.fillStyle = '#000000'
      }
      
      ctx.fillRect(key.x, key.y, key.width, key.height)
      
      // Special border effects
      if (isPressed || isAnimationActive || isHighlighted) {
        if (isPressed) {
          ctx.strokeStyle = '#808080'
          ctx.lineWidth = 2
        } else if (isAnimationActive) {
          ctx.strokeStyle = '#4caf50'
          ctx.lineWidth = 3
          // Add glow effect for animation
          ctx.shadowColor = '#66bb6a'
          ctx.shadowBlur = 8
        } else if (isHighlighted) {
          ctx.strokeStyle = '#ff8f00'
          ctx.lineWidth = 2
        }
        
        ctx.strokeRect(key.x + 1, key.y + 1, key.width - 2, key.height - 2)
        
        // Reset shadow
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }
    })
  }, [canvasSize, keys, highlightedKeys, pressedKeys, activeKeys, animationActiveKeys])

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size for high DPI displays
    canvas.width = canvasSize.width * devicePixelRatio
    canvas.height = canvasSize.height * devicePixelRatio
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    
    ctx.scale(devicePixelRatio, devicePixelRatio)
    
    drawKeys(ctx)
  }, [canvasSize, devicePixelRatio, drawKeys])

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

  // Get coordinates from event
  const getEventCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    
    if ('touches' in event) {
      if (event.touches.length === 0) return null
      const touch = event.touches[0]
      return {
        x: (touch.clientX - rect.left) * (canvasSize.width / rect.width),
        y: (touch.clientY - rect.top) * (canvasSize.height / rect.height)
      }
    } else {
      return {
        x: (event.clientX - rect.left) * (canvasSize.width / rect.width),
        y: (event.clientY - rect.top) * (canvasSize.height / rect.height)
      }
    }
  }

  // Handle key press
  const handleKeyDown = async (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    
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
    
    if (!activeKeys.has(keyId)) {
      setActiveKeys(prev => new Set(prev).add(keyId))
      
      // Play audio
      playNote(keyId)
      
      // Call external handler
      onKeyPress?.(keyId)
    }
  }

  // Handle key release
  const handleKeyUp = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    
    const coords = getEventCoordinates(event)
    if (!coords) return

    const key = findKeyAtPosition(coords.x, coords.y)
    if (!key) return

    const keyId = `${key.note}${key.octave}`
    
    if (activeKeys.has(keyId)) {
      setActiveKeys(prev => {
        const newSet = new Set(prev)
        newSet.delete(keyId)
        return newSet
      })
      
      // Release audio
      releaseNote(keyId)
      
      // Call external handler
      onKeyRelease?.(keyId)
    }
  }

  // Handle mouse leave to release all keys
  const handleMouseLeave = () => {
    activeKeys.forEach(keyId => {
      // Release audio
      releaseNote(keyId)
      // Call external handler
      onKeyRelease?.(keyId)
    })
    setActiveKeys(new Set())
  }

  // Handle touch events
  const handleTouchStart = (event: React.TouchEvent) => {
    handleKeyDown(event)
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    // For touch end, we need to check all active keys since we might not have coordinates
    activeKeys.forEach(keyId => {
      // Release audio
      releaseNote(keyId)
      // Call external handler
      onKeyRelease?.(keyId)
    })
    setActiveKeys(new Set())
  }

  const handleTouchMove = (event: React.TouchEvent) => {
    event.preventDefault() // Prevent scrolling
  }

  return (
    <div 
      ref={containerRef}
      className={`piano-keyboard w-full ${className}`}
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