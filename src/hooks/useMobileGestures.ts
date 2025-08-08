'use client'

import { useCallback, useRef, useState } from 'react'

interface GestureConfig {
  enableSwipe?: boolean
  enablePinch?: boolean
  enableRotation?: boolean
  swipeThreshold?: number
  pinchThreshold?: number
  rotationThreshold?: number
}

interface GestureState {
  isActive: boolean
  type: 'swipe' | 'pinch' | 'rotation' | null
  startTime: number
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  scale: number
  rotation: number
  velocity: number
}

interface SwipeResult {
  direction: 'up' | 'down' | 'left' | 'right'
  distance: number
  velocity: number
  duration: number
}

interface PinchResult {
  scale: number
  center: { x: number; y: number }
  distance: number
}

interface RotationResult {
  angle: number
  center: { x: number; y: number }
}

/**
 * Mobile Gestures Hook
 * 모바일 터치 제스처를 감지하고 처리하는 훅
 */
export function useMobileGestures(config: GestureConfig = {}) {
  const {
    enableSwipe = true,
    enablePinch = true,
    enableRotation = false,
    swipeThreshold = 50,
    pinchThreshold = 1.1,
    rotationThreshold = 10
  } = config

  const [gestureState, setGestureState] = useState<GestureState>({
    isActive: false,
    type: null,
    startTime: 0,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
    velocity: 0
  })

  const touchesRef = useRef<Touch[]>([])
  const initialPinchDistance = useRef<number>(0)
  const initialRotation = useRef<number>(0)

  // Calculate distance between two touches
  const calculateDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Calculate center point between two touches
  const calculateCenter = useCallback((touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }
  }, [])

  // Calculate angle between two touches
  const calculateAngle = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.atan2(dy, dx) * (180 / Math.PI)
  }, [])

  // Handle swipe gesture detection
  const detectSwipe = useCallback((startTouch: Touch, endTouch: Touch, duration: number): SwipeResult | null => {
    const dx = endTouch.clientX - startTouch.clientX
    const dy = endTouch.clientY - startTouch.clientY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < swipeThreshold) return null

    const velocity = distance / duration
    let direction: 'up' | 'down' | 'left' | 'right'

    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left'
    } else {
      direction = dy > 0 ? 'down' : 'up'
    }

    return {
      direction,
      distance,
      velocity,
      duration
    }
  }, [swipeThreshold])

  // Handle pinch gesture detection
  const detectPinch = useCallback((touches: Touch[]): PinchResult | null => {
    if (touches.length !== 2) return null

    const distance = calculateDistance(touches[0], touches[1])
    const center = calculateCenter(touches[0], touches[1])

    if (initialPinchDistance.current === 0) {
      initialPinchDistance.current = distance
      return null
    }

    const scale = distance / initialPinchDistance.current

    if (Math.abs(scale - 1) < (pinchThreshold - 1)) return null

    return {
      scale,
      center,
      distance
    }
  }, [calculateDistance, calculateCenter, pinchThreshold])

  // Handle rotation gesture detection
  const detectRotation = useCallback((touches: Touch[]): RotationResult | null => {
    if (touches.length !== 2 || !enableRotation) return null

    const angle = calculateAngle(touches[0], touches[1])
    const center = calculateCenter(touches[0], touches[1])

    if (initialRotation.current === 0) {
      initialRotation.current = angle
      return null
    }

    const rotation = angle - initialRotation.current

    if (Math.abs(rotation) < rotationThreshold) return null

    return {
      angle: rotation,
      center
    }
  }, [calculateAngle, calculateCenter, enableRotation, rotationThreshold])

  // Touch event handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touches = Array.from(e.touches)
    touchesRef.current = touches

    if (touches.length === 1) {
      const touch = touches[0]
      setGestureState(prev => ({
        ...prev,
        isActive: true,
        type: enableSwipe ? 'swipe' : null,
        startTime: Date.now(),
        startPosition: { x: touch.clientX, y: touch.clientY },
        currentPosition: { x: touch.clientX, y: touch.clientY }
      }))
    } else if (touches.length === 2) {
      initialPinchDistance.current = calculateDistance(touches[0], touches[1])
      initialRotation.current = calculateAngle(touches[0], touches[1])
      
      setGestureState(prev => ({
        ...prev,
        isActive: true,
        type: enablePinch ? 'pinch' : (enableRotation ? 'rotation' : null),
        startTime: Date.now()
      }))
    }
  }, [enableSwipe, enablePinch, enableRotation, calculateDistance, calculateAngle])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touches = Array.from(e.touches)

    if (touches.length === 1 && gestureState.type === 'swipe') {
      const touch = touches[0]
      setGestureState(prev => ({
        ...prev,
        currentPosition: { x: touch.clientX, y: touch.clientY }
      }))
    }
  }, [gestureState.type])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const endTime = Date.now()
    const duration = endTime - gestureState.startTime

    if (gestureState.type === 'swipe' && touchesRef.current.length === 1) {
      const changedTouches = Array.from(e.changedTouches)
      const startTouch = touchesRef.current[0]
      const endTouch = changedTouches.find(t => t.identifier === startTouch.identifier)

      if (endTouch && enableSwipe) {
        const swipeResult = detectSwipe(startTouch, endTouch, duration)
        if (swipeResult) {
          setGestureState(prev => ({
            ...prev,
            velocity: swipeResult.velocity
          }))
          return swipeResult
        }
      }
    }

    // Reset state
    setGestureState(prev => ({
      ...prev,
      isActive: false,
      type: null
    }))
    
    initialPinchDistance.current = 0
    initialRotation.current = 0
    touchesRef.current = []

    return null
  }, [gestureState.startTime, gestureState.type, enableSwipe, detectSwipe])

  // Gesture handlers for React components
  const gestureHandlers = {
    onTouchStart: (e: React.TouchEvent) => handleTouchStart(e.nativeEvent),
    onTouchMove: (e: React.TouchEvent) => handleTouchMove(e.nativeEvent),
    onTouchEnd: (e: React.TouchEvent) => handleTouchEnd(e.nativeEvent),
    style: {
      touchAction: 'none' as const,
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      WebkitTouchCallout: 'none' as const
    }
  }

  // Current gesture info
  const currentGesture = gestureState.isActive ? {
    type: gestureState.type,
    duration: Date.now() - gestureState.startTime,
    isActive: gestureState.isActive
  } : null

  return {
    gestureState,
    currentGesture,
    gestureHandlers,
    detectSwipe,
    detectPinch,
    detectRotation,
    
    // Utility functions
    isSwipeActive: gestureState.type === 'swipe' && gestureState.isActive,
    isPinchActive: gestureState.type === 'pinch' && gestureState.isActive,
    isRotationActive: gestureState.type === 'rotation' && gestureState.isActive
  }
}