'use client'

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CanonicalAnimationData } from '@/types/animationContract'
import { buildResponsiveKeyLayout } from '@/utils/pianoLayout'
import { BOX_BORDER, PX_PER_SEC, planPlaybackGeometry } from '@/utils/playbackGeometry'
import { canonicalToFallingNotes } from '@/utils/dataConverter'
import { useFallingNotesPlayer } from '@/hooks/useFallingNotesPlayer'
import { usePlaybackOrientation } from '@/hooks/usePlaybackOrientation'
import { MAX_MASTER_GAIN } from '@/hooks/useFallingNotesAudio'
import FallingNotes from './FallingNotes'
import SimplePianoKeyboard from '../piano/SimplePianoKeyboard'
import { CompactPlaybackBar, PlaybackControls, TempoDisplay } from '@/components/playback'
import { getActiveNotes } from '@/utils/visualUtils'

/**
 * Standing in for a rotation the device will not perform. The box is laid out
 * along the viewport's opposite axis and then turned about its top-left corner;
 * `translateY(-100%)` brings it back over the viewport afterwards. dvh/dvw are
 * required rather than vh/vw — iOS measures vh against the toolbar-less height,
 * which would push the keyboard off screen.
 */
const rotatedRootStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100dvh',
  height: '100dvw',
  transformOrigin: 'top left',
  transform: 'rotate(90deg) translateY(-100%)',
  overflow: 'hidden',
  zIndex: 40,
  background: '#f9fafb',
}

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
    loopStart,
    loopEnd,
    markLoopStart,
    markLoopEnd,
    clearLoop,
  } = useFallingNotesPlayer(notes)

  // Constants
  const pxPerSec = PX_PER_SEC
  // The idle box has always been a border-box 330px, so the border is inside it.
  const standardVisualizationHeight = Math.round(lookAheadSec * pxPerSec) + 120
  const visualizationRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [visualizationSize, setVisualizationSize] = useState({ width: 0, height: 0 })

  // Fullscreen is requested on the player root so the rotated box, not just the
  // visualization, owns the screen.
  const orientation = usePlaybackOrientation(rootRef)

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
  // The measured element wraps the box, so its content width is the box's own
  // less the border the box draws.
  const layout = useMemo(
    () => buildResponsiveKeyLayout(Math.max(0, visualizationSize.width - BOX_BORDER), notes),
    [notes, visualizationSize.width]
  )

  // The wrapper owns the available height and the box takes the height this
  // returns, which is what keeps the cap from feeding back into its own input.
  const { fallingHeight, keyboardHeight, boxHeight } = planPlaybackGeometry({
    availableHeight: visualizationSize.height > 0
      ? visualizationSize.height
      : standardVisualizationHeight,
    keyWidth: layout.keyWidth,
  })

  // `isPlaying` is still false for as long as play() spends awaiting the
  // AudioContext and the samples, so a plain `!isPlaying` here would release the
  // orientation that the click had just requested. Only the fall from true is a
  // stop.
  const wasPlayingRef = useRef(false)
  useEffect(() => {
    document.body.classList.toggle('playback-active', isPlaying)
    onPlaybackChange?.(isPlaying)
    if (wasPlayingRef.current && !isPlaying) orientation.exit()
    wasPlayingRef.current = isPlaying
    return () => document.body.classList.remove('playback-active')
  }, [isPlaying, onPlaybackChange, orientation])

  // The rotated player is fixed over the whole screen, so anything left
  // scrolling behind it only produces rubber-banding on iOS.
  useEffect(() => {
    document.body.classList.toggle('playback-rotated', orientation.rotate)
    return () => document.body.classList.remove('playback-rotated')
  }, [orientation.rotate])

  // The orientation request has to be issued from the click that produced the
  // user activation. play() awaits the AudioContext and the sample load, which
  // can outlive the activation window that requestFullscreen needs.
  const handlePlay = useCallback(async () => {
    orientation.enter()
    // A start that never happens must not leave a phone turned with nothing
    // playing, and no state transition would report that on its own.
    const started = await play()
    if (!started) orientation.exit()
  }, [orientation, play])

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
    <div
      ref={rootRef}
      className={[
        'w-full mx-auto',
        isPlaying ? 'max-w-none flex flex-col' : 'max-w-6xl',
        // An explicit cross-axis height replaces min-h while rotated; keeping
        // both would constrain the box along the wrong axis.
        isPlaying && !orientation.rotate ? 'min-h-[100dvh]' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={orientation.rotate ? rotatedRootStyle : undefined}
    >
      <TempoDisplay
        tempo={animationData.tempo}
        tempoSource={animationData.tempoSource}
        timingReferenceBpm={animationData.timingReferenceBpm}
        scoreTempo={animationData.scoreTempo}
        isPlaybackActive={isPlaying}
        className={isPlaying ? '' : 'mb-4'}
      />

      {isPlaying ? (
        /* One row instead of four. The landscape viewport this mode targets is
           390px tall in total; the stacked setup chrome cost 264px of it. */
        <div className="mb-2">
          <CompactPlaybackBar
            isReady={sampleStatus !== 'loading'}
            currentTime={currentTime}
            duration={totalLength}
            playbackSpeed={tempoScale}
            volume={volume}
            maxVolume={MAX_MASTER_GAIN}
            onPause={pause}
            onStop={stop}
            onSeek={seek}
            onSpeedChange={setTempoScale}
            onVolumeChange={setVolume}
            loopStart={loopStart}
            loopEnd={loopEnd}
            onLoopStart={markLoopStart}
            onLoopEnd={markLoopEnd}
            onLoopClear={clearLoop}
          />
        </div>
      ) : (
        <>
          {/* Usage Instructions */}
          <div className="mb-4">
            <p className="text-xs text-ink-muted">
              1. 노트의 아랫변이 히트라인(건반 상단)에 닿을 때 건반을 누르세요. 2. 속도를 고르세요. 3. 어려운 곳은 A와 B로 반복하세요.
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
              onPlay={handlePlay}
              onPause={pause}
              onStop={stop}
              onSeek={seek}
              onSpeedChange={setTempoScale}
              onModeChange={handleModeChange}
              loopStart={loopStart}
              loopEnd={loopEnd}
              onLoopStart={markLoopStart}
              onLoopEnd={markLoopEnd}
              onLoopClear={clearLoop}
            />
          </div>

          {/* Master volume — a tuning control. The numeric readout is the master
              gain value; whatever setting sounds right here is the number to lock in
              as DEFAULT_MASTER_GAIN in useFallingNotesAudio. */}
          <div className="mb-4 flex items-center gap-3">
            <label htmlFor="master-volume" className="text-xs text-ink-muted whitespace-nowrap">
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
            <span className="text-xs font-mono text-ink-muted tabular-nums w-10 text-right">
              {volume.toFixed(2)}
            </span>
          </div>
        </>
      )}

      {/* Playback reclaims this row, but never the announcement: a listener who
          cannot see the screen still has to learn that the recorded piano was
          replaced by a synthesised one. */}
      <div
        role="status"
        aria-live="polite"
        className={isPlaying ? 'sr-only' : 'mb-4 text-xs text-ink-muted'}
      >
        {sampleStatus === 'idle' && '녹음 피아노 샘플은 첫 재생 때 준비됩니다.'}
        {sampleStatus === 'loading' && '녹음 피아노 샘플을 준비 중입니다.'}
        {sampleStatus === 'ready' && '녹음 피아노 샘플로 재생합니다.'}
        {sampleStatus === 'degraded' &&
          '샘플이 일부만 준비되었거나 늦어 이번 재생은 합성음으로 재생합니다.'}
        {sampleStatus === 'failed' &&
          '샘플을 불러오지 못해 합성음으로 재생합니다.'}
      </div>

      {/* Main Visualization Area */}
      {/* Two elements with one job each. The wrapper is measured and owns the
          available height; the box takes the height the plan returns. Sizing the
          measured element from its own measurement would be a feedback loop. */}
      <div
        ref={visualizationRef}
        className="w-full"
        style={isPlaying
          ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }
          : undefined}
      >
      <div
        className="w-full border rounded-2xl shadow overflow-hidden"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: isPlaying ? boxHeight : standardVisualizationHeight,
        }}
      >
        {/* Falling Notes Area */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            // The hit line is a boundary, not a decoration: a note that has
            // already been played must not keep falling across the keys.
            overflow: 'hidden',
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
            flexShrink: 0,
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
