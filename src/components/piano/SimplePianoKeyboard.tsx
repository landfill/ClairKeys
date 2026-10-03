'use client'

import React from 'react'
import type { SimplePianoKeyboardProps } from '@/types/fallingNotes'
import { Z_INDICES } from '@/utils/visualUtils'
import {
  BASE_PLAYBACK_KEY_WIDTH,
  BLACK_KEY_WIDTH_RATIO
} from '@/utils/pianoLayout'

/**
 * Simple Piano Keyboard Component (HTML/CSS based)
 * Renders 88-key piano keyboard at the bottom of falling notes interface
 * Based on MVP implementation for SimplyPiano-style UI
 */
export default function SimplePianoKeyboard({ 
  layout, 
  activeKeys = new Set(),
  activeFingers,
  learningKeys,
  onKeyPress,
  className = '' 
}: SimplePianoKeyboardProps) {
  // Only wait mode makes the keys playable. Pointer events cover mouse, pen and
  // touch alike, and pressing on pointerdown keeps a tap as immediate as a key.
  const keyInput = (midi: number) => onKeyPress
    ? {
        'data-midi': midi,
        onPointerDown: (event: React.PointerEvent) => {
          event.preventDefault()
          onKeyPress(midi)
        },
      }
    : {}
  const { byMidi, totalWidth } = layout;

  // 학습에서는 각 음을 키보드·스크린리더로 고를 수 있어야 한다. 재생용 표시는 그대로 둔다.
  if (learningKeys) {
    return (
      <div className={`relative select-none ${className}`} style={{ height: '100%', width: totalWidth }}>
        {[...byMidi.entries()].sort(([a], [b]) => a - b).map(([midi, pos]) => {
          const label = learningKeys.get(midi)
          return (
            <button
              type="button"
              key={midi}
              data-midi={midi}
              aria-label={label?.accessibleName}
              aria-pressed={activeKeys.has(midi)}
              onClick={() => onKeyPress?.(midi)}
              className={`absolute rounded-b border border-rule text-xs ${pos.black ? 'bg-ink text-surface' : 'bg-surface text-ink'} ${activeKeys.has(midi) ? 'ring-2 ring-inset ring-accent' : ''}`}
              style={{ left: pos.x, top: 0, width: pos.w, height: pos.black ? '64%' : '100%', zIndex: pos.black ? Z_INDICES.BLACK_KEY : Z_INDICES.WHITE_KEY }}
            >
              <span aria-hidden="true" className={`absolute inset-x-0 bottom-2 ${midi === 60 ? 'font-semibold text-accent' : ''}`}>{label?.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // Borders and shadows shrink with the keys. The reference widths are the ones
  // a key has at the base density, so they are derived rather than written out —
  // a literal here silently stops matching when the black-key ratio changes.
  const referenceWidth = (black: boolean) =>
    black
      ? BASE_PLAYBACK_KEY_WIDTH * BLACK_KEY_WIDTH_RATIO
      : BASE_PLAYBACK_KEY_WIDTH;

  const decorationScale = (width: number, black: boolean) =>
    Math.min(1, width / referenceWidth(black));

  return (
    <div 
      className={`relative select-none ${className}`}
      style={{ height: '100%', width: totalWidth }}
    >
      {/* Render white keys first */}
      {[...byMidi.entries()].map(([midi, pos]) => 
        !pos.black && (
          <div
            key={`white-${midi}`}
            {...keyInput(midi)}
            className={`absolute transition-colors duration-75 ${
              activeKeys.has(midi) 
                ? 'bg-blue-200 shadow-inner' 
                : 'bg-white hover:bg-gray-50'
            }`}
            style={{
              left: pos.x,
              top: 0,
              width: pos.w,
              height: '100%',
              zIndex: Z_INDICES.WHITE_KEY,
              cursor: onKeyPress ? 'pointer' : undefined,
              touchAction: onKeyPress ? 'none' : undefined,
              border: `${Math.max(0.5, decorationScale(pos.w, false))}px solid #cbd5e1`,
              borderBottom: `${Math.max(1, 4 * decorationScale(pos.w, false))}px solid #b6c2d1`,
              borderRadius: `0 0 ${8 * decorationScale(pos.w, false)}px ${8 * decorationScale(pos.w, false)}px`,
              boxShadow: activeKeys.has(midi) 
                ? `inset 0 ${2 * decorationScale(pos.w, false)}px ${4 * decorationScale(pos.w, false)}px rgba(0,0,0,0.1)`
                : `0 ${decorationScale(pos.w, false)}px ${3 * decorationScale(pos.w, false)}px rgba(0,0,0,0.1)`
            }}
          >
            {activeKeys.has(midi) && activeFingers?.has(midi) && <span
              aria-label={`${midi}번 건반 운지 ${activeFingers.get(midi)}`}
              className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded bg-blue-600 px-1 text-xs font-bold text-white"
            >{activeFingers.get(midi)}</span>}
            {midi % 12 === 0 && (
              <span
                aria-label={`C${Math.floor(midi / 12) - 1} octave marker`}
                className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-ink-muted"
                style={{ fontSize: `${Math.max(7, 10 * decorationScale(pos.w, false))}px` }}
              >
                C{Math.floor(midi / 12) - 1}
              </span>
            )}
          </div>
        )
      )}
      
      {/* Render black keys on top */}
      {[...byMidi.entries()].map(([midi, pos]) => 
        pos.black && (
          <div
            key={`black-${midi}`}
            {...keyInput(midi)}
            className={`absolute transition-colors duration-75 ${
              activeKeys.has(midi) 
                ? 'bg-gray-600 shadow-inner' 
                : 'bg-black hover:bg-gray-800'
            }`}
            style={{
              left: pos.x,
              top: 0,
              width: pos.w,
              height: '64%',
              zIndex: Z_INDICES.BLACK_KEY,
              cursor: onKeyPress ? 'pointer' : undefined,
              touchAction: onKeyPress ? 'none' : undefined,
              borderRadius: 6 * decorationScale(pos.w, true),
              boxShadow: activeKeys.has(midi)
                ? `inset 0 ${2 * decorationScale(pos.w, true)}px ${4 * decorationScale(pos.w, true)}px rgba(0,0,0,0.3)`
                : `inset 0 ${-3 * decorationScale(pos.w, true)}px 0 rgba(255,255,255,0.08), 0 ${decorationScale(pos.w, true)}px ${3 * decorationScale(pos.w, true)}px rgba(0,0,0,0.3)`,
              border: `${Math.max(0.5, decorationScale(pos.w, true))}px solid #0b0b0b`
            }}
          >
            {activeKeys.has(midi) && activeFingers?.has(midi) && <span
              aria-label={`${midi}번 건반 운지 ${activeFingers.get(midi)}`}
              className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded bg-blue-600 px-1 text-xs font-bold text-white"
            >{activeFingers.get(midi)}</span>}
          </div>
        )
      )}
    </div>
  );
}
