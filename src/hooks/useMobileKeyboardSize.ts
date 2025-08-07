'use client'

import { useState, useEffect, useCallback } from 'react'

interface ScreenSize {
  width: number
  height: number
  isLandscape: boolean
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

interface KeyboardDimensions {
  width: number
  height: number
  keyWidth: number
  blackKeyWidth: number
  blackKeyHeight: number
  scale: number
  minKeySize: number
  optimalTouchTarget: number
}

export function useMobileKeyboardSize() {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    width: 0,
    height: 0,
    isLandscape: false,
    isMobile: false,
    isTablet: false,
    isDesktop: false
  })

  // Update screen size information
  const updateScreenSize = useCallback(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    const isLandscape = width > height

    setScreenSize({
      width,
      height,
      isLandscape,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024
    })
  }, [])

  // Calculate optimal keyboard dimensions
  const calculateKeyboardDimensions = useCallback((
    containerWidth: number,
    preferredHeight: number = 200
  ): KeyboardDimensions => {
    const { isMobile, isTablet, isLandscape } = screenSize
    
    // Base calculations
    const whiteKeys = 52 // 88키 피아노의 흰 건반 수
    const baseKeyWidth = containerWidth / whiteKeys
    
    // 터치 최적화를 위한 최소 크기 설정
    const minTouchTarget = isMobile ? 44 : isTablet ? 36 : 32 // Apple/Material Design 가이드라인
    const optimalTouchTarget = isMobile ? 48 : 42
    
    // 스케일 계산
    let scale = 1
    let keyWidth = baseKeyWidth
    
    if (isMobile) {
      if (isLandscape) {
        // 가로모드: 키 크기 우선
        const minScale = minTouchTarget / baseKeyWidth
        scale = Math.max(minScale, 0.8)
        keyWidth = baseKeyWidth * scale
      } else {
        // 세로모드: 스크롤 허용하고 터치 최적화
        const optimalScale = optimalTouchTarget / baseKeyWidth
        scale = Math.max(optimalScale, 1.2)
        keyWidth = baseKeyWidth * scale
      }
    } else if (isTablet) {
      // 태블릿: 균형있는 크기 조정
      const minScale = minTouchTarget / baseKeyWidth
      scale = Math.max(minScale, 0.9)
      keyWidth = baseKeyWidth * scale
    }
    
    // 높이 조정
    let height = preferredHeight
    if (isMobile) {
      height = isLandscape 
        ? Math.min(preferredHeight, screenSize.height * 0.4) // 가로모드: 화면의 40%
        : Math.min(preferredHeight * 1.2, screenSize.height * 0.3) // 세로모드: 화면의 30%
    }

    const blackKeyWidth = keyWidth * 0.6
    const blackKeyHeight = height * 0.6

    return {
      width: containerWidth * scale,
      height,
      keyWidth,
      blackKeyWidth,
      blackKeyHeight,
      scale,
      minKeySize: minTouchTarget,
      optimalTouchTarget
    }
  }, [screenSize])

  // Responsive breakpoints
  const getResponsiveConfig = useCallback(() => {
    const { isMobile, isTablet, isDesktop, isLandscape } = screenSize

    if (isMobile) {
      return {
        scrollable: !isLandscape, // 세로모드에서는 스크롤 허용
        centerKeys: isLandscape, // 가로모드에서는 키 중앙 정렬
        showOctaveMarkers: isLandscape, // 가로모드에서만 옥타브 표시
        compactControls: true,
        minHeight: isLandscape ? 120 : 160,
        maxHeight: isLandscape ? 200 : 240,
        keySpacing: 1,
        borderRadius: 8
      }
    } else if (isTablet) {
      return {
        scrollable: false,
        centerKeys: true,
        showOctaveMarkers: true,
        compactControls: false,
        minHeight: 180,
        maxHeight: 280,
        keySpacing: 2,
        borderRadius: 12
      }
    } else {
      return {
        scrollable: false,
        centerKeys: true,
        showOctaveMarkers: true,
        compactControls: false,
        minHeight: 200,
        maxHeight: 300,
        keySpacing: 2,
        borderRadius: 16
      }
    }
  }, [screenSize])

  // Device-specific optimizations
  const getDeviceOptimizations = useCallback(() => {
    const { isMobile, isTablet } = screenSize
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)

    return {
      // Performance optimizations
      shouldUseHardwareAcceleration: isMobile,
      shouldReduceAnimations: isMobile && !isTablet,
      shouldPreventZoom: isMobile,
      
      // Touch optimizations
      touchDelay: isIOS ? 0 : isAndroid ? 32 : 0, // iOS는 터치 지연 없음
      hapticFeedback: isMobile,
      
      // Visual optimizations
      shouldUseGradients: !isMobile || isTablet,
      shouldUseShadows: !isMobile,
      maxFPS: isMobile ? 30 : 60
    }
  }, [screenSize])

  // Setup event listeners
  useEffect(() => {
    updateScreenSize()
    
    window.addEventListener('resize', updateScreenSize)
    window.addEventListener('orientationchange', () => {
      // 방향 변경 시 약간의 딜레이 후 업데이트
      setTimeout(updateScreenSize, 150)
    })
    
    return () => {
      window.removeEventListener('resize', updateScreenSize)
      window.removeEventListener('orientationchange', updateScreenSize)
    }
  }, [updateScreenSize])

  return {
    screenSize,
    calculateKeyboardDimensions,
    getResponsiveConfig,
    getDeviceOptimizations,
    
    // Utility functions
    isPortrait: screenSize.height > screenSize.width,
    isLandscape: screenSize.width > screenSize.height,
    isMobileDevice: screenSize.isMobile,
    isTabletDevice: screenSize.isTablet,
    isDesktopDevice: screenSize.isDesktop,
    
    // Screen size helpers
    canFitFullKeyboard: screenSize.width >= 800, // 88키가 모두 들어갈 수 있는지
    recommendScrolling: screenSize.width < 600, // 스크롤 권장
    optimalViewportWidth: Math.max(screenSize.width, 800) // 최적 뷰포트 너비
  }
}

// Hook for orientation change detection
export function useOrientationChange(callback: (isLandscape: boolean) => void) {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleOrientationChange = () => {
      // Clear previous timeout
      if (timeoutId) clearTimeout(timeoutId)
      
      // Set new timeout to handle orientation change after animation
      timeoutId = setTimeout(() => {
        const isLandscape = window.innerWidth > window.innerHeight
        callback(isLandscape)
      }, 200)
    }

    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', handleOrientationChange)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleOrientationChange)
    }
  }, [callback])
}

// Hook for viewport meta tag optimization
export function useViewportOptimization() {
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement
    
    if (viewport) {
      const originalContent = viewport.content
      
      // 모바일 최적화 viewport 설정
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      
      return () => {
        viewport.content = originalContent
      }
    }
  }, [])
}