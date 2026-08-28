'use client'

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CanonicalAnimationData } from '@/types/animationContract'
import { buildResponsiveKeyLayout } from '@/utils/pianoLayout'
import { canonicalToFallingNotes } from '@/utils/dataConverter'
import { useFallingNotesPlayer } from '@/hooks/useFallingNotesPlayer'
import { MAX_MASTER_GAIN } from '@/hooks/useFallingNotesAudio'
import FallingNotes from './FallingNotes'
import SimplePianoKeyboard from '../piano/SimplePianoKeyboard'
import { PlaybackControls } from '@/components/playback'
import { getActiveNotes } from '@/utils/visualUtils'

/**
 * Falling Notes Player - MVP Style Piano Visualization
 * Integrates falling notes animation with piano keyboard
 * Based on MVP ClairKeys component for SimplyPiano-style UI
 */
export default function FallingNotesPlayer({
  animationData,
  className = '',
  onPlaybackChange,
}: {
  animationData: CanonicalAnimationData
  className?: string
  onPlaybackChange?: (isPlaying: boolean) => void
}) {
  // Convert canonical animation data to falling notes format
  const notes = useMemo(() => canonicalToFallingNotes(animationData), [animationData])
  
  // Use falling notes player hook for audio-visual synchronization
  const {
    isPlaying,
    currentTime,
    tempoScale,
    lookAheadSec,
    volume,
    sampleStatus,
    totalLength,
    play,
    pause,
    stop,
    seek,
    setTempoScale,
    setVolume,
  } = useFallingNotesPlayer(notes)

  // Constants
  const pxPerSec = 140
  const keyboardHeight = 120
  const standardFallingHeight = Math.round(lookAheadSec * pxPerSec)
  const standardVisualizationHeight = standardFallingHeight + keyboardHeight
  const visualizationRef = useRef<HTMLDivElement>(null)
  const [visualizationSize, setVisualizationSize] = useState({ width: 0, height: 0 })

  // The content box is the coordinate system shared by the keyboard and the
  // falling notes. ResizeObserver keeps it current after breakpoint, rotation,
  // and browser-chrome changes without listening to playback time.
  useLayoutEffect(() => {
    const element = visualizationRef.current
    if (!element) return

    const measure = () => {
      const rect = element.getBoundingClientRect()
      setVisualizationSize({
        width: element.clientWidth || Math.max(0, rect.width - 2),
        height: element.clientHeight || Math.max(0, rect.height - 2),
      })
    }

    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(([entry]) => {
      setVisualizationSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // This runs only when a score is loaded or the containing box is resized;
  // playback time deliberately cannot remap a falling note's horizontal x.
  const layout = useMemo(
    () => buildResponsiveKeyLayout(visualizationSize.width, notes),
    [notes, visualizationSize.width]
  )
  const fallingHeight = visualizationSize.height > 0
    ? Math.max(0, visualizationSize.height - keyboardHeight)
    : Math.max(0, standardFallingHeight - 2)

  useEffect(() => {
    document.body.classList.toggle('playback-active', isPlaying)
    onPlaybackChange?.(isPlaying)
    return () => document.body.classList.remove('playback-active')
  }, [isPlaying, onPlaybackChange])

  // Derive key activation synchronously from the exact playhead passed to the
  // falling-note visualization. An effect would leave the keyboard one render
  // behind whenever the AudioContext clock advances.
  const activeKeys = useMemo(() => {
    return new Set(getActiveNotes(notes, currentTime).map(note => note.midi))
  }, [notes, currentTime])
  
  // Playback control handlers
  const handleModeChange = (mode: 'listen' | 'follow' | 'practice') => {
    // For now, we only support listen mode in falling notes player
    console.log('Mode change not yet implemented:', mode)
  }

  return (
    <div className={`w-full mx-auto ${isPlaying ? 'max-w-none min-h-[100dvh] flex flex-col' : 'max-w-5xl'} ${className}`}>
      {/* Usage Instructions */}
      <div className="mb-4">
        <p className="text-xs text-gray-500">
          노트의 아랫변이 히트라인(건반 상단)에 닿는 순간이 연주 타이밍입니다.
        </p>
      </div>
      
      {/* Playback Controls */}
      <div className="mb-4">
        <PlaybackControls
          isPlaying={isPlaying}
          isReady={sampleStatus !== 'loading'}
          currentTime={currentTime}
          duration={totalLength}
          playbackSpeed={tempoScale}
          playbackMode="listen"
          onPlay={play}
          onPause={pause}
          onStop={stop}
          onSeek={seek}
          onSpeedChange={setTempoScale}
          onModeChange={handleModeChange}
        />
      </div>

      <div
        role="status"
        aria-live="polite"
        className="mb-4 text-xs text-gray-600"
      >
        {sampleStatus === 'idle' && '녹음 피아노 샘플은 첫 재생 때 준비됩니다.'}
        {sampleStatus === 'loading' && '녹음 피아노 샘플을 준비 중입니다.'}
        {sampleStatus === 'ready' && '녹음 피아노 샘플로 재생합니다.'}
        {sampleStatus === 'degraded' &&
          '샘플이 일부만 준비되었거나 늦어 이번 재생은 합성음으로 재생합니다.'}
        {sampleStatus === 'failed' &&
          '샘플을 불러오지 못해 합성음으로 재생합니다.'}
      </div>

      {/* Master volume — a tuning control. The numeric readout is the master
          gain value; whatever setting sounds right here is the number to lock in
          as DEFAULT_MASTER_GAIN in useFallingNotesAudio. */}
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="master-volume" className="text-xs text-gray-600 whitespace-nowrap">
          음량
        </label>
        <input
          id="master-volume"
          type="range"
          min={0}
          max={MAX_MASTER_GAIN}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="flex-1 max-w-xs"
          aria-label="음량 (master gain)"
        />
        <span className="text-xs font-mono text-gray-500 tabular-nums w-10 text-right">
          {volume.toFixed(2)}
        </span>
      </div>

      {/* Main Visualization Area */}
      <div
        ref={visualizationRef}
        className="w-full border rounded-2xl shadow overflow-hidden"
        style={isPlaying
          ? { flex: 1, minHeight: 0 }
          : { height: standardVisualizationHeight }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          {/* Falling Notes Area */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              background: '#0b0b0c'
            }}
          >
            <FallingNotes
              notes={notes}
              nowSec={currentTime}
              pxPerSec={pxPerSec}
              height={fallingHeight}
              layout={layout}
            />
            
            {/* Hit Line */}
            <div
              className="absolute left-0 right-0"
              style={{
                bottom: 0,
                height: 1,
                background: '#1f2937'
              }}
            />
          </div>
          
          {/* Piano Keyboard */}
          <div
            style={{
              height: keyboardHeight,
              background: '#0f0f10'
            }}
          >
            <SimplePianoKeyboard 
              layout={layout} 
              activeKeys={activeKeys}
            />
          </div>
        </div>
      </div>
      
      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
          <p>Current Time: {currentTime.toFixed(2)}s</p>
          <p>Total Length: {totalLength.toFixed(2)}s</p>
          <p>Active Keys: {Array.from(activeKeys).join(', ')}</p>
          <p>Tempo Scale: {tempoScale}x</p>
          <p>Look Ahead: {lookAheadSec}s</p>
        </div>
      )}
    </div>
  )
}
