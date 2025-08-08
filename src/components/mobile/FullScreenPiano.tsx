'use client'

/**
 * Full Screen Piano Component
 * Features: 전체화면 API, 가로모드 유도, 최적화된 키보드 레이아웃
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useMobileKeyboardSize, useOrientationChange } from '@/hooks/useMobileKeyboardSize'
import { useFullScreenAPI, useScreenLock } from '@/hooks/useFullScreenAPI'
import { useMobileKeyboardShortcuts } from '@/hooks/useMobileKeyboardShortcuts'
import PianoKeyboard from '@/components/piano/PianoKeyboard'
import MobileTouchOptimizer from '@/components/mobile/MobileTouchOptimizer'
import LandscapePianoInterface from '@/components/mobile/LandscapePianoInterface'
import MobileControlPanel from '@/components/mobile/MobileControlPanel'

interface FullScreenPianoProps {
  onKeyPress?: (keyId: string) => void
  onKeyRelease?: (keyId: string) => void
  highlightedKeys?: string[]
  pressedKeys?: string[]
  animationActiveKeys?: string[]
  onExitFullScreen?: () => void
  enableScreenLock?: boolean
  showKeyLabels?: boolean
  keyboardLayout?: 'full' | 'compact' | 'landscape' | 'auto'
  enableLandscapeMode?: boolean
  enableMobileControls?: boolean
  enableKeyboardShortcuts?: boolean
  
  // Playback controls (optional)
  isPlaying?: boolean
  onTogglePlayback?: () => void
  currentTime?: number
  totalTime?: number
  volume?: number
  onVolumeChange?: (volume: number) => void
}

export default function FullScreenPiano({
  onKeyPress,
  onKeyRelease,
  highlightedKeys = [],
  pressedKeys = [],
  animationActiveKeys = [],
  onExitFullScreen,
  enableScreenLock = true,
  showKeyLabels = false,
  keyboardLayout = 'auto',
  enableLandscapeMode = true,
  enableMobileControls = true,
  enableKeyboardShortcuts = true,
  isPlaying = false,
  onTogglePlayback,
  currentTime = 0,
  totalTime = 0,
  volume = 0.7,
  onVolumeChange
}: FullScreenPianoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [rotationPrompt, setRotationPrompt] = useState(false)
  const [controlsMinimized, setControlsMinimized] = useState(false)
  const [showKeyLabelsState, setShowKeyLabelsState] = useState(showKeyLabels)
  
  const { 
    screenSize, 
    calculateKeyboardDimensions, 
    isMobileDevice, 
    isLandscape,
    canFitFullKeyboard 
  } = useMobileKeyboardSize()

  // Enhanced Full Screen API
  const { 
    isSupported: isFullScreenSupported, 
    isFullScreen, 
    enterFullScreen, 
    exitFullScreen, 
    toggleFullScreen 
  } = useFullScreenAPI({
    navigationUI: 'hide',
    onEnter: () => {
      if (isMobileDevice && !isLandscape) {
        setRotationPrompt(true)
        setTimeout(() => setRotationPrompt(false), 4000)
      }
      if (enableScreenLock) {
        requestScreenLock()
      }
    },
    onExit: () => {
      setRotationPrompt(false)
      if (enableScreenLock) {
        releaseScreenLock()
      }
      onExitFullScreen?.()
    },
    onError: (error) => {
      console.error('Fullscreen error:', error)
    }
  })

  // Screen Lock API for mobile devices
  const { 
    isLocked: isScreenLocked, 
    requestScreenLock, 
    releaseScreenLock 
  } = useScreenLock()
  
  // Mobile keyboard shortcuts
  useMobileKeyboardShortcuts({
    playPause: onTogglePlayback,
    stop: () => onTogglePlayback?.(), // Assuming same handler
    toggleKeyLabels: () => setShowKeyLabelsState(prev => !prev),
    toggleFullScreen: () => toggleFullScreen(containerRef.current || undefined),
    volumeUp: () => onVolumeChange?.(Math.min(1, volume + 0.1)),
    volumeDown: () => onVolumeChange?.(Math.max(0, volume - 0.1)),
    mute: () => onVolumeChange?.(volume > 0 ? 0 : 0.7)
  }, {
    enabled: enableKeyboardShortcuts && isFullScreen,
    preventDefault: true,
    allowInInputs: false
  })

  // Enhanced fullscreen enter function
  const handleEnterFullScreen = useCallback(async () => {
    if (containerRef.current) {
      await enterFullScreen(containerRef.current)
    }
  }, [enterFullScreen])

  // Handle orientation changes
  useOrientationChange(useCallback((landscape: boolean) => {
    if (isFullScreen && isMobileDevice) {
      if (!landscape) {
        setRotationPrompt(true)
        setTimeout(() => setRotationPrompt(false), 4000)
      } else {
        setRotationPrompt(false)
      }
    }
  }, [isFullScreen, isMobileDevice]))

  // Determine optimal layout mode
  const getOptimalLayout = useCallback(() => {
    if (keyboardLayout !== 'auto') {
      return keyboardLayout
    }
    
    // Auto-detect best layout
    if (isMobileDevice && isLandscape && enableLandscapeMode) {
      return 'landscape'
    } else if (canFitFullKeyboard && isLandscape) {
      return 'full'
    } else {
      return 'compact'
    }
  }, [keyboardLayout, isMobileDevice, isLandscape, canFitFullKeyboard, enableLandscapeMode])
  
  // Calculate optimal dimensions for full screen with layout support
  const getFullScreenDimensions = useCallback(() => {
    const containerWidth = screenSize.width
    const availableHeight = screenSize.height - (isFullScreen ? 48 : 120) // 컨트롤 영역 제외
    
    const effectiveLayout = getOptimalLayout()
    
    if (effectiveLayout === 'landscape') {
      // 가로모드 전용 레이아웃은 별도 컴포넌트에서 처리
      return { width: containerWidth, height: availableHeight }
    } else if (isMobileDevice && isLandscape) {
      // 가로모드: 전체 화면 활용
      const height = effectiveLayout === 'full' ? Math.min(availableHeight * 0.8, 350) : Math.min(availableHeight * 0.7, 300)
      return calculateKeyboardDimensions(containerWidth, height)
    } else if (isMobileDevice) {
      // 세로모드: 상단에 더 많은 공간 할당
      const height = effectiveLayout === 'compact' ? Math.min(availableHeight * 0.4, 200) : Math.min(availableHeight * 0.5, 250)
      return calculateKeyboardDimensions(containerWidth, height)
    } else {
      // 데스크탑/태블릿
      const height = effectiveLayout === 'full' ? Math.min(availableHeight * 0.7, 400) : Math.min(availableHeight * 0.6, 350)
      return calculateKeyboardDimensions(containerWidth, height)
    }
  }, [screenSize, isFullScreen, isMobileDevice, isLandscape, calculateKeyboardDimensions, getOptimalLayout])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullScreen) {
        exitFullScreen()
      } else if (event.key === 'F11') {
        event.preventDefault()
        toggleFullScreen(containerRef.current || undefined)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullScreen, exitFullScreen, toggleFullScreen])

  const dimensions = getFullScreenDimensions()
  const currentLayout = getOptimalLayout()
  const shouldUseLandscapeInterface = currentLayout === 'landscape' && isFullScreen

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
          ? 'absolute top-0 left-0 right-0 z-10 bg-gray-900 bg-opacity-90 backdrop-blur-sm' 
          : 'hidden'
      }`}>
        <div className="flex justify-between items-center px-4 py-2">
          <div className="flex items-center space-x-4">
            <span className="text-white text-sm font-medium">
              ClairKeys - 전체화면 피아노
            </span>
            {isMobileDevice && !isLandscape && enableLandscapeMode && (
              <div className="flex items-center text-amber-400 text-sm">
                <svg className="w-4 h-4 mr-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z"/>
                </svg>
                가로모드로 88키 전체 피아노
              </div>
            )}
            <div className="flex items-center space-x-4">
              {enableScreenLock && isScreenLocked && (
                <div className="flex items-center text-green-400 text-sm">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"/>
                  </svg>
                  화면 잠금
                </div>
              )}
              
              {enableKeyboardShortcuts && (
                <div className="flex items-center text-gray-400 text-sm">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z"/>
                  </svg>
                  키보드 단축키 활성
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => toggleFullScreen(containerRef.current || undefined)}
              className="text-white hover:text-gray-300 p-2 rounded-md hover:bg-gray-700 transition-colors"
              title="전체화면 토글 (F11)"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"/>
              </svg>
            </button>
            <button
              onClick={exitFullScreen}
              className="text-white hover:text-gray-300 p-2 rounded-md hover:bg-gray-700 transition-colors"
              title="전체화면 종료 (Esc)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
              </svg>
            </button>
          </div>
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

      {/* 모바일 컨트롤 패널 */}
      {enableMobileControls && isFullScreen && (
        <MobileControlPanel
          isPlaying={isPlaying}
          onPlay={onTogglePlayback}
          onPause={onTogglePlayback}
          onStop={onTogglePlayback}
          volume={volume}
          onVolumeChange={onVolumeChange}
          showKeyLabels={showKeyLabelsState}
          onToggleKeyLabels={() => setShowKeyLabelsState(prev => !prev)}
          onExitFullScreen={exitFullScreen}
          onToggleControls={() => setControlsMinimized(prev => !prev)}
          currentTime={currentTime}
          totalTime={totalTime}
          progress={totalTime > 0 ? currentTime / totalTime : 0}
          isMinimized={controlsMinimized}
          position="top"
          className=""
        />
      )}
      
      {/* 메인 피아노 영역 */}
      <div 
        className={`piano-container flex-1 flex items-center justify-center ${
          isFullScreen ? (enableMobileControls && !controlsMinimized ? 'pt-20' : 'pt-12') : ''
        }`}
        style={{ 
          height: isFullScreen 
            ? `calc(100vh - ${enableMobileControls && !controlsMinimized ? 80 : 48}px)` 
            : 'auto',
          overflow: shouldUseLandscapeInterface ? 'hidden' : (canFitFullKeyboard ? 'hidden' : 'auto')
        }}
      >
        {shouldUseLandscapeInterface ? (
          // 가로모드 전용 피아노 인터페이스
          <LandscapePianoInterface
            onKeyPress={onKeyPress}
            onKeyRelease={onKeyRelease}
            highlightedKeys={highlightedKeys}
            pressedKeys={pressedKeys}
            animationActiveKeys={animationActiveKeys}
            showKeyLabels={showKeyLabelsState}
            enableZoom={true}
            enableAutoScroll={true}
            className="w-full h-full"
          />
        ) : (
          // 기존 피아노 인터페이스
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
        )}
      </div>

      {/* 전체화면 진입 버튼 (일반 모드일 때만 표시) */}
      {!isFullScreen && isFullScreenSupported && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={handleEnterFullScreen}
            className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl transform hover:scale-105"
            title="전체화면 모드 (F11)"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"/>
            </svg>
          </button>
          {isMobileDevice && (
            <div className="absolute top-full right-0 mt-2 text-xs text-gray-600 text-right whitespace-nowrap">
              최적화된 연주를 위해<br />전체화면을 권장합니다
            </div>
          )}
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