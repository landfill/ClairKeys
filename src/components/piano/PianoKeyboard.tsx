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
  height = 200,
  keyWidth
}: PianoKeyboardProps) {
  const [isClient, setIsClient] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height })
  const [keys, setKeys] = useState<PianoKey[]>([])
  const activeKeysRef = useRef<Set<string>>(new Set())
  const audioInitializedRef = useRef(false)

  const { playNote, releaseNote, initializeAudio, isReady } = useAudio()

  // Client-side only rendering with cache busting
  useEffect(() => {
    setIsClient(true)
    // Force re-render to bust any caching issues
    const timer = setTimeout(() => {
      if (canvasRef.current && keys.length > 0) {
        // Call drawKeys directly without dependency
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          // Simple redraw trigger
          window.dispatchEvent(new Event('resize'))
        }
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Generate piano keys
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
      
      const [, note, octave] = match
      const isBlack = isBlackKey(note)
      
      if (isBlack) {
        // Black key positioning
        const blackKeyOffset = getBlackKeyOffset(note)
        const x = (whiteKeyIndex - 1) * whiteKeyWidth + whiteKeyWidth + blackKeyOffset * whiteKeyWidth - blackKeyWidth / 2
        
        keys.push({
          id: keyNumber,
          note,
          octave: parseInt(octave),
          x,
          y: 0,
          width: blackKeyWidth,
          height: blackKeyHeight,
          isBlack: true
        })
      } else {
        // White key
        keys.push({
          id: keyNumber,
          note,
          octave: parseInt(octave),
          x: whiteKeyIndex * whiteKeyWidth,
          y: 0,
          width: whiteKeyWidth,
          height,
          isBlack: false
        })
        whiteKeyIndex++
      }
    }
    
    return keys
  }, [])

  // Black key offset helper
  const getBlackKeyOffset = (note: string): number => {
    switch (note) {
      case 'C#': return -0.25
      case 'D#': return 0.25
      case 'F#': return -0.33
      case 'G#': return 0
      case 'A#': return 0.33
      default: return 0
    }
  }

  // Initialize canvas and keys
  useEffect(() => {
    if (!isClient || !containerRef.current) return

    const resizeCanvas = () => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const width = Math.max(800, rect.width)
      
      setCanvasSize({ width, height })
      setKeys(generateKeys(width, height))
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [isClient, height, generateKeys])

  // Draw keys
  const drawKeys = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || keys.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw white keys first
    keys.filter(key => !key.isBlack).forEach(key => {
      const keyId = `${key.note}${key.octave}`
      const isPressed = pressedKeys.includes(keyId) || activeKeysRef.current.has(keyId)
      const isHighlighted = highlightedKeys.includes(keyId)
      const isAnimationActive = animationActiveKeys.includes(keyId)

      // White key background
      ctx.fillStyle = isPressed ? '#ddd' : isHighlighted ? '#e3f2fd' : isAnimationActive ? '#ffeb3b' : '#fff'
      ctx.fillRect(key.x, key.y, key.width, key.height)
      
      // White key border
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 1
      ctx.strokeRect(key.x, key.y, key.width, key.height)
    })

    // Draw black keys on top
    keys.filter(key => key.isBlack).forEach(key => {
      const keyId = `${key.note}${key.octave}`
      const isPressed = pressedKeys.includes(keyId) || activeKeysRef.current.has(keyId)
      const isHighlighted = highlightedKeys.includes(keyId)
      const isAnimationActive = animationActiveKeys.includes(keyId)

      // Black key background
      ctx.fillStyle = isPressed ? '#555' : isHighlighted ? '#1976d2' : isAnimationActive ? '#ff9800' : '#333'
      ctx.fillRect(key.x, key.y, key.width, key.height)
      
      // Black key border
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1
      ctx.strokeRect(key.x, key.y, key.width, key.height)
    })
  }, [keys, pressedKeys, highlightedKeys, animationActiveKeys])

  // Redraw when props change
  useEffect(() => {
    if (isClient) {
      drawKeys()
    }
  }, [isClient, keys, pressedKeys, highlightedKeys, animationActiveKeys, drawKeys])

  // Handle key interactions
  const handleKeyInteraction = useCallback((event: React.MouseEvent | React.TouchEvent, isPress: boolean) => {
    event.preventDefault()
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in event ? event.touches[0]?.clientX || event.changedTouches[0]?.clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0]?.clientY || event.changedTouches[0]?.clientY : event.clientY
    
    const x = clientX - rect.left
    const y = clientY - rect.top

    // Find clicked key (black keys first for proper layering)
    const blackKeys = keys.filter(key => key.isBlack)
    const whiteKeys = keys.filter(key => !key.isBlack)
    
    let clickedKey: PianoKey | null = null
    
    for (const key of blackKeys) {
      if (x >= key.x && x <= key.x + key.width && y >= key.y && y <= key.y + key.height) {
        clickedKey = key
        break
      }
    }
    
    if (!clickedKey) {
      for (const key of whiteKeys) {
        if (x >= key.x && x <= key.x + key.width && y >= key.y && y <= key.y + key.height) {
          clickedKey = key
          break
        }
      }
    }

    if (clickedKey) {
      const keyId = `${clickedKey.note}${clickedKey.octave}`
      
      if (isPress) {
        // Initialize audio on first user interaction
        if (!audioInitializedRef.current) {
          initializeAudio().then(() => {
            audioInitializedRef.current = true
            playNote(keyId)
          }).catch(err => console.error('Audio init failed:', err))
        } else {
          playNote(keyId)
        }
        
        activeKeysRef.current.add(keyId)
        onKeyPress?.(keyId)
      } else {
        activeKeysRef.current.delete(keyId)
        onKeyRelease?.(keyId)
        releaseNote(keyId)
      }
      
      drawKeys()
    }
  }, [keys, onKeyPress, onKeyRelease, playNote, releaseNote, drawKeys])

  // Canvas setup
  useEffect(() => {
    if (!canvasRef.current || !isClient) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    ctx.scale(dpr, dpr)

    // Draw initial keys
    drawKeys()
  }, [canvasSize, isClient, drawKeys])

  // Audio will be initialized on first user interaction (see handleKeyInteraction)

  if (!isClient) {
    return (
      <div className={`piano-keyboard w-full ${className}`} style={{ height: `${height}px`, backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-gray-500">Loading piano...</div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`piano-keyboard w-full ${className}`}
      style={{ position: 'relative', height: `${height}px` }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full cursor-pointer"
        style={{ touchAction: 'none', userSelect: 'none' }}
        onMouseDown={(e) => handleKeyInteraction(e, true)}
        onMouseUp={(e) => handleKeyInteraction(e, false)}
        onMouseLeave={() => {
          // Release all active keys when mouse leaves
          activeKeysRef.current.clear()
          drawKeys()
        }}
        onTouchStart={(e) => handleKeyInteraction(e, true)}
        onTouchEnd={(e) => handleKeyInteraction(e, false)}
      />
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
          Keys: {keys.length} | Size: {canvasSize.width}x{canvasSize.height} | Ready: {isReady ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  )
}