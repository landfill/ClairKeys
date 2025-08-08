'use client'

/**
 * Mobile Control Panel Component
 * 모바일 전용 컨트롤 패널 - 전체화면 피아노 모드용
 * Features: 컴팩트한 컨트롤, 제스처 단축키, 접근성
 */

import { useState, useCallback } from 'react'

interface MobileControlPanelProps {
  // Playback controls
  isPlaying?: boolean
  isPaused?: boolean
  onPlay?: () => void
  onPause?: () => void
  onStop?: () => void
  onSeek?: (position: number) => void
  
  // Audio controls
  volume?: number
  onVolumeChange?: (volume: number) => void
  
  // Piano controls
  showKeyLabels?: boolean
  onToggleKeyLabels?: () => void
  
  // Display controls
  onExitFullScreen?: () => void
  onToggleControls?: () => void
  
  // Progress info
  currentTime?: number
  totalTime?: number
  progress?: number
  
  // Appearance
  isMinimized?: boolean
  position?: 'top' | 'bottom' | 'floating'
  className?: string
}

export default function MobileControlPanel({
  isPlaying = false,
  isPaused = false,
  onPlay,
  onPause,
  onStop,
  onSeek,
  volume = 0.7,
  onVolumeChange,
  showKeyLabels = false,
  onToggleKeyLabels,
  onExitFullScreen,
  onToggleControls,
  currentTime = 0,
  totalTime = 0,
  progress = 0,
  isMinimized = false,
  position = 'top',
  className = ''
}: MobileControlPanelProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])
  
  const handlePlayPause = useCallback(() => {
    if (isPlaying && !isPaused) {
      onPause?.()
    } else {
      onPlay?.()
    }
  }, [isPlaying, isPaused, onPlay, onPause])
  
  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value)
    onSeek?.(newPosition)
  }, [onSeek])
  
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    onVolumeChange?.(newVolume)
  }, [onVolumeChange])
  
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])
  
  if (isMinimized) {
    // 최소화된 상태: 재생/일시정지 버튼만 표시
    return (
      <div className={`mobile-control-panel-minimized ${position === 'floating' ? 'fixed' : 'absolute'} 
                      ${position === 'top' ? 'top-4 right-4' : position === 'bottom' ? 'bottom-4 right-4' : 'top-4 right-4'} 
                      z-20 ${className}`}>
        <button
          onClick={handlePlayPause}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-200"
          title={isPlaying && !isPaused ? "일시정지" : "재생"}
        >
          {isPlaying && !isPaused ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 4a1 1 0 011 1v10a1 1 0 01-2 0V5a1 1 0 011-1zm6 0a1 1 0 011 1v10a1 1 0 01-2 0V5a1 1 0 011-1z"/>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.5 7.5a.5.5 0 00-.5.5v4a.5.5 0 00.85.35l3-3a.5.5 0 000-.7l-3-3A.5.5 0 008.5 7.5z"/>
            </svg>
          )}
        </button>
      </div>
    )
  }
  
  return (
    <div className={`mobile-control-panel ${position === 'floating' ? 'fixed' : 'absolute'} 
                    ${position === 'top' ? 'top-0 left-0 right-0' : 'bottom-0 left-0 right-0'} 
                    z-20 bg-gray-900 bg-opacity-95 backdrop-blur-sm ${className}`}>
      
      {/* 메인 컨트롤 바 */}
      <div className="flex items-center justify-between px-4 py-2">
        
        {/* 왼쪽: 재생 컨트롤 */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onStop}
            className="text-white hover:text-gray-300 p-2 rounded-md transition-colors"
            title="정지"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 8a1 1 0 000 2h6a1 1 0 000-2H7z"/>
            </svg>
          </button>
          
          <button
            onClick={handlePlayPause}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md transition-colors"
            title={isPlaying && !isPaused ? "일시정지" : "재생"}
          >
            {isPlaying && !isPaused ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 4a1 1 0 011 1v10a1 1 0 01-2 0V5a1 1 0 011-1zm6 0a1 1 0 011 1v10a1 1 0 01-2 0V5a1 1 0 011-1z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.5 7.5a.5.5 0 00-.5.5v4a.5.5 0 00.85.35l3-3a.5.5 0 000-.7l-3-3A.5.5 0 008.5 7.5z"/>
              </svg>
            )}
          </button>
          
          {/* 시간 표시 */}
          <div className="text-white text-sm">
            {formatTime(currentTime)} / {formatTime(totalTime)}
          </div>
        </div>
        
        {/* 중간: 진행률 바 */}
        <div className="flex-1 mx-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={progress}
            onChange={handleProgressChange}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            title="재생 위치"
          />
        </div>
        
        {/* 오른쪽: 추가 컨트롤 */}
        <div className="flex items-center space-x-2">
          
          {/* 볼륨 컨트롤 */}
          <div className="relative">
            <button
              onClick={() => setShowVolumeSlider(prev => !prev)}
              className="text-white hover:text-gray-300 p-2 rounded-md transition-colors"
              title="볼륨"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3.5a.5.5 0 00-.5-.5H4a.5.5 0 00-.5.5V7H2a1 1 0 000 2h1.5v3.5a.5.5 0 00.5.5h5.5a.5.5 0 00.5-.5V11h1.5a1 1 0 000-2H10V3.5z"/>
              </svg>
            </button>
            
            {showVolumeSlider && (
              <div className={`absolute ${position === 'top' ? 'top-full mt-2' : 'bottom-full mb-2'} 
                             right-0 bg-gray-800 p-3 rounded-lg shadow-lg`}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider vertical"
                  title="볼륨 조절"
                />
                <div className="text-white text-xs text-center mt-1">
                  {Math.round(volume * 100)}%
                </div>
              </div>
            )}
          </div>
          
          {/* 키 라벨 토글 */}
          <button
            onClick={onToggleKeyLabels}
            className={`p-2 rounded-md transition-colors ${
              showKeyLabels 
                ? 'text-blue-400 bg-blue-900 bg-opacity-50' 
                : 'text-white hover:text-gray-300'
            }`}
            title="건반 라벨 표시/숨김"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm2-1a1 1 0 00-1 1v1h2V6a1 1 0 00-1-1zM5 9v1h2V9H5zm0 3v1a1 1 0 001 1h1v-2H5zm3 2h2v-2H8v2zm4 0v-2h-2v2h1a1 1 0 001 0zm1-3V9h-2v1h2zm0-3V6a1 1 0 00-1-1h-1v2h2z"/>
            </svg>
          </button>
          
          {/* 확장/축소 토글 */}
          <button
            onClick={toggleExpanded}
            className="text-white hover:text-gray-300 p-2 rounded-md transition-colors"
            title={isExpanded ? "컨트롤 축소" : "컨트롤 확장"}
          >
            <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                 fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414 6.707 9.707a1 1 0 01-1.414 0z"/>
            </svg>
          </button>
          
          {/* 전체화면 종료 */}
          <button
            onClick={onExitFullScreen}
            className="text-white hover:text-gray-300 p-2 rounded-md transition-colors"
            title="전체화면 종료"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
            </svg>
          </button>
        </div>
      </div>
      
      {/* 확장된 컨트롤 */}
      {isExpanded && (
        <div className="border-t border-gray-700 px-4 py-3">
          <div className="grid grid-cols-3 gap-4">
            
            {/* 재생 모드 */}
            <div className="text-center">
              <div className="text-gray-400 text-xs mb-1">재생모드</div>
              <div className="flex justify-center space-x-1">
                <button className="text-white bg-gray-700 px-2 py-1 rounded text-xs">
                  연속
                </button>
                <button className="text-gray-400 hover:text-white px-2 py-1 rounded text-xs">
                  반복
                </button>
              </div>
            </div>
            
            {/* 속도 조절 */}
            <div className="text-center">
              <div className="text-gray-400 text-xs mb-1">재생속도</div>
              <div className="flex justify-center space-x-1">
                <button className="text-gray-400 hover:text-white px-2 py-1 rounded text-xs">
                  0.5x
                </button>
                <button className="text-white bg-gray-700 px-2 py-1 rounded text-xs">
                  1.0x
                </button>
                <button className="text-gray-400 hover:text-white px-2 py-1 rounded text-xs">
                  1.5x
                </button>
              </div>
            </div>
            
            {/* 연습 모드 */}
            <div className="text-center">
              <div className="text-gray-400 text-xs mb-1">연습모드</div>
              <div className="flex justify-center space-x-1">
                <button className="text-white bg-gray-700 px-2 py-1 rounded text-xs">
                  듣기
                </button>
                <button className="text-gray-400 hover:text-white px-2 py-1 rounded text-xs">
                  연습
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border-radius: 50%;
          border: none;
          cursor: pointer;
        }
        
        .mobile-control-panel {
          box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .mobile-control-panel-minimized {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  )
}