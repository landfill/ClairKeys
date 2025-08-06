'use client'

/**
 * Enhanced Piano Keyboard with improved animations
 * Features: smooth key transitions, velocity-based colors, ripple effects, and 3D-style rendering
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { PianoKey, PianoKeyboardProps } from '@/types/piano'
import { keyNumberToNote, isBlackKey, PIANO_KEYS } from '@/utils/piano'
import { useAudio } from '@/hooks/useAudio'

interface EnhancedAnimationState {
  pressedKeys: Map<string, { startTime: number; velocity: number }>
  highlightedKeys: Map<string, { startTime: number; type: 'highlight' | 'animation' }>
  rippleEffects: Map<string, { x: number; y: number; startTime: number; maxRadius: number }>
}

export interface EnhancedPianoKeyboardProps extends PianoKeyboardProps {
  velocityBasedColors?: boolean
  rippleEffects?: boolean
  smoothTransitions?: boolean
  keyPressDepth?: number
  glowIntensity?: number
}

export default function EnhancedPianoKeyboard({ 
  onKeyPress, 
  onKeyRelease,
  highlightedKeys = [], 
  pressedKeys = [],
  animationActiveKeys = [],
  className = '',
  height = 200,
  velocityBasedColors = true,
  rippleEffects = true,
  smoothTransitions = true,
  keyPressDepth = 3,
  glowIntensity = 0.8
}: EnhancedPianoKeyboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()
  
  const [canvasSize, setCanvasSize] = useState({ width: 800, height })
  const [keys, setKeys] = useState<PianoKey[]>([])
  const [devicePixelRatio, setDevicePixelRatio] = useState(1)
  const [animationState, setAnimationState] = useState<EnhancedAnimationState>({
    pressedKeys: new Map(),
    highlightedKeys: new Map(),
    rippleEffects: new Map()
  })

  // Audio integration
  const { playNote, releaseNote, initializeAudio, isReady } = useAudio()

  // Generate 88 piano keys with enhanced positioning
  const generateKeys = useCallback((width: number, height: number): PianoKey[] => {
    const keys: PianoKey[] = []
    const whiteKeyWidth = width / PIANO_KEYS.WHITE_KEYS
    const blackKeyWidth = whiteKeyWidth * 0.58
    const blackKeyHeight = height * 0.62
    
    let whiteKeyIndex = 0
    
    for (let keyNumber = 1; keyNumber <= PIANO_KEYS.TOTAL_KEYS; keyNumber++) {
      const noteWithOctave = keyNumberToNote(keyNumber)
      const match = noteWithOctave.match(/^([A-G]#?)(\d+)$/)
      if (!match) continue
      
      const [, noteName, octaveStr] = match
      const octave = parseInt(octaveStr, 10)
      const isBlack = isBlackKey(noteWithOctave)
      
      if (!isBlack) {
        // White key with slight padding
        const x = whiteKeyIndex * whiteKeyWidth
        keys.push({
          note: noteName,
          octave,
          keyNumber,
          isBlack: false,
          x: x + 1,
          y: 1,
          width: whiteKeyWidth - 2,
          height: height - 2
        })
        whiteKeyIndex++
      } else {
        // Black key with improved positioning
        const x = (whiteKeyIndex - 0.35) * whiteKeyWidth
        keys.push({
          note: noteName,
          octave,
          keyNumber,
          isBlack: true,
          x: x + 1,
          y: 1,
          width: blackKeyWidth - 2,
          height: blackKeyHeight - 2
        })
      }
    }
    
    return keys
  }, [])

  // Handle responsive canvas sizing
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return
    
    const containerWidth = containerRef.current.clientWidth
    const newWidth = Math.max(containerWidth, 800)
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
    
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [updateCanvasSize])

  // Create gradient for 3D effect
  const createKeyGradient = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, width: number, height: number,
    isBlack: boolean, isPressed: boolean, velocity: number = 0.8
  ): CanvasGradient => {
    const gradient = ctx.createLinearGradient(x, y, x, y + height)
    
    if (isBlack) {
      if (isPressed) {
        const intensity = velocityBasedColors ? velocity * 0.4 : 0.3
        gradient.addColorStop(0, `rgba(80, 80, 80, ${1 - intensity})`)
        gradient.addColorStop(0.3, `rgba(40, 40, 40, ${1 - intensity * 0.5})`)
        gradient.addColorStop(1, `rgba(10, 10, 10, ${1 - intensity * 0.2})`)
      } else {
        gradient.addColorStop(0, '#4a4a4a')
        gradient.addColorStop(0.3, '#2a2a2a')
        gradient.addColorStop(1, '#0a0a0a')
      }
    } else {
      if (isPressed) {
        const intensity = velocityBasedColors ? velocity * 0.3 : 0.2
        gradient.addColorStop(0, `rgba(220, 220, 220, ${1 - intensity})`)
        gradient.addColorStop(0.3, `rgba(200, 200, 200, ${1 - intensity * 0.5})`)
        gradient.addColorStop(1, `rgba(180, 180, 180, ${1 - intensity * 0.2})`)
      } else {
        gradient.addColorStop(0, '#ffffff')
        gradient.addColorStop(0.3, '#f8f8f8')
        gradient.addColorStop(1, '#e8e8e8')
      }
    }
    
    return gradient
  }

  // Draw ripple effect
  const drawRipple = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, radius: number, opacity: number
  ): void => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, `rgba(76, 175, 80, ${opacity * 0.6})`)
    gradient.addColorStop(0.7, `rgba(76, 175, 80, ${opacity * 0.3})`)
    gradient.addColorStop(1, 'rgba(76, 175, 80, 0)')
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Draw enhanced piano keys
  const drawKeys = useCallback((ctx: CanvasRenderingContext2D, currentTime: number) => {
    const { width, height } = canvasSize
    
    // Clear canvas with subtle background
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, width, height)
    
    // Draw ripple effects first (behind keys)
    if (rippleEffects) {
      animationState.rippleEffects.forEach((ripple, keyId) => {
        const elapsed = currentTime - ripple.startTime
        const duration = 800 // ms
        if (elapsed < duration) {
          const progress = elapsed / duration
          const radius = ripple.maxRadius * progress
          const opacity = (1 - progress) * 0.8
          drawRipple(ctx, ripple.x, ripple.y, radius, opacity)
        }
      })
    }
    
    // Draw white keys first
    keys.filter(key => !key.isBlack).forEach(key => {
      const keyId = `${key.note}${key.octave}`
      const isHighlighted = highlightedKeys.includes(keyId)
      const isPressed = pressedKeys.includes(keyId) || animationState.pressedKeys.has(keyId)
      const isAnimationActive = animationActiveKeys.includes(keyId)
      
      // Get press information for velocity-based effects
      const pressInfo = animationState.pressedKeys.get(keyId)
      const velocity = pressInfo?.velocity || 0.8
      const pressTime = pressInfo ? currentTime - pressInfo.startTime : 0
      
      // Calculate key position with press depth
      let keyY = key.y
      let keyHeight = key.height
      if (isPressed && smoothTransitions) {
        const pressDepth = Math.min(keyPressDepth, pressTime * 0.02)
        keyY += pressDepth
        keyHeight -= pressDepth
      }
      
      // Draw key shadow for 3D effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.fillRect(key.x + 2, key.y + 2, key.width, key.height)
      
      // Draw key with gradient
      const gradient = createKeyGradient(ctx, key.x, keyY, key.width, keyHeight, false, isPressed, velocity)
      ctx.fillStyle = gradient
      ctx.fillRect(key.x, keyY, key.width, keyHeight)
      
      // Key border
      ctx.strokeStyle = isPressed ? '#999' : '#ccc'
      ctx.lineWidth = 1
      ctx.strokeRect(key.x, keyY, key.width, keyHeight)
      
      // Special effects
      if (isAnimationActive || isHighlighted) {
        const color = isAnimationActive ? '#4caf50' : '#ffeb3b'
        const glowColor = isAnimationActive ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 235, 59, 0.8)'
        
        // Glow effect
        ctx.shadowColor = glowColor
        ctx.shadowBlur = 12 * glowIntensity
        ctx.strokeStyle = color
        ctx.lineWidth = 3
        ctx.strokeRect(key.x + 2, keyY + 2, key.width - 4, keyHeight - 4)
        
        // Reset shadow
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }
    })
    
    // Draw black keys on top
    keys.filter(key => key.isBlack).forEach(key => {
      const keyId = `${key.note}${key.octave}`
      const isHighlighted = highlightedKeys.includes(keyId)
      const isPressed = pressedKeys.includes(keyId) || animationState.pressedKeys.has(keyId)
      const isAnimationActive = animationActiveKeys.includes(keyId)
      
      // Get press information
      const pressInfo = animationState.pressedKeys.get(keyId)
      const velocity = pressInfo?.velocity || 0.8
      const pressTime = pressInfo ? currentTime - pressInfo.startTime : 0
      
      // Calculate key position with press depth
      let keyY = key.y
      let keyHeight = key.height
      if (isPressed && smoothTransitions) {
        const pressDepth = Math.min(keyPressDepth * 0.7, pressTime * 0.015)
        keyY += pressDepth
        keyHeight -= pressDepth
      }
      
      // Draw key shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
      ctx.fillRect(key.x + 1, key.y + 1, key.width, key.height)
      
      // Draw key with gradient
      const gradient = createKeyGradient(ctx, key.x, keyY, key.width, keyHeight, true, isPressed, velocity)
      ctx.fillStyle = gradient
      ctx.fillRect(key.x, keyY, key.width, keyHeight)
      
      // Special effects for black keys
      if (isAnimationActive || isHighlighted) {
        const color = isAnimationActive ? '#66bb6a' : '#ffc107'
        const glowColor = isAnimationActive ? 'rgba(102, 187, 106, 0.8)' : 'rgba(255, 193, 7, 0.8)'
        
        // Glow effect
        ctx.shadowColor = glowColor
        ctx.shadowBlur = 10 * glowIntensity
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(key.x + 1, keyY + 1, key.width - 2, keyHeight - 2)
        
        // Reset shadow
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }
    })
  }, [canvasSize, keys, highlightedKeys, pressedKeys, animationActiveKeys, animationState, rippleEffects, smoothTransitions, keyPressDepth, glowIntensity, velocityBasedColors])

  // Animation loop
  const animate = useCallback((currentTime: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clean up old effects
    const now = Date.now()
    setAnimationState(prev => ({
      ...prev,
      rippleEffects: new Map([...prev.rippleEffects].filter(([_, ripple]) => 
        now - ripple.startTime < 800
      ))
    }))

    drawKeys(ctx, now)
    
    // Continue animation if needed
    if (animationState.pressedKeys.size > 0 || animationState.rippleEffects.size > 0) {
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [drawKeys, animationState])

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
    
    // Start animation loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [canvasSize, devicePixelRatio, animate])

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

  // Enhanced key press with animation effects
  const handleKeyDown = async (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    
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
    const now = Date.now()
    
    if (!animationState.pressedKeys.has(keyId)) {
      // Simulate velocity based on touch/click
      const velocity = Math.random() * 0.4 + 0.6 // 0.6 to 1.0
      
      setAnimationState(prev => ({
        ...prev,
        pressedKeys: new Map(prev.pressedKeys).set(keyId, { startTime: now, velocity }),
        rippleEffects: rippleEffects ? new Map(prev.rippleEffects).set(keyId, {
          x: coords.x,
          y: coords.y,
          startTime: now,
          maxRadius: Math.min(key.width, key.height) * 1.5
        }) : prev.rippleEffects
      }))
      
      // Play audio with velocity
      playNote(keyId, velocity)
      
      // Call external handler
      onKeyPress?.(keyId)
      
      // Start animation loop if not running
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }
  }

  // Enhanced key release
  const handleKeyUp = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    
    const coords = getEventCoordinates(event)
    if (!coords) return

    const key = findKeyAtPosition(coords.x, coords.y)
    if (!key) return

    const keyId = `${key.note}${key.octave}`
    
    if (animationState.pressedKeys.has(keyId)) {
      setAnimationState(prev => {
        const newPressedKeys = new Map(prev.pressedKeys)
        newPressedKeys.delete(keyId)
        return {
          ...prev,
          pressedKeys: newPressedKeys
        }
      })
      
      // Release audio
      releaseNote(keyId)
      
      // Call external handler
      onKeyRelease?.(keyId)
    }
  }

  // Handle mouse leave
  const handleMouseLeave = () => {
    // Release all pressed keys
    animationState.pressedKeys.forEach((_, keyId) => {
      releaseNote(keyId)
      onKeyRelease?.(keyId)
    })
    
    setAnimationState(prev => ({
      ...prev,
      pressedKeys: new Map()
    }))
  }

  // Touch event handlers
  const handleTouchStart = (event: React.TouchEvent) => {
    handleKeyDown(event)
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    // For touch end, release all keys
    animationState.pressedKeys.forEach((_, keyId) => {
      releaseNote(keyId)
      onKeyRelease?.(keyId)
    })
    
    setAnimationState(prev => ({
      ...prev,
      pressedKeys: new Map()
    }))
  }

  const handleTouchMove = (event: React.TouchEvent) => {
    event.preventDefault()
  }

  return (
    <div 
      ref={containerRef}
      className={`enhanced-piano-keyboard w-full ${className}`}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleKeyDown}
        onMouseUp={handleKeyUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        className="border border-gray-300 cursor-pointer touch-none select-none shadow-lg rounded-lg"
        style={{ 
          width: '100%', 
          height: `${height}px`,
          maxWidth: '100%',
          background: 'linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%)'
        }}
      />
    </div>
  )
}