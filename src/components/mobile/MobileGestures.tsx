'use client'

/**
 * Mobile Gestures Component
 * 모바일 전용 터치 제스처 및 컨트롤
 * Features: 스와이프, 핀치줌, 터치 피드백, 제스처 인식
 */

import { useState, useRef, useCallback, useEffect } from 'react'

interface TouchPoint {
  x: number
  y: number
  id: number
  timestamp: number
}

interface GestureData {
  type: 'swipe' | 'pinch' | 'tap' | 'hold' | 'doubleClick'
  direction?: 'up' | 'down' | 'left' | 'right'
  distance?: number
  scale?: number
  velocity?: number
  position?: { x: number; y: number }
}

interface MobileGesturesProps {
  children: React.ReactNode
  onGesture?: (gesture: GestureData) => void
  onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', velocity: number) => void
  onPinch?: (scale: number, distance: number) => void
  onTap?: (position: { x: number; y: number }) => void
  onHold?: (position: { x: number; y: number }) => void
  onDoubleClick?: (position: { x: number; y: number }) => void
  enableSwipe?: boolean
  enablePinch?: boolean
  enableTap?: boolean
  enableHold?: boolean
  enableDoubleClick?: boolean
  swipeThreshold?: number
  pinchThreshold?: number
  holdDuration?: number
  doubleTapDelay?: number
  className?: string
}

export default function MobileGestures({
  children,
  onGesture,
  onSwipe,
  onPinch,
  onTap,
  onHold,
  onDoubleClick,
  enableSwipe = true,
  enablePinch = true,
  enableTap = true,
  enableHold = true,
  enableDoubleClick = true,
  swipeThreshold = 50,
  pinchThreshold = 1.1,
  holdDuration = 800,
  doubleTapDelay = 300,
  className = ''
}: MobileGesturesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const touchesRef = useRef<TouchPoint[]>([])
  const gestureStateRef = useRef({
    isHolding: false,
    holdTimer: null as NodeJS.Timeout | null,
    lastTapTime: 0,
    tapCount: 0,
    initialPinchDistance: 0,
    lastPinchScale: 1
  })
  
  // Get touch distance for pinch gesture
  const getTouchDistance = useCallback((touch1: TouchPoint, touch2: TouchPoint): number => {
    const dx = touch1.x - touch2.x
    const dy = touch1.y - touch2.y
    return Math.sqrt(dx * dx + dy * dy)
  }, [])
  
  // Get touch center point for pinch gesture
  const getTouchCenter = useCallback((touch1: TouchPoint, touch2: TouchPoint): { x: number; y: number } => {
    return {
      x: (touch1.x + touch2.x) / 2,
      y: (touch1.y + touch2.y) / 2
    }
  }, [])
  
  // Convert touch event to touch points
  const extractTouchPoints = useCallback((touchList: TouchList): TouchPoint[] => {
    return Array.from(touchList).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      id: touch.identifier,
      timestamp: Date.now()
    }))
  }, [])
  
  // Clear hold timer
  const clearHoldTimer = useCallback(() => {
    if (gestureStateRef.current.holdTimer) {
      clearTimeout(gestureStateRef.current.holdTimer)
      gestureStateRef.current.holdTimer = null
    }
    gestureStateRef.current.isHolding = false
  }, [])
  
  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = extractTouchPoints(e.touches)
    touchesRef.current = touches
    
    clearHoldTimer()
    
    if (touches.length === 1 && enableHold) {
      // Start hold timer
      gestureStateRef.current.holdTimer = setTimeout(() => {
        gestureStateRef.current.isHolding = true
        const touch = touches[0]
        onHold?.({ x: touch.x, y: touch.y })
        onGesture?.({
          type: 'hold',
          position: { x: touch.x, y: touch.y }
        })
      }, holdDuration)
    }
    
    if (touches.length === 2 && enablePinch) {
      // Initialize pinch gesture
      gestureStateRef.current.initialPinchDistance = getTouchDistance(touches[0], touches[1])
      gestureStateRef.current.lastPinchScale = 1
    }
  }, [extractTouchPoints, clearHoldTimer, enableHold, enablePinch, getTouchDistance, holdDuration, onHold, onGesture])
  
  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touches = extractTouchPoints(e.touches)
    
    if (touches.length === 2 && enablePinch && gestureStateRef.current.initialPinchDistance > 0) {
      // Handle pinch gesture
      const currentDistance = getTouchDistance(touches[0], touches[1])
      const scale = currentDistance / gestureStateRef.current.initialPinchDistance
      
      if (Math.abs(scale - gestureStateRef.current.lastPinchScale) > 0.1) {
        gestureStateRef.current.lastPinchScale = scale
        
        if (Math.abs(scale - 1) > (pinchThreshold - 1)) {
          onPinch?.(scale, currentDistance)
          onGesture?.({
            type: 'pinch',
            scale,
            distance: currentDistance
          })
        }
      }
    }
    
    // Clear hold timer on move (prevents accidental hold)
    if (touches.length === 1) {
      clearHoldTimer()
    }
  }, [extractTouchPoints, enablePinch, getTouchDistance, pinchThreshold, onPinch, onGesture, clearHoldTimer])
  
  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const endTime = Date.now()
    const initialTouches = touchesRef.current
    
    clearHoldTimer()
    
    if (initialTouches.length === 1 && !gestureStateRef.current.isHolding) {
      const startTouch = initialTouches[0]
      const remainingTouches = extractTouchPoints(e.touches)
      
      if (remainingTouches.length === 0) {
        // Single touch ended
        const duration = endTime - startTouch.timestamp
        
        // Check if it's a tap (short duration, minimal movement)
        if (duration < 200 && enableTap) {
          const currentTime = Date.now()
          
          if (enableDoubleClick && 
              currentTime - gestureStateRef.current.lastTapTime < doubleTapDelay &&
              gestureStateRef.current.tapCount === 1) {
            // Double tap
            gestureStateRef.current.tapCount = 0
            onDoubleClick?.({ x: startTouch.x, y: startTouch.y })
            onGesture?.({
              type: 'doubleClick',
              position: { x: startTouch.x, y: startTouch.y }
            })
          } else {
            // Single tap (with delay to check for double tap)
            gestureStateRef.current.tapCount = 1
            gestureStateRef.current.lastTapTime = currentTime
            
            if (enableDoubleClick) {
              setTimeout(() => {
                if (gestureStateRef.current.tapCount === 1) {
                  gestureStateRef.current.tapCount = 0
                  onTap?.({ x: startTouch.x, y: startTouch.y })
                  onGesture?.({
                    type: 'tap',
                    position: { x: startTouch.x, y: startTouch.y }
                  })
                }
              }, doubleTapDelay)
            } else {
              onTap?.({ x: startTouch.x, y: startTouch.y })
              onGesture?.({
                type: 'tap',
                position: { x: startTouch.x, y: startTouch.y }
              })
            }
          }
        }
      }
    }
    
    // Check for swipe gesture when all touches end
    if (e.touches.length === 0 && initialTouches.length === 1 && enableSwipe) {
      const startTouch = initialTouches[0]
      const endTouch = Array.from(e.changedTouches).find(t => t.identifier === startTouch.id)
      
      if (endTouch) {
        const dx = endTouch.clientX - startTouch.x
        const dy = endTouch.clientY - startTouch.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const duration = endTime - startTouch.timestamp
        
        if (distance > swipeThreshold && duration < 800) {
          const velocity = distance / duration
          let direction: 'up' | 'down' | 'left' | 'right'
          
          if (Math.abs(dx) > Math.abs(dy)) {
            direction = dx > 0 ? 'right' : 'left'
          } else {
            direction = dy > 0 ? 'down' : 'up'
          }
          
          onSwipe?.(direction, velocity)
          onGesture?.({
            type: 'swipe',
            direction,
            distance,
            velocity
          })
        }
      }
    }
    
    // Reset pinch state
    if (e.touches.length < 2) {
      gestureStateRef.current.initialPinchDistance = 0
      gestureStateRef.current.lastPinchScale = 1
    }
  }, [
    extractTouchPoints, 
    clearHoldTimer, 
    enableTap, 
    enableDoubleClick, 
    enableSwipe, 
    doubleTapDelay, 
    swipeThreshold,
    onTap,
    onDoubleClick,
    onSwipe,
    onGesture
  ])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearHoldTimer()
    }
  }, [clearHoldTimer])
  
  return (
    <div
      ref={containerRef}
      className={`mobile-gestures ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      {children}
      
      <style jsx>{`
        .mobile-gestures {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .mobile-gestures * {
          touch-action: inherit;
        }
      `}</style>
    </div>
  )
}