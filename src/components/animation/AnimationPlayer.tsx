'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui'
import { PianoAnimationData } from '@/types/animation'
import { getAnimationEngine } from '@/services/animationEngine'

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
  const [playbackMode, setPlaybackMode] = useState<'listen' | 'follow'>('listen')
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set())
  const [isReady, setIsReady] = useState(false)

  const animationEngineRef = useRef(getAnimationEngine())

  // Initialize animation engine
  useEffect(() => {
    const engine = animationEngineRef.current
    
    // Load animation data
    engine.loadAnimation(animationData)
    setIsReady(true)
    
    // Set up event listeners
    const handleTimeUpdate = (event: any) => {
      setCurrentTime(event.data.time || 0)
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
          const newSet = new Set(prev)
          newSet.delete(note)
          onActiveNotesChange?.(newSet)
          return newSet
        })
      }
    }
    
    engine.on('timeUpdate', handleTimeUpdate)
    engine.on('playStateChange', handlePlayStateChange)
    engine.on('speedChange', handleSpeedChange)
    engine.on('noteStart', handleNoteStart)
    engine.on('noteEnd', handleNoteEnd)
    
    // Cleanup
    return () => {
      engine.off('timeUpdate', handleTimeUpdate)
      engine.off('playStateChange', handlePlayStateChange)
      engine.off('speedChange', handleSpeedChange)
      engine.off('noteStart', handleNoteStart)
      engine.off('noteEnd', handleNoteEnd)
    }
  }, [animationData, onNotePlay, onNoteStop, onActiveNotesChange])

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

  const handlePlay = () => {
    const engine = animationEngineRef.current
    
    if (isPlaying) {
      engine.pause()
    } else {
      engine.play()
    }
  }

  const handleStop = () => {
    const engine = animationEngineRef.current
    engine.stop()
  }

  const handleSeek = (newTime: number) => {
    const engine = animationEngineRef.current
    const clampedTime = Math.max(0, Math.min(newTime, animationData.duration))
    engine.seekTo(clampedTime)
  }

  const handleSpeedChange = (speed: number) => {
    const engine = animationEngineRef.current
    engine.setSpeed(speed)
  }

  const handleModeChange = (mode: 'listen' | 'follow') => {
    const engine = animationEngineRef.current
    engine.setMode(mode)
    setPlaybackMode(mode)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * animationData.duration
    handleSeek(newTime)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = animationData.duration > 0 
    ? (currentTime / animationData.duration) * 100 
    : 0

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

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(animationData.duration)}</span>
        </div>
        <div 
          className="w-full h-2 bg-gray-200 rounded-full cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-2 bg-blue-600 rounded-full transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Button
            onClick={handlePlay}
            variant="primary"
            size="lg"
            disabled={!isReady}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </Button>
          
          <Button
            onClick={handleStop}
            variant="outline"
            size="lg"
            disabled={!isReady}
          >
            ⏹️
          </Button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">속도:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
            disabled={!isReady}
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1.0}>1.0x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2.0}>2.0x</option>
          </select>
        </div>
      </div>

      {/* Mode Control */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">모드:</span>
          <select
            value={playbackMode}
            onChange={(e) => handleModeChange(e.target.value as 'listen' | 'follow')}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
            disabled={!isReady}
          >
            <option value="listen">듣기</option>
            <option value="follow">따라하기</option>
          </select>
        </div>

        {/* Active Notes Count */}
        {activeNotes.size > 0 && (
          <div className="text-sm text-gray-600">
            활성 음표: {activeNotes.size}개
          </div>
        )}
      </div>

      {/* Follow Mode Instructions */}
      {playbackMode === 'follow' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            따라하기 모드: 피아노 건반을 눌러 연주를 따라해보세요.
          </p>
        </div>
      )}

      {/* Active Notes Display (for debugging) */}
      {process.env.NODE_ENV === 'development' && activeNotes.size > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            Active notes: {Array.from(activeNotes).join(', ')}
          </p>
        </div>
      )}

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