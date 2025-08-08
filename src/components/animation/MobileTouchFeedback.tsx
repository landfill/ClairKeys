'use client'

/**
 * Mobile Touch Feedback Component
 * Provides haptic feedback, visual touch indicators, and responsive animations for mobile devices
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface TouchPoint {
  id: string
  x: number
  y: number
  startTime: number
  pressure: number
  color: string
  size: number
}

interface MobileTouchFeedbackProps {
  children: React.ReactNode
  className?: string
  enableHaptics?: boolean
  enableVisualFeedback?: boolean
  touchColor?: string
  maxTouchPoints?: number
  feedbackDuration?: number
  hapticIntensity?: 'light' | 'medium' | 'heavy'
  onTouch?: (x: number, y: number, pressure: number) => void
}

export default function MobileTouchFeedback({
  children,
  className = '',
  enableHaptics = true,
  enableVisualFeedback = true,
  touchColor = '#4caf50',
  maxTouchPoints = 10,
  feedbackDuration = 600,
  hapticIntensity = 'medium',
  onTouch
}: MobileTouchFeedbackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>([])
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [devicePixelRatio, setDevicePixelRatio] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  
  // Performance optimization: Object pool for touch points
  const touchPoolRef = useRef<TouchPoint[]>([])
  const lastUpdateTimeRef = useRef<number>(0)
  const UPDATE_THROTTLE_MS = 16 // ~60fps

  // Detect if device is mobile/touch enabled
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(hasTouch || isMobileUA)
    }
    
    checkMobile()
  }, [])

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

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!enableHaptics || !isMobile) return

    // Try different haptic APIs
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[intensity])
    }

    // Try iOS haptic feedback
    if ('ontouchstart' in window && (window as any).DeviceMotionEvent) {
      try {
        const HapticFeedback = (window as any).TapticEngine || (window as any).Haptic
        if (HapticFeedback) {
          const types = {
            light: 'impactLight',
            medium: 'impactMedium',
            heavy: 'impactHeavy'
          }
          HapticFeedback.impact(types[intensity])
        }
      } catch (e) {
        // Ignore haptic errors
      }
    }
  }, [enableHaptics, isMobile])

  // Create touch point
  const createTouchPoint = useCallback((x: number, y: number, pressure: number = 0.5): TouchPoint => {
    const colors = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0']
    const colorIndex = Math.floor(Math.random() * colors.length)
    
    return {
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      startTime: Date.now(),
      pressure,
      color: colors[colorIndex],
      size: 20 + pressure * 20
    }
  }, [])

  // Handle touch events
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!enableVisualFeedback && !enableHaptics) return

    event.preventDefault()
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const newTouchPoints: TouchPoint[] = []
    
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      const pressure = (touch as any).force || 0.5
      
      const touchPoint = createTouchPoint(x, y, pressure)
      newTouchPoints.push(touchPoint)
      
      // Trigger haptic feedback
      triggerHapticFeedback(hapticIntensity)
      
      // Call onTouch callback
      onTouch?.(x, y, pressure)
    }
    
    setTouchPoints(prev => {
      const combined = [...prev, ...newTouchPoints]
      return combined.slice(-maxTouchPoints)
    })
    
    // Start animation loop
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [enableVisualFeedback, enableHaptics, createTouchPoint, triggerHapticFeedback, hapticIntensity, onTouch, maxTouchPoints])

  // Handle mouse events (for desktop testing)
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!enableVisualFeedback || isMobile) return
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const pressure = event.buttons === 1 ? 0.8 : 0.5
    
    const touchPoint = createTouchPoint(x, y, pressure)
    
    setTouchPoints(prev => [...prev, touchPoint].slice(-maxTouchPoints))
    
    // Call onTouch callback
    onTouch?.(x, y, pressure)
    
    // Start animation loop
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate)
    }
  }, [enableVisualFeedback, isMobile, createTouchPoint, onTouch, maxTouchPoints])

  // Draw touch feedback
  const drawTouchFeedback = useCallback((ctx: CanvasRenderingContext2D, currentTime: number) => {
    const { width, height } = canvasSize
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Filter active touch points
    const activeTouchPoints = touchPoints.filter(point => {
      return currentTime - point.startTime < feedbackDuration
    })
    
    // Remove expired touch points
    if (activeTouchPoints.length !== touchPoints.length) {
      setTouchPoints(activeTouchPoints)
    }
    
    // Draw each touch point
    activeTouchPoints.forEach(point => {
      const elapsed = currentTime - point.startTime
      const progress = elapsed / feedbackDuration
      
      // Calculate ripple effect
      const maxRadius = point.size * 2
      const currentRadius = maxRadius * progress
      const opacity = (1 - progress) * 0.8
      
      // Draw ripple
      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, currentRadius
      )
      gradient.addColorStop(0, `${point.color}80`)
      gradient.addColorStop(0.7, `${point.color}40`)
      gradient.addColorStop(1, `${point.color}00`)
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(point.x, point.y, currentRadius, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw center dot
      if (progress < 0.3) {
        ctx.fillStyle = `${point.color}${Math.floor((1 - progress / 0.3) * 255).toString(16).padStart(2, '0')}`
        ctx.beginPath()
        ctx.arc(point.x, point.y, point.size * (1 - progress), 0, Math.PI * 2)
        ctx.fill()
      }
      
      // Draw pressure indicator (mobile only)
      if (isMobile && point.pressure > 0.3) {
        const pressureRadius = point.size * 0.5 * point.pressure
        const pressureOpacity = Math.floor(opacity * 255).toString(16).padStart(2, '0')
        
        ctx.fillStyle = `#ffffff${pressureOpacity}`
        ctx.beginPath()
        ctx.arc(point.x, point.y, pressureRadius, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    
    return activeTouchPoints.length > 0
  }, [canvasSize, touchPoints, feedbackDuration, isMobile])

  // Animation loop
  const animate = useCallback((currentTime: number) => {
    if (!canvasRef.current || !enableVisualFeedback) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const hasActiveTouches = drawTouchFeedback(ctx, currentTime)
    
    // Continue animation if there are active touches
    if (hasActiveTouches) {
      animationFrameRef.current = requestAnimationFrame(animate)
    } else {
      animationFrameRef.current = undefined
    }
  }, [drawTouchFeedback, enableVisualFeedback])

  // Setup canvas
  useEffect(() => {
    if (!enableVisualFeedback || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size for high DPI displays
    canvas.width = canvasSize.width * devicePixelRatio
    canvas.height = canvasSize.height * devicePixelRatio
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    
    ctx.scale(devicePixelRatio, devicePixelRatio)
  }, [canvasSize, devicePixelRatio, enableVisualFeedback])

  return (
    <div
      ref={containerRef}
      className={`relative touch-feedback-container ${className}`}
      onTouchStart={handleTouchStart}
      onMouseDown={handleMouseDown}
      style={{
        touchAction: 'none', // Prevent default touch behaviors
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      {/* Visual feedback canvas */}
      {enableVisualFeedback && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  )
}

/**
 * Custom hook for mobile-optimized touch interactions
 */
export function useMobileTouchOptimization() {
  const [isMobile, setIsMobile] = useState(false)
  const [touchCapabilities, setTouchCapabilities] = useState({
    maxTouchPoints: 0,
    hasForceTouch: false,
    hasHaptics: false
  })

  useEffect(() => {
    const checkCapabilities = () => {
      const hasTouch = 'ontouchstart' in window
      const maxTouchPoints = navigator.maxTouchPoints || 0
      const hasForceTouch = 'ontouchforcechange' in window
      const hasHaptics = 'vibrate' in navigator
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      setIsMobile(hasTouch || isMobileUA)
      setTouchCapabilities({
        maxTouchPoints,
        hasForceTouch,
        hasHaptics
      })
    }
    
    checkCapabilities()
  }, [])

  const optimizeForMobile = useCallback((element: HTMLElement) => {
    if (!isMobile) return

    // Prevent default touch behaviors
    element.style.touchAction = 'none'
    element.style.userSelect = 'none'
    element.style.webkitUserSelect = 'none'
    element.style.webkitTouchCallout = 'none'
    
    // Add mobile-specific event listeners
    const preventDefaultTouch = (e: Event) => e.preventDefault()
    element.addEventListener('touchstart', preventDefaultTouch, { passive: false })
    element.addEventListener('touchmove', preventDefaultTouch, { passive: false })
    
    return () => {
      element.removeEventListener('touchstart', preventDefaultTouch)
      element.removeEventListener('touchmove', preventDefaultTouch)
    }
  }, [isMobile])

  return {
    isMobile,
    touchCapabilities,
    optimizeForMobile
  }
}