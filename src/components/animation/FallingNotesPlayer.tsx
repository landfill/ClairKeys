'use client'

import React, { useMemo } from 'react'
import type { CanonicalAnimationData } from '@/types/animationContract'
import { buildKeyLayout } from '@/utils/pianoLayout'
import { canonicalToFallingNotes } from '@/utils/dataConverter'
import { useFallingNotesPlayer } from '@/hooks/useFallingNotesPlayer'
import { MAX_MASTER_GAIN } from '@/hooks/useFallingNotesAudio'
import { MIN_TREBLE_ROLLOFF, MAX_TREBLE_ROLLOFF } from '@/utils/pianoTimbre'
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
  className = ''
}: {
  animationData: CanonicalAnimationData
  className?: string
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
    trebleRolloff,
    totalLength,
    play,
    pause,
    stop,
    seek,
    setTempoScale,
    setVolume,
    setTrebleRolloff
  } = useFallingNotesPlayer(notes)

  // Constants
  const pxPerSec = 140
  const keyWidth = 24
  const keyboardHeight = 120
  
  // Calculate derived values
  const layout = useMemo(() => buildKeyLayout(keyWidth), [keyWidth])
  const height = Math.round(lookAheadSec * pxPerSec)

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
          onPlay={play}
          onPause={pause}
          onStop={stop}
          onSeek={seek}
          onSpeedChange={setTempoScale}
          onModeChange={handleModeChange}
        />
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

      {/* Treble brightness — a tuning control. Higher = darker (partials roll off
          faster). The readout is TREBLE_ROLLOFF; whatever sounds right is the
          value to lock in as DEFAULT_TREBLE_ROLLOFF in pianoTimbre. Unlike
          volume, a change is heard only on notes scheduled after it, since each
          note's spectrum is fixed when it is created. */}
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="treble-rolloff" className="text-xs text-gray-600 whitespace-nowrap">
          고음
        </label>
        <input
          id="treble-rolloff"
          type="range"
          min={MIN_TREBLE_ROLLOFF}
          max={MAX_TREBLE_ROLLOFF}
          step={0.1}
          value={trebleRolloff}
          onChange={(e) => setTrebleRolloff(parseFloat(e.target.value))}
          className="flex-1 max-w-xs"
          aria-label="고음 밝기 (treble rolloff, 높을수록 어두움)"
        />
        <span className="text-xs font-mono text-gray-500 tabular-nums w-10 text-right">
          {trebleRolloff.toFixed(1)}
        </span>
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
