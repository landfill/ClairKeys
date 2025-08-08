'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { PlaybackControls } from '@/components/playback'
import { PracticeGuideControls, PracticeKeyHighlight } from '@/components/practice'
import { PianoAnimationData, PracticeState } from '@/types/animation'
import { getAnimationEngine } from '@/services/animationEngine'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

interface AnimationPlayerProps {
  animationData: PianoAnimationData
  onNotePlay?: (note: string) => void
  onNoteStop?: (note: string) => void
  onActiveNotesChange?: (activeNotes: Set<string>) => void
  className?: string
}

export default function AnimationPlayer({
  animationData,
  onNotePlay,
  onNoteStop,
  onActiveNotesChange,
  className = ''
}: AnimationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [playbackMode, setPlaybackMode] = useState<'listen' | 'follow' | 'practice'>('listen')
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set())
  const [isReady, setIsReady] = useState(false)
  const [practiceState, setPracticeState] = useState<PracticeState | null>(null)

  const animationEngineRef = useRef(getAnimationEngine())
  
  // Performance optimization: Memoize expensive calculations
  const memoizedAnimationData = useMemo(() => animationData, [animationData])
  
  // Performance optimization: Throttle state updates
  const updateThrottleRef = useRef<number | null>(null)
  const THROTTLE_MS = 16 // ~60fps

  // Initialize animation engine
  useEffect(() => {
    const engine = animationEngineRef.current
    
    // Load animation data
    engine.loadAnimation(animationData)
    setIsReady(true)
    
    // Set up event listeners with throttling for performance
    const handleTimeUpdate = (event: any) => {
      if (updateThrottleRef.current) return
      
      updateThrottleRef.current = window.setTimeout(() => {
        setCurrentTime(event.data.time || 0)
        updateThrottleRef.current = null
      }, THROTTLE_MS)
    }
    
    const handlePlayStateChange = (event: any) => {
      setIsPlaying(event.data.isPlaying || false)
    }
    
    const handleSpeedChange = (event: any) => {
      setPlaybackSpeed(event.data.speed || 1.0)
    }
    
    const handleNoteStart = (event: any) => {
      const note = event.data.note
      if (note) {
        onNotePlay?.(note)
        setActiveNotes(prev => {
          // Performance: Only create new Set if note isn't already active
          if (prev.has(note)) return prev
          
          const newSet = new Set(prev)
          newSet.add(note)
          onActiveNotesChange?.(newSet)
          return newSet
        })
      }
    }
    
    const handleNoteEnd = (event: any) => {
      const note = event.data.note
      if (note) {
        onNoteStop?.(note)
        setActiveNotes(prev => {
          // Performance: Only create new Set if note is actually active
          if (!prev.has(note)) return prev
          
          const newSet = new Set(prev)
          newSet.delete(note)
          onActiveNotesChange?.(newSet)
          return newSet
        })
      }
    }

    const handlePracticeStep = (event: any) => {
      const updatedState = engine.getPracticeState()
      setPracticeState(updatedState)
    }

    const handlePracticeComplete = (event: any) => {
      const updatedState = engine.getPracticeState()
      setPracticeState(updatedState)
    }

    const handleTempoIncrease = (event: any) => {
      const updatedState = engine.getPracticeState()
      setPracticeState(updatedState)
      setPlaybackSpeed(event.data.tempo || 1.0)
    }
    
    engine.on('timeUpdate', handleTimeUpdate)
    engine.on('playStateChange', handlePlayStateChange)
    engine.on('speedChange', handleSpeedChange)
    engine.on('noteStart', handleNoteStart)
    engine.on('noteEnd', handleNoteEnd)
    engine.on('practiceStep', handlePracticeStep)
    engine.on('practiceComplete', handlePracticeComplete)
    engine.on('tempoIncrease', handleTempoIncrease)
    
    // Cleanup
    return () => {
      // Clear throttle timeout
      if (updateThrottleRef.current) {
        clearTimeout(updateThrottleRef.current)
        updateThrottleRef.current = null
      }
      
      // Remove event listeners
      engine.off('timeUpdate', handleTimeUpdate)
      engine.off('playStateChange', handlePlayStateChange)
      engine.off('speedChange', handleSpeedChange)
      engine.off('noteStart', handleNoteStart)
      engine.off('noteEnd', handleNoteEnd)
      engine.off('practiceStep', handlePracticeStep)
      engine.off('practiceComplete', handlePracticeComplete)
      engine.off('tempoIncrease', handleTempoIncrease)
    }
  }, [memoizedAnimationData, onNotePlay, onNoteStop, onActiveNotesChange])

  // Sync local state with engine state
  useEffect(() => {
    const engine = animationEngineRef.current
    const state = engine.getState()
    
    setIsPlaying(state.isPlaying)
    setCurrentTime(state.currentTime)
    setPlaybackSpeed(state.speed)
    setPlaybackMode(state.mode)
    setActiveNotes(new Set(state.activeNotes))
    setIsReady(state.isReady)
  }, [])

  const handlePlay = useCallback(() => {
    const engine = animationEngineRef.current
    
    if (isPlaying) {
      engine.pause()
    } else {
      engine.play()
    }
  }, [isPlaying])

  const handleStop = useCallback(() => {
    const engine = animationEngineRef.current
    engine.stop()
  }, [])

  const handleSeek = useCallback((newTime: number) => {
    const engine = animationEngineRef.current
    const clampedTime = Math.max(0, Math.min(newTime, memoizedAnimationData.duration))
    engine.seekTo(clampedTime)
  }, [memoizedAnimationData.duration])

  const handleSpeedChange = useCallback((speed: number) => {
    const engine = animationEngineRef.current
    engine.setSpeed(speed)
  }, [])

  const handleModeChange = useCallback((mode: 'listen' | 'follow' | 'practice') => {
    const engine = animationEngineRef.current
    engine.setMode(mode)
    setPlaybackMode(mode)
    
    if (mode === 'practice') {
      setPracticeState(engine.getPracticeState())
    } else {
      setPracticeState(null)
    }
  }, [])

  // Practice mode handlers (optimized with useCallback)
  const handleStartPractice = useCallback((startTempo: number = 0.5, targetTempo: number = 1.0) => {
    const engine = animationEngineRef.current
    handleModeChange('practice')
    engine.startPracticeMode(startTempo, targetTempo)
    setPracticeState(engine.getPracticeState())
  }, [handleModeChange])

  const handleNextStep = useCallback(() => {
    const engine = animationEngineRef.current
    engine.nextPracticeStep()
    setPracticeState(engine.getPracticeState())
  }, [])

  const handleExitPractice = useCallback(() => {
    handleModeChange('listen')
  }, [handleModeChange])

  const handleToggleTempoProgression = useCallback((enabled: boolean, increment: number = 0.1) => {
    const engine = animationEngineRef.current
    engine.setPracticeTempoProgression(enabled, increment)
  }, [])

  // 키보드 단축키 핸들러 (최적화)
  const handleSpeedIncrease = useCallback(() => {
    const newSpeed = Math.min(2.0, playbackSpeed + 0.25)
    handleSpeedChange(newSpeed)
  }, [playbackSpeed, handleSpeedChange])

  const handleSpeedDecrease = useCallback(() => {
    const newSpeed = Math.max(0.25, playbackSpeed - 0.25)
    handleSpeedChange(newSpeed)
  }, [playbackSpeed, handleSpeedChange])

  const handleToggleMode = useCallback(() => {
    const newMode = playbackMode === 'listen' ? 'follow' : 'listen'
    handleModeChange(newMode)
  }, [playbackMode, handleModeChange])

  const handleSeekBackward = useCallback(() => {
    const newTime = Math.max(0, currentTime - 10)
    handleSeek(newTime)
  }, [currentTime, handleSeek])

  const handleSeekForward = useCallback(() => {
    const newTime = Math.min(memoizedAnimationData.duration, currentTime + 10)
    handleSeek(newTime)
  }, [memoizedAnimationData.duration, currentTime, handleSeek])

  // 키보드 단축키 등록
  useKeyboardShortcuts({
    onTogglePlay: handlePlay,
    onStop: handleStop,
    onSeekBackward: handleSeekBackward,
    onSeekForward: handleSeekForward,
    onSpeedIncrease: handleSpeedIncrease,
    onSpeedDecrease: handleSpeedDecrease,
    onToggleMode: handleToggleMode,
    enabled: isReady
  })


  return (
    <div className={`animation-player bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">
          {animationData.title}
        </h3>
        <p className="text-gray-600">
          {animationData.composer} • {animationData.timeSignature} • {animationData.tempo} BPM
        </p>
      </div>

      {/* Controls - Switch based on mode */}
      {playbackMode === 'practice' ? (
        <div className="mb-6">
          <PracticeGuideControls
            practiceState={practiceState}
            isReady={isReady}
            onStartPractice={handleStartPractice}
            onNextStep={handleNextStep}
            onExitPractice={handleExitPractice}
            onToggleTempoProgression={handleToggleTempoProgression}
          />
        </div>
      ) : (
        <div className="mb-6">
          <PlaybackControls
            isPlaying={isPlaying}
            isReady={isReady}
            currentTime={currentTime}
            duration={animationData.duration}
            playbackSpeed={playbackSpeed}
            playbackMode={playbackMode}
            onPlay={handlePlay}
            onStop={handleStop}
            onSeek={handleSeek}
            onSpeedChange={handleSpeedChange}
            onModeChange={handleModeChange}
          />
        </div>
      )}

      {/* Practice Key Highlight - Show in practice mode */}
      {playbackMode === 'practice' && practiceState?.nextNotes && practiceState.nextNotes.length > 0 && (
        <div className="mb-6">
          <PracticeKeyHighlight nextNotes={practiceState.nextNotes} />
        </div>
      )}

      {/* Active Notes Display - Show in listen/follow modes (memoized) */}
      {useMemo(() => {
        if (playbackMode === 'practice' || activeNotes.size === 0) return null
        
        return (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">활성 음표:</span>
              <span className="text-sm font-medium text-gray-900">
                {activeNotes.size}개
              </span>
            </div>
          </div>
        )
      }, [playbackMode, activeNotes.size])}

      {/* Active Notes Display (for debugging) - memoized */}
      {useMemo(() => {
        if (process.env.NODE_ENV !== 'development' || activeNotes.size === 0) return null
        
        return (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">
              Active notes: {Array.from(activeNotes).join(', ')}
            </p>
          </div>
        )
      }, [activeNotes])}

      {/* Ready Status */}
      {!isReady && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            애니메이션을 로딩 중입니다...
          </p>
        </div>
      )}
    </div>
  )
}