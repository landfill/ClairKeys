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
    }\n    \n    // Letter keys\n    else if (key.toLowerCase() === 'f') {\n      // F: Toggle fullscreen\n      if (!metaKey && !ctrlKey) {\n        currentShortcuts.toggleFullScreen?.()\n        handled = true\n      }\n    } else if (key.toLowerCase() === 'l') {\n      // L: Toggle key labels\n      currentShortcuts.toggleKeyLabels?.()\n      handled = true\n    } else if (key.toLowerCase() === 'm') {\n      // M: Mute/Unmute\n      currentShortcuts.mute?.()\n      handled = true\n    } else if (key.toLowerCase() === 'p') {\n      // P: Toggle practice mode\n      currentShortcuts.togglePracticeMode?.()\n      handled = true\n    } else if (key.toLowerCase() === 's') {\n      // S: Stop\n      if (!metaKey && !ctrlKey) {\n        currentShortcuts.stop?.()\n        handled = true\n      }\n    }\n    \n    // Function keys\n    else if (key === 'F11') {\n      // F11: Toggle fullscreen\n      currentShortcuts.toggleFullScreen?.()\n      handled = true\n    }\n    \n    // Number keys for quick volume\n    else if (/^[0-9]$/.test(key)) {\n      const volume = parseInt(key) / 10\n      // This would need to be handled by the parent component\n      // We just prevent default here\n      if (altKey) {\n        handled = true\n      }\n    }\n    \n    // Media keys (if supported)\n    else if (key === 'MediaPlayPause') {\n      currentShortcuts.playPause?.()\n      handled = true\n    } else if (key === 'MediaStop') {\n      currentShortcuts.stop?.()\n      handled = true\n    } else if (key === 'MediaTrackNext') {\n      currentShortcuts.nextSection?.()\n      handled = true\n    } else if (key === 'MediaTrackPrevious') {\n      currentShortcuts.previousSection?.()\n      handled = true\n    } else if (key === 'AudioVolumeUp') {\n      currentShortcuts.volumeUp?.()\n      handled = true\n    } else if (key === 'AudioVolumeDown') {\n      currentShortcuts.volumeDown?.()\n      handled = true\n    } else if (key === 'AudioVolumeMute') {\n      currentShortcuts.mute?.()\n      handled = true\n    }\n    \n    if (handled && currentConfig.preventDefault) {\n      event.preventDefault()\n      event.stopPropagation()\n    }\n  }, [enabled, shouldIgnoreEvent])\n  \n  // Set up event listeners\n  useEffect(() => {\n    if (!enabled) return\n    \n    document.addEventListener('keydown', handleKeyDown)\n    \n    return () => {\n      document.removeEventListener('keydown', handleKeyDown)\n    }\n  }, [enabled, handleKeyDown])\n  \n  // Return available shortcuts for display\n  const availableShortcuts = {\n    playback: {\n      'Space': '재생/일시정지',\n      'S': '정지',\n      'Escape': '정지 또는 전체화면 종료',\n      '←': '뒤로 감기',\n      '→': '앞으로 감기',\n      'Shift + ←': '이전 섹션',\n      'Shift + →': '다음 섹션'\n    },\n    volume: {\n      '↑': '볼륨 올리기',\n      '↓': '볼륨 내리기', \n      'M': '음소거 토글',\n      'Alt + 0-9': '볼륨 설정 (0-100%)'\n    },\n    piano: {\n      'L': '건반 라벨 토글',\n      'F': '전체화면 토글',\n      'F11': '전체화면 토글'\n    },\n    practice: {\n      'P': '연습모드 토글',\n      'Shift + ↑': '속도 올리기',\n      'Shift + ↓': '속도 내리기'\n    },\n    media: {\n      'Media Play/Pause': '재생/일시정지',\n      'Media Stop': '정지',\n      'Media Next': '다음 섹션',\n      'Media Previous': '이전 섹션',\n      'Volume Up': '볼륨 올리기',\n      'Volume Down': '볼륨 내리기',\n      'Volume Mute': '음소거'\n    }\n  }\n  \n  return {\n    availableShortcuts,\n    isEnabled: enabled\n  }\n}