'use client'

/**
 * Mobile Touch Optimizer - 모바일 터치 경험 최적화
 * Features: haptic feedback, improved touch sensitivity, gesture handling
 */

import { useEffect, useRef, useCallback } from 'react'

interface MobileTouchOptimizerProps {
  children: React.ReactNode
  enableHapticFeedback?: boolean
  touchSensitivity?: 'low' | 'medium' | 'high'
  preventScrolling?: boolean
}

interface TouchPoint {
  id: number
  x: number
  y: number
  startTime: number
}

export default function MobileTouchOptimizer({
  children,
  enableHapticFeedback = true,
  touchSensitivity = 'medium',
  preventScrolling = true
}: MobileTouchOptimizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeTouchesRef = useRef<Map<number, TouchPoint>>(new Map())

  // Haptic feedback intensity based on sensitivity
  const getHapticIntensity = useCallback(() => {
    switch (touchSensitivity) {
      case 'low': return 10
      case 'medium': return 25
      case 'high': return 50
      default: return 25
    }
  }, [touchSensitivity])

  // Trigger haptic feedback
  const triggerHapticFeedback = useCallback((intensity?: number) => {
    if (!enableHapticFeedback) return

    try {
      if ('vibrate' in navigator) {
        const vibrationIntensity = intensity || getHapticIntensity()
        navigator.vibrate(vibrationIntensity)
      }
    } catch (error) {
      // Haptic feedback not supported or failed
      console.log('Haptic feedback not supported')
    }
  }, [enableHapticFeedback, getHapticIntensity])

  // Check if device supports touch
  const isTouchDevice = useCallback(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }, [])

  // Get touch sensitivity threshold
  const getTouchThreshold = useCallback(() => {
    switch (touchSensitivity) {
      case 'low': return 20
      case 'medium': return 10
      case 'high': return 5
      default: return 10
    }
  }, [touchSensitivity])

  // Enhanced touch event handlers
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (preventScrolling) {
      event.preventDefault()
    }

    // Track all touch points
    Array.from(event.changedTouches).forEach(touch => {
      activeTouchesRef.current.set(touch.identifier, {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        startTime: Date.now()
      })
    })

    // Light haptic feedback for touch start
    triggerHapticFeedback(15)
  }, [preventScrolling, triggerHapticFeedback])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (preventScrolling) {
      event.preventDefault()
    }

    // Update touch point positions
    Array.from(event.changedTouches).forEach(touch => {
      const existingTouch = activeTouchesRef.current.get(touch.identifier)
      if (existingTouch) {
        const distance = Math.sqrt(
          Math.pow(touch.clientX - existingTouch.x, 2) +
          Math.pow(touch.clientY - existingTouch.y, 2)
        )

        // Only update if movement exceeds threshold
        if (distance > getTouchThreshold()) {
          activeTouchesRef.current.set(touch.identifier, {
            ...existingTouch,
            x: touch.clientX,
            y: touch.clientY
          })
        }
      }
    })
  }, [preventScrolling, getTouchThreshold])

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (preventScrolling) {
      event.preventDefault()
    }

    // Clean up ended touches
    Array.from(event.changedTouches).forEach(touch => {
      const touchPoint = activeTouchesRef.current.get(touch.identifier)
      if (touchPoint) {
        const duration = Date.now() - touchPoint.startTime
        
        // Different haptic feedback based on touch duration
        if (duration < 100) {
          triggerHapticFeedback(20) // Quick tap
        } else {
          triggerHapticFeedback(10) // Long press release
        }

        activeTouchesRef.current.delete(touch.identifier)
      }
    })
  }, [preventScrolling, triggerHapticFeedback])

  const handleTouchCancel = useCallback((event: TouchEvent) => {
    // Clean up cancelled touches
    Array.from(event.changedTouches).forEach(touch => {
      activeTouchesRef.current.delete(touch.identifier)
    })
  }, [])

  // Set up optimized touch event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container || !isTouchDevice()) return

    // Use passive listeners where appropriate for better performance
    const options = { passive: false }
    const passiveOptions = { passive: true }

    container.addEventListener('touchstart', handleTouchStart, options)
    container.addEventListener('touchmove', handleTouchMove, options)
    container.addEventListener('touchend', handleTouchEnd, passiveOptions)
    container.addEventListener('touchcancel', handleTouchCancel, passiveOptions)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, isTouchDevice])

  // Optimize touch-action CSS for better performance
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Set optimal touch-action for piano interaction
    container.style.touchAction = preventScrolling ? 'none' : 'manipulation'
    
    // Improve responsiveness with CSS properties
    container.style.userSelect = 'none'
    container.style.webkitUserSelect = 'none'
    container.style.webkitTouchCallout = 'none'
    container.style.webkitTapHighlightColor = 'transparent'

    return () => {
      // Cleanup styles if component unmounts
      if (container.parentNode) {
        container.style.touchAction = ''
        container.style.userSelect = ''
        container.style.webkitUserSelect = ''
        container.style.webkitTouchCallout = ''
        container.style.webkitTapHighlightColor = ''
      }
    }
  }, [preventScrolling])

  // Add meta viewport optimization for mobile
  useEffect(() => {
    // Ensure viewport is optimized for touch
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement
    
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta')
      viewportMeta.name = 'viewport'
      document.head.appendChild(viewportMeta)
    }

    const originalContent = viewportMeta.content
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, minimal-ui'

    return () => {
      if (viewportMeta && originalContent) {
        viewportMeta.content = originalContent
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`mobile-touch-optimizer ${isTouchDevice() ? 'touch-device' : ''}`}
      style={{
        // Optimize for touch performance
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        perspective: '1000px',
        // Improve scrolling performance
        WebkitOverflowScrolling: 'touch',
        // Reduce touch delay
        touchAction: preventScrolling ? 'none' : 'manipulation',
      }}
    >
      {children}
      
      {/* Touch indicator for debugging (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="touch-debug-info fixed top-0 left-0 z-50 text-xs text-white bg-black bg-opacity-50 p-2 pointer-events-none">
          Active touches: {activeTouchesRef.current.size}
          <br />
          Sensitivity: {touchSensitivity}
          <br />
          Haptic: {enableHapticFeedback ? 'ON' : 'OFF'}
        </div>
      )}
    </div>
  )
}

// Hook for using touch optimization in components
export function useMobileTouchOptimization(options: {
  hapticFeedback?: boolean
  sensitivity?: 'low' | 'medium' | 'high'
} = {}) {
  const { hapticFeedback = true, sensitivity = 'medium' } = options

  const triggerHaptic = useCallback((intensity?: number) => {
    if (!hapticFeedback) return

    try {
      if ('vibrate' in navigator) {
        const defaultIntensity = sensitivity === 'low' ? 10 : sensitivity === 'high' ? 50 : 25
        navigator.vibrate(intensity || defaultIntensity)
      }
    } catch (error) {
      // Haptic feedback not supported
    }
  }, [hapticFeedback, sensitivity])

  const isTouchDevice = useCallback(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }, [])

  const isHighDensityDisplay = useCallback(() => {
    return window.devicePixelRatio > 1.5
  }, [])

  return {
    triggerHaptic,
    isTouchDevice,
    isHighDensityDisplay,
    touchSensitivity: sensitivity
  }
}