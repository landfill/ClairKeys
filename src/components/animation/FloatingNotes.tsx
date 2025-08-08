'use client'

/**
 * Floating Notes Animation Component
 * Creates beautiful floating musical notes that rise from piano keys when played
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface FloatingNote {
  id: string
  note: string
  x: number
  y: number
  velocity: number
  startTime: number
  color: string
  size: number
  rotation: number
  drift: number
}

interface FloatingNotesProps {
  activeNotes: string[]
  keyPositions: Map<string, { x: number; y: number; width: number; height: number }>
  className?: string
  maxNotes?: number
  noteDuration?: number
  noteSpeed?: number
  enableParticles?: boolean
}

const MUSICAL_SYMBOLS = ['♪', '♫', '♬', '♩', '♯', '♭']
const NOTE_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4']

export default function FloatingNotes({
  activeNotes,
  keyPositions,
  className = '',
  maxNotes = 50,
  noteDuration = 3000,
  noteSpeed = 1.0,
  enableParticles = true
}: FloatingNotesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()
  
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 })
  const [floatingNotes, setFloatingNotes] = useState<FloatingNote[]>([])
  const [devicePixelRatio, setDevicePixelRatio] = useState(1)
  
  // Performance optimization: Object pools for reusing FloatingNote objects
  const notePoolRef = useRef<FloatingNote[]>([])
  const activeNotesSetRef = useRef<Set<string>>(new Set())
  
  // Performance optimization: Throttle canvas updates
  const lastUpdateTimeRef = useRef<number>(0)
  const UPDATE_THROTTLE_MS = 16 // ~60fps

  // Update canvas size
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    
    setCanvasSize({ width: rect.width, height: rect.height })
    setDevicePixelRatio(ratio)
  }, [])

  // Initialize canvas size
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

  // Create new floating note with object pooling
  const createFloatingNote = useCallback((note: string): FloatingNote | null => {
    const keyPosition = keyPositions.get(note)
    if (!keyPosition) return null

    // Try to reuse from pool first
    let floatingNote = notePoolRef.current.pop()
    
    if (!floatingNote) {
      // Create new if pool is empty
      floatingNote = {
        id: '',
        note: '',
        x: 0,
        y: 0,
        velocity: 0,
        startTime: 0,
        color: '',
        size: 0,
        rotation: 0,
        drift: 0
      }
    }

    // Initialize/reset properties
    const velocity = Math.random() * 0.5 + 0.5 // 0.5 to 1.0
    const colorIndex = Math.floor(Math.random() * NOTE_COLORS.length)
    const symbolIndex = Math.floor(Math.random() * MUSICAL_SYMBOLS.length)
    
    floatingNote.id = `${note}-${Date.now()}-${Math.random()}`
    floatingNote.note = MUSICAL_SYMBOLS[symbolIndex]
    floatingNote.x = keyPosition.x + keyPosition.width / 2 + (Math.random() - 0.5) * 20
    floatingNote.y = keyPosition.y
    floatingNote.velocity = velocity
    floatingNote.startTime = Date.now()
    floatingNote.color = NOTE_COLORS[colorIndex]
    floatingNote.size = 16 + velocity * 8
    floatingNote.rotation = (Math.random() - 0.5) * 45
    floatingNote.drift = (Math.random() - 0.5) * 30
    
    return floatingNote
  }, [keyPositions])

  // Update floating notes when active notes change (optimized)
  useEffect(() => {
    const currentActiveSet = new Set(activeNotes)
    const previousActiveSet = activeNotesSetRef.current
    
    // Only process new notes (not already active)
    const newActiveNotes = activeNotes.filter(note => !previousActiveSet.has(note))
    
    if (newActiveNotes.length === 0) {
      activeNotesSetRef.current = currentActiveSet
      return
    }
    
    const newNotes: FloatingNote[] = []
    const currentTime = Date.now()
    
    newActiveNotes.forEach(note => {
      // Check if this note is already floating recently
      const existingNote = floatingNotes.find(fn => 
        fn.id.startsWith(note) && currentTime - fn.startTime < 200
      )
      
      if (!existingNote) {
        const floatingNote = createFloatingNote(note)
        if (floatingNote) {
          newNotes.push(floatingNote)
        }
      }
    })
    
    if (newNotes.length > 0) {
      setFloatingNotes(prev => {
        // Return expired notes to pool
        const currentTime = Date.now()
        const expiredNotes = prev.filter(note => currentTime - note.startTime >= noteDuration)
        notePoolRef.current.push(...expiredNotes.slice(0, 10)) // Limit pool size
        
        const combined = [...prev, ...newNotes]
        // Limit total notes for performance
        return combined.slice(-maxNotes)
      })
    }
    
    activeNotesSetRef.current = currentActiveSet
  }, [activeNotes, createFloatingNote, floatingNotes, maxNotes, noteDuration])

  // Draw floating notes
  const drawFloatingNotes = useCallback((ctx: CanvasRenderingContext2D, currentTime: number) => {
    const { width, height } = canvasSize
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Update and draw each floating note
    const activeFloatingNotes = floatingNotes.filter(note => {
      const elapsed = currentTime - note.startTime
      return elapsed < noteDuration
    })
    
    // Remove old notes
    if (activeFloatingNotes.length !== floatingNotes.length) {
      setFloatingNotes(activeFloatingNotes)
    }
    
    activeFloatingNotes.forEach(note => {
      const elapsed = currentTime - note.startTime
      const progress = elapsed / noteDuration
      
      // Calculate position
      const baseY = note.y - (progress * height * noteSpeed)
      const driftX = note.x + Math.sin(progress * Math.PI * 2) * note.drift
      
      // Calculate opacity (fade out towards the end)
      const opacity = progress < 0.8 ? 1 : (1 - (progress - 0.8) / 0.2)
      
      // Calculate scale (start small, grow, then shrink)
      let scale = 1
      if (progress < 0.1) {
        scale = progress / 0.1
      } else if (progress > 0.9) {
        scale = (1 - (progress - 0.9) / 0.1)
      }
      
      // Save context for transformations
      ctx.save()
      
      // Move to note position
      ctx.translate(driftX, baseY)
      
      // Apply rotation
      ctx.rotate((note.rotation + progress * 180) * Math.PI / 180)
      
      // Apply scale
      ctx.scale(scale, scale)
      
      // Set style
      ctx.fillStyle = note.color
      ctx.globalAlpha = opacity
      ctx.font = `${note.size}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Add glow effect
      ctx.shadowColor = note.color
      ctx.shadowBlur = 8 * opacity
      
      // Draw the musical note
      ctx.fillText(note.note, 0, 0)
      
      // Draw particles if enabled
      if (enableParticles && progress > 0.2) {
        const particleCount = 3
        const particleRadius = 2
        
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2
          const distance = 15 + progress * 10
          const particleX = Math.cos(angle) * distance
          const particleY = Math.sin(angle) * distance
          
          ctx.fillStyle = note.color
          ctx.globalAlpha = opacity * 0.6
          ctx.beginPath()
          ctx.arc(particleX, particleY, particleRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      
      // Restore context
      ctx.restore()
    })
  }, [canvasSize, floatingNotes, noteDuration, noteSpeed, enableParticles])

  // Animation loop with throttling
  const animate = useCallback((currentTime: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Throttle updates for performance
    if (currentTime - lastUpdateTimeRef.current < UPDATE_THROTTLE_MS) {
      if (floatingNotes.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
      return
    }
    lastUpdateTimeRef.current = currentTime

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawFloatingNotes(ctx, currentTime)
    
    // Continue animation if there are active notes
    if (floatingNotes.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [drawFloatingNotes, floatingNotes.length])

  // Setup canvas and start animation
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
    
    if (floatingNotes.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [canvasSize, devicePixelRatio, animate, floatingNotes.length])

  return (
    <div 
      ref={containerRef}
      className={`floating-notes-container absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 10 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  )
}

/**
 * Hook to manage floating notes integration with piano keyboard
 */
export function useFloatingNotes(
  pianoKeys: Array<{ note: string; octave: number; x: number; y: number; width: number; height: number }>,
  activeNotes: string[]
) {
  const [keyPositions, setKeyPositions] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(new Map())

  // Update key positions when piano keys change
  useEffect(() => {
    const positions = new Map()
    
    pianoKeys.forEach(key => {
      const keyId = `${key.note}${key.octave}`
      positions.set(keyId, {
        x: key.x,
        y: key.y,
        width: key.width,
        height: key.height
      })
    })
    
    setKeyPositions(positions)
  }, [pianoKeys])

  return { keyPositions }
}