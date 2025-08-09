'use client'

import { useEffect, useCallback, useRef } from 'react'

interface KeyboardShortcuts {
  // Playback controls
  playPause?: () => void
  stop?: () => void
  seekForward?: () => void
  seekBackward?: () => void
  
  // Piano controls
  toggleKeyLabels?: () => void
  toggleFullScreen?: () => void
  
  // Volume controls
  volumeUp?: () => void
  volumeDown?: () => void
  mute?: () => void
  
  // Navigation
  nextSection?: () => void
  previousSection?: () => void
  
  // Practice mode
  togglePracticeMode?: () => void
  slowDown?: () => void
  speedUp?: () => void
}

interface ShortcutConfig {
  enabled?: boolean
  preventDefault?: boolean
  allowInInputs?: boolean
}

/**
 * Mobile Keyboard Shortcuts Hook
 * 모바일 기기의 외장 키보드 또는 물리적 버튼을 위한 키보드 단축키
 */
export function useMobileKeyboardShortcuts(
  shortcuts: KeyboardShortcuts,
  config: ShortcutConfig = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    allowInInputs = false
  } = config
  
  const shortcutsRef = useRef(shortcuts)
  const configRef = useRef(config)
  
  // Update refs when props change
  useEffect(() => {
    shortcutsRef.current = shortcuts
    configRef.current = config
  }, [shortcuts, config])
  
  // Check if we should ignore the event
  const shouldIgnoreEvent = useCallback((event: KeyboardEvent): boolean => {
    if (!configRef.current.allowInInputs) {
      const target = event.target as HTMLElement
      const tagName = target.tagName.toLowerCase()
      const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select'
      const isContentEditable = target.contentEditable === 'true'
      
      if (isInput || isContentEditable) {
        return true
      }
    }
    
    return false
  }, [])
  
  // Handle keydown events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || shouldIgnoreEvent(event)) {
      return
    }
    
    const { key, code, metaKey, ctrlKey, shiftKey, altKey } = event
    const currentShortcuts = shortcutsRef.current
    const currentConfig = configRef.current
    let handled = false
    
    // Playback controls
    if (key === ' ' || key === 'Spacebar') {
      // Space: Play/Pause
      currentShortcuts.playPause?.()
      handled = true
    } else if (key === 'Escape') {
      // Escape: Stop or Exit fullscreen
      if (document.fullscreenElement) {
        currentShortcuts.toggleFullScreen?.()
      } else {
        currentShortcuts.stop?.()
      }
      handled = true
    } else if (key === 'ArrowLeft') {
      // Left Arrow: Seek backward
      if (shiftKey) {
        // Shift + Left: Previous section
        currentShortcuts.previousSection?.()
      } else {
        // Left: Seek backward
        currentShortcuts.seekBackward?.()
      }
      handled = true
    } else if (key === 'ArrowRight') {
      // Right Arrow: Seek forward
      if (shiftKey) {
        // Shift + Right: Next section
        currentShortcuts.nextSection?.()
      } else {
        // Right: Seek forward
        currentShortcuts.seekForward?.()
      }
      handled = true
    } else if (key === 'ArrowUp') {
      // Up Arrow: Volume up or Speed up
      if (shiftKey) {
        currentShortcuts.speedUp?.()
      } else {
        currentShortcuts.volumeUp?.()
      }
      handled = true
    } else if (key === 'ArrowDown') {
      // Down Arrow: Volume down or Slow down
      if (shiftKey) {
        currentShortcuts.slowDown?.()
      } else {
        currentShortcuts.volumeDown?.()
      }
      handled = true
    }
    
    // Letter keys
    else if (key.toLowerCase() === 'f') {
      // F: Toggle fullscreen
      if (!metaKey && !ctrlKey) {
        currentShortcuts.toggleFullScreen?.()
        handled = true
      }
    } else if (key.toLowerCase() === 'l') {
      // L: Toggle key labels
      currentShortcuts.toggleKeyLabels?.()
      handled = true
    } else if (key.toLowerCase() === 'm') {
      // M: Mute/Unmute
      currentShortcuts.mute?.()
      handled = true
    } else if (key.toLowerCase() === 'p') {
      // P: Toggle practice mode
      currentShortcuts.togglePracticeMode?.()
      handled = true
    } else if (key.toLowerCase() === 's') {
      // S: Stop
      if (!metaKey && !ctrlKey) {
        currentShortcuts.stop?.()
        handled = true
      }
    }
    
    // Function keys
    else if (key === 'F11') {
      // F11: Toggle fullscreen
      currentShortcuts.toggleFullScreen?.()
      handled = true
    }
    
    // Number keys for quick volume
    else if (/^[0-9]$/.test(key)) {
      const volume = parseInt(key) / 10
      // This would need to be handled by the parent component
      // We just prevent default here
      if (altKey) {
        handled = true
      }
    }
    
    // Media keys (if supported)
    else if (key === 'MediaPlayPause') {
      currentShortcuts.playPause?.()
      handled = true
    } else if (key === 'MediaStop') {
      currentShortcuts.stop?.()
      handled = true
    } else if (key === 'MediaTrackNext') {
      currentShortcuts.nextSection?.()
      handled = true
    } else if (key === 'MediaTrackPrevious') {
      currentShortcuts.previousSection?.()
      handled = true
    } else if (key === 'AudioVolumeUp') {
      currentShortcuts.volumeUp?.()
      handled = true
    } else if (key === 'AudioVolumeDown') {
      currentShortcuts.volumeDown?.()
      handled = true
    } else if (key === 'AudioVolumeMute') {
      currentShortcuts.mute?.()
      handled = true
    }
    
    if (handled && currentConfig.preventDefault) {
      event.preventDefault()
      event.stopPropagation()
    }
  }, [enabled, shouldIgnoreEvent])
  
  // Set up event listeners
  useEffect(() => {
    if (!enabled) return
    
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
  
  // Return available shortcuts for display
  const availableShortcuts = {
    playback: {
      'Space': '재생/일시정지',
      'S': '정지',
      'Escape': '정지 또는 전체화면 종료',
      '←': '뒤로 감기',
      '→': '앞으로 감기',
      'Shift + ←': '이전 섹션',
      'Shift + →': '다음 섹션'
    },
    volume: {
      '↑': '볼륨 올리기',
      '↓': '볼륨 내리기', 
      'M': '음소거 토글',
      'Alt + 0-9': '볼륨 설정 (0-100%)'
    },
    piano: {
      'L': '건반 라벨 토글',
      'F': '전체화면 토글',
      'F11': '전체화면 토글'
    },
    practice: {
      'P': '연습모드 토글',
      'Shift + ↑': '속도 올리기',
      'Shift + ↓': '속도 내리기'
    },
    media: {
      'Media Play/Pause': '재생/일시정지',
      'Media Stop': '정지',
      'Media Next': '다음 섹션',
      'Media Previous': '이전 섹션',
      'Volume Up': '볼륨 올리기',
      'Volume Down': '볼륨 내리기',
      'Volume Mute': '음소거'
    }
  }
  
  return {
    availableShortcuts,
    isEnabled: enabled
  }
}