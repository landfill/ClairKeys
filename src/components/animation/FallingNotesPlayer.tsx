'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import type { FallingNote } from '@/types/fallingNotes'
import type { PianoAnimationData } from '@/types/animation'
import { buildKeyLayout } from '@/utils/pianoLayout'
import { convertToFallingNotes } from '@/utils/dataConverter'
import { useFallingNotesPlayer } from '@/hooks/useFallingNotesPlayer'
import FallingNotes from './FallingNotes'
import SimplePianoKeyboard from '../piano/SimplePianoKeyboard'
import { PlaybackControls } from '@/components/playback'

/**
 * Falling Notes Player - MVP Style Piano Visualization
 * Integrates falling notes animation with piano keyboard
 * Based on MVP ClairKeys component for SimplyPiano-style UI
 */
export default function FallingNotesPlayer({
  animationData,
  className = ''
}: {
  animationData: PianoAnimationData
  className?: string
}) {
  // Convert animation data to falling notes format
  const notes = useMemo(() => convertToFallingNotes(animationData), [animationData])
  
  // Use falling notes player hook for audio-visual synchronization
  const {
    isPlaying,
    currentTime,
    tempoScale,
    mute,
    lookAheadSec,
    totalLength,
    play,
    pause,
    stop,
    seek,
    setTempoScale,
    setMute,
    setLookAheadSec,
    togglePlayPause
  } = useFallingNotesPlayer(notes)

  // Constants
  const pxPerSec = 140
  const keyWidth = 24
  const keyboardHeight = 120
  
  // Animation state
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set())
  
  // Calculate derived values
  const layout = useMemo(() => buildKeyLayout(keyWidth), [keyWidth])
  const height = Math.round(lookAheadSec * pxPerSec)
  
  // Update active keys based on current time
  useEffect(() => {
    const currentActiveNotes = notes.filter(note => 
      note.start <= currentTime && 
      currentTime <= note.start + note.duration
    )
    const newActiveKeys = new Set(currentActiveNotes.map(note => note.midi))
    setActiveKeys(newActiveKeys)
  }, [notes, currentTime])
  
  // Playback control handlers
  const handleModeChange = (mode: 'listen' | 'follow' | 'practice') => {
    // For now, we only support listen mode in falling notes player
    console.log('Mode change not yet implemented:', mode)
  }

  return (
    <div className={`w-full max-w-5xl mx-auto ${className}`}>
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
          isReady={true}
          currentTime={currentTime}
          duration={totalLength}
          playbackSpeed={tempoScale}
          playbackMode="listen"
          onPlay={togglePlayPause}
          onStop={stop}
          onSeek={seek}
          onSpeedChange={setTempoScale}
          onModeChange={handleModeChange}
        />
      </div>
      
      {/* Main Visualization Area */}
      <div
        className="w-full border rounded-2xl shadow overflow-hidden"
        style={{ height: height + keyboardHeight }}
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
              height={height}
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