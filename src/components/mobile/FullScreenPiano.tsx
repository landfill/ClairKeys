'use client'

/**
 * Full Screen Piano Component
 * Features: 전체화면 API, 가로모드 유도, 최적화된 키보드 레이아웃
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useMobileKeyboardSize, useOrientationChange } from '@/hooks/useMobileKeyboardSize'
import PianoKeyboard from '@/components/piano/PianoKeyboard'
import MobileTouchOptimizer from '@/components/mobile/MobileTouchOptimizer'

interface FullScreenPianoProps {
  onKeyPress?: (keyId: string) => void
  onKeyRelease?: (keyId: string) => void
  highlightedKeys?: string[]
  pressedKeys?: string[]
  animationActiveKeys?: string[]
  onExitFullScreen?: () => void
}

export default function FullScreenPiano({
  onKeyPress,
  onKeyRelease,
  highlightedKeys = [],
  pressedKeys = [],
  animationActiveKeys = [],
  onExitFullScreen
}: FullScreenPianoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isLandscapeRequired, setIsLandscapeRequired] = useState(false)
  const [rotationPrompt, setRotationPrompt] = useState(false)
  
  const { 
    screenSize, 
    calculateKeyboardDimensions, 
    isMobileDevice, 
    isLandscape,
    canFitFullKeyboard 
  } = useMobileKeyboardSize()

  // Check if full screen API is supported
  const isFullScreenSupported = useCallback(() => {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    )
  }, [])

  // Enter full screen mode
  const enterFullScreen = useCallback(async () => {
    if (!containerRef.current || !isFullScreenSupported()) return

    try {
      if (containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen()
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        await (containerRef.current as any).webkitRequestFullscreen()
      } else if ((containerRef.current as any).mozRequestFullScreen) {
        await (containerRef.current as any).mozRequestFullScreen()
      } else if ((containerRef.current as any).msRequestFullscreen) {
        await (containerRef.current as any).msRequestFullscreen()
      }

      setIsFullScreen(true)

      // 모바일에서는 가로모드 권장
      if (isMobileDevice && !isLandscape) {
        setIsLandscapeRequired(true)
        setRotationPrompt(true)
        
        // 3초 후 자동으로 프롬프트 숨김
        setTimeout(() => setRotationPrompt(false), 3000)
      }

    } catch (error) {
      console.error('Failed to enter fullscreen:', error)
    }
  }, [isFullScreenSupported, isMobileDevice, isLandscape])

  // Exit full screen mode
  const exitFullScreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if ((document as any).webkitFullscreenElement) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).mozFullScreenElement) {
        await (document as any).mozCancelFullScreen()
      } else if ((document as any).msFullscreenElement) {
        await (document as any).msExitFullscreen()
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error)
    }

    setIsFullScreen(false)
    setIsLandscapeRequired(false)
    setRotationPrompt(false)
    onExitFullScreen?.()
  }, [onExitFullScreen])

  // Handle orientation changes
  useOrientationChange(useCallback((landscape: boolean) => {
    if (isFullScreen && isLandscapeRequired && landscape) {
      setRotationPrompt(false)
    } else if (isFullScreen && isMobileDevice && !landscape) {
      setRotationPrompt(true)
      setTimeout(() => setRotationPrompt(false), 3000)
    }
  }, [isFullScreen, isLandscapeRequired, isMobileDevice]))

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      const fullscreenElement = 
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement

      setIsFullScreen(!!fullscreenElement)
      
      if (!fullscreenElement) {
        setIsLandscapeRequired(false)
        setRotationPrompt(false)
        onExitFullScreen?.()
      }
    }

    document.addEventListener('fullscreenchange', handleFullScreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange)
    document.addEventListener('mozfullscreenchange', handleFullScreenChange)
    document.addEventListener('MSFullscreenChange', handleFullScreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange)
    }
  }, [onExitFullScreen])

  // Calculate optimal dimensions for full screen
  const getFullScreenDimensions = useCallback(() => {
    const containerWidth = screenSize.width
    const availableHeight = screenSize.height - (isFullScreen ? 0 : 120) // 컨트롤 영역 제외
    
    if (isMobileDevice && isLandscape) {
      // 가로모드: 전체 화면 활용
      return calculateKeyboardDimensions(containerWidth, Math.min(availableHeight * 0.7, 300))
    } else if (isMobileDevice) {
      // 세로모드: 상단에 더 많은 공간 할당
      return calculateKeyboardDimensions(containerWidth, Math.min(availableHeight * 0.5, 250))
    } else {
      // 데스크탑/태블릿
      return calculateKeyboardDimensions(containerWidth, Math.min(availableHeight * 0.6, 350))
    }
  }, [screenSize, isFullScreen, isMobileDevice, isLandscape, calculateKeyboardDimensions])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullScreen) {
        exitFullScreen()
      } else if (event.key === 'F11') {
        event.preventDefault()
        isFullScreen ? exitFullScreen() : enterFullScreen()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullScreen, exitFullScreen, enterFullScreen])

  const dimensions = getFullScreenDimensions()

  return (
    <div
      ref={containerRef}
      className={`full-screen-piano relative ${
        isFullScreen 
          ? 'fixed inset-0 z-50 bg-black' 
          : 'w-full h-full'
      }`}
      style={{
        backgroundColor: isFullScreen ? '#000000' : 'transparent',
        overflow: isFullScreen ? 'hidden' : 'visible'
      }}
    >
      {/* 전체화면 컨트롤 바 */}
      <div className={`control-bar ${
        isFullScreen 
          ? 'absolute top-0 left-0 right-0 z-10 bg-gray-900 bg-opacity-80' 
          : 'hidden'
      }`}>
        <div className="flex justify-between items-center px-4 py-2">
          <div className="flex items-center space-x-4">
            <span className="text-white text-sm">
              ClairKeys - 전체화면 피아노
            </span>
            {isLandscapeRequired && !isLandscape && (
              <div className="flex items-center text-amber-400 text-sm">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z"/>
                </svg>
                가로 모드 권장
              </div>
            )}
          </div>
          <button
            onClick={exitFullScreen}
            className="text-white hover:text-gray-300 p-2"
            title="전체화면 종료 (Esc)"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 회전 유도 프롬프트 */}
      {rotationPrompt && (
        <div className="absolute inset-0 z-20 bg-black bg-opacity-90 flex items-center justify-center">
          <div className="text-center text-white p-8">
            <div className="animate-bounce mb-4">
              <svg className="w-16 h-16 mx-auto text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">더 나은 경험을 위해</h3>
            <p className="text-gray-300">
              기기를 가로로 회전하여<br />
              88키 전체를 편리하게 연주하세요
            </p>
          </div>
        </div>
      )}

      {/* 메인 피아노 영역 */}
      <div 
        className={`piano-container flex-1 flex items-center justify-center ${
          isFullScreen ? 'pt-12' : ''
        }`}
        style={{ 
          height: isFullScreen ? `calc(100vh - ${isFullScreen ? 48 : 0}px)` : 'auto',
          overflow: canFitFullKeyboard ? 'hidden' : 'auto'
        }}
      >
        <MobileTouchOptimizer
          enableHapticFeedback={isMobileDevice}
          touchSensitivity="medium"
          preventScrolling={isFullScreen}
        >
          <div 
            className="piano-wrapper"
            style={{
              width: canFitFullKeyboard ? '100%' : `${dimensions.width}px`,
              maxWidth: '100%',
              transform: `scale(${Math.min(1, screenSize.width / dimensions.width)})`,
              transformOrigin: 'center center'
            }}
          >
            <PianoKeyboard
              onKeyPress={onKeyPress}
              onKeyRelease={onKeyRelease}
              highlightedKeys={highlightedKeys}
              pressedKeys={pressedKeys}
              animationActiveKeys={animationActiveKeys}
              height={dimensions.height}
              className={isFullScreen ? 'fullscreen-piano' : ''}
            />
          </div>
        </MobileTouchOptimizer>
      </div>

      {/* 전체화면 진입 버튼 (일반 모드일 때만 표시) */}
      {!isFullScreen && isFullScreenSupported() && (
        <div className="absolute top-2 right-2">
          <button
            onClick={enterFullScreen}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg shadow-lg transition-colors"
            title="전체화면 모드 (F11)"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"/>
            </svg>
          </button>
        </div>
      )}

      {/* 스타일 최적화 */}
      <style jsx global>{`
        .fullscreen-piano {
          border-radius: 0 !important;
        }
        
        .full-screen-piano:fullscreen {
          background-color: #000000;
        }
        
        .full-screen-piano:-webkit-full-screen {
          background-color: #000000;
        }
        
        .full-screen-piano:-moz-full-screen {
          background-color: #000000;
        }
        
        .full-screen-piano:-ms-fullscreen {
          background-color: #000000;
        }

        /* 모바일 터치 최적화 */
        @media (max-width: 768px) {
          .piano-wrapper {
            touch-action: none;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  )
}