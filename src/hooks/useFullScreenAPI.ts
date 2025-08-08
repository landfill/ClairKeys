'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface FullScreenAPI {
  isSupported: boolean
  isFullScreen: boolean
  enterFullScreen: (element?: HTMLElement) => Promise<boolean>
  exitFullScreen: () => Promise<boolean>
  toggleFullScreen: (element?: HTMLElement) => Promise<boolean>
  onFullScreenChange: (callback: (isFullScreen: boolean) => void) => () => void
}

interface FullScreenOptions {
  navigationUI?: 'auto' | 'show' | 'hide'
  onEnter?: () => void
  onExit?: () => void
  onError?: (error: Error) => void
}

/**
 * Full Screen API Hook with cross-browser support
 * 모든 주요 브라우저에서 전체화면 API를 일관된 방식으로 사용할 수 있는 훅
 */
export function useFullScreenAPI(options: FullScreenOptions = {}): FullScreenAPI {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const callbacksRef = useRef<((isFullScreen: boolean) => void)[]>([])
  const optionsRef = useRef(options)
  
  // Update options ref when props change
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Check if Full Screen API is supported
  const checkSupport = useCallback(() => {
    if (typeof document === 'undefined') return false
    
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    )
  }, [])

  // Get current fullscreen element with cross-browser support
  const getFullScreenElement = useCallback(() => {
    return (
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    )
  }, [])

  // Enter fullscreen mode
  const enterFullScreen = useCallback(async (element?: HTMLElement): Promise<boolean> => {
    const targetElement = element || document.documentElement
    
    if (!checkSupport()) {
      optionsRef.current.onError?.(new Error('Fullscreen API not supported'))
      return false
    }

    try {
      if (targetElement.requestFullscreen) {
        await targetElement.requestFullscreen({
          navigationUI: optionsRef.current.navigationUI || 'auto'
        } as FullscreenOptions)
      } else if ((targetElement as any).webkitRequestFullscreen) {
        await (targetElement as any).webkitRequestFullscreen()
      } else if ((targetElement as any).mozRequestFullScreen) {
        await (targetElement as any).mozRequestFullScreen()
      } else if ((targetElement as any).msRequestFullscreen) {
        await (targetElement as any).msRequestFullscreen()
      } else {
        throw new Error('No fullscreen method available')
      }
      
      return true
    } catch (error) {
      optionsRef.current.onError?.(error as Error)
      return false
    }
  }, [checkSupport])

  // Exit fullscreen mode
  const exitFullScreen = useCallback(async (): Promise<boolean> => {
    if (!getFullScreenElement()) {
      return true // Already not in fullscreen
    }

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      } else {
        throw new Error('No exit fullscreen method available')
      }
      
      return true
    } catch (error) {
      optionsRef.current.onError?.(error as Error)
      return false
    }
  }, [getFullScreenElement])

  // Toggle fullscreen mode
  const toggleFullScreen = useCallback(async (element?: HTMLElement): Promise<boolean> => {
    if (isFullScreen) {
      return await exitFullScreen()
    } else {
      return await enterFullScreen(element)
    }
  }, [isFullScreen, enterFullScreen, exitFullScreen])

  // Subscribe to fullscreen change events
  const onFullScreenChange = useCallback((callback: (isFullScreen: boolean) => void) => {
    callbacksRef.current.push(callback)
    
    return () => {
      callbacksRef.current = callbacksRef.current.filter(cb => cb !== callback)
    }
  }, [])

  // Initialize support check and event listeners
  useEffect(() => {
    if (typeof document === 'undefined') return

    setIsSupported(checkSupport())
    
    const handleFullScreenChange = () => {
      const isNowFullScreen = !!getFullScreenElement()
      setIsFullScreen(isNowFullScreen)
      
      // Call registered callbacks
      callbacksRef.current.forEach(callback => callback(isNowFullScreen))
      
      // Call option callbacks
      if (isNowFullScreen) {
        optionsRef.current.onEnter?.()
      } else {
        optionsRef.current.onExit?.()
      }
    }

    const handleFullScreenError = (event: Event) => {
      optionsRef.current.onError?.(new Error('Fullscreen request failed'))
    }

    // Add event listeners for all browser variants
    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ]

    const errorEvents = [
      'fullscreenerror',
      'webkitfullscreenerror',
      'mozfullscreenerror',
      'MSFullscreenError'
    ]

    events.forEach(event => {
      document.addEventListener(event, handleFullScreenChange)
    })

    errorEvents.forEach(event => {
      document.addEventListener(event, handleFullScreenError)
    })

    // Initial state check
    handleFullScreenChange()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleFullScreenChange)
      })
      errorEvents.forEach(event => {
        document.removeEventListener(event, handleFullScreenError)
      })
    }
  }, [checkSupport, getFullScreenElement])

  return {
    isSupported,
    isFullScreen,
    enterFullScreen,
    exitFullScreen,
    toggleFullScreen,
    onFullScreenChange
  }
}

/**
 * Screen Lock API Hook for mobile devices
 * 화면 잠금 방지 (모바일에서 유용)
 */
export function useScreenLock() {
  const [isLocked, setIsLocked] = useState(false)
  const wakeLockRef = useRef<any>(null)

  const requestScreenLock = useCallback(async (): Promise<boolean> => {
    if (!('wakeLock' in navigator)) {
      console.warn('Screen Wake Lock API not supported')
      return false
    }

    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      setIsLocked(true)
      
      wakeLockRef.current.addEventListener('release', () => {
        setIsLocked(false)
      })
      
      return true
    } catch (error) {
      console.error('Failed to acquire screen lock:', error)
      return false
    }
  }, [])

  const releaseScreenLock = useCallback(async (): Promise<boolean> => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
        setIsLocked(false)
        return true
      } catch (error) {
        console.error('Failed to release screen lock:', error)
        return false
      }
    }
    return true
  }, [])

  // Auto-release on component unmount
  useEffect(() => {
    return () => {
      releaseScreenLock()
    }
  }, [releaseScreenLock])

  // Re-acquire lock when page becomes visible (mobile browser tab switching)
  useEffect(() => {
    if (!isLocked) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wakeLockRef.current?.released) {
        requestScreenLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isLocked, requestScreenLock])

  return {
    isLocked,
    isSupported: 'wakeLock' in navigator,
    requestScreenLock,
    releaseScreenLock
  }
}