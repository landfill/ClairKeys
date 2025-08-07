import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  onTogglePlay?: () => void
  onStop?: () => void
  onSeekBackward?: () => void
  onSeekForward?: () => void
  onSpeedIncrease?: () => void
  onSpeedDecrease?: () => void
  onToggleMode?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onTogglePlay,
  onStop,
  onSeekBackward,
  onSeekForward,
  onSpeedIncrease,
  onSpeedDecrease,
  onToggleMode,
  enabled = true
}: KeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // 입력 필드에서는 단축키 비활성화
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          onTogglePlay?.()
          break
        
        case 'KeyS':
          if (event.ctrlKey || event.metaKey) return
          event.preventDefault()
          onStop?.()
          break
        
        case 'ArrowLeft':
          event.preventDefault()
          onSeekBackward?.()
          break
        
        case 'ArrowRight':
          event.preventDefault()
          onSeekForward?.()
          break
        
        case 'ArrowUp':
          event.preventDefault()
          onSpeedIncrease?.()
          break
        
        case 'ArrowDown':
          event.preventDefault()
          onSpeedDecrease?.()
          break
        
        case 'KeyM':
          if (event.ctrlKey || event.metaKey) return
          event.preventDefault()
          onToggleMode?.()
          break
        
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    enabled,
    onTogglePlay,
    onStop,
    onSeekBackward,
    onSeekForward,
    onSpeedIncrease,
    onSpeedDecrease,
    onToggleMode
  ])
}

export default useKeyboardShortcuts