'use client'

import React from 'react'
import type { SimplePianoKeyboardProps } from '@/types/fallingNotes'
import { Z_INDICES } from '@/utils/visualUtils'

/**
 * Simple Piano Keyboard Component (HTML/CSS based)
 * Renders 88-key piano keyboard at the bottom of falling notes interface
 * Based on MVP implementation for SimplyPiano-style UI
 */
export default function SimplePianoKeyboard({ 
  layout, 
  activeKeys = new Set(), 
  className = '' 
}: SimplePianoKeyboardProps) {
  const { byMidi, totalWidth } = layout;

  const decorationScale = (width: number, black: boolean) =>
    Math.min(1, width / (black ? 14.4 : 24));

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
              border: `${Math.max(0.5, decorationScale(pos.w, false))}px solid #cbd5e1`,
              borderBottom: `${Math.max(1, 4 * decorationScale(pos.w, false))}px solid #b6c2d1`,
              borderRadius: `0 0 ${8 * decorationScale(pos.w, false)}px ${8 * decorationScale(pos.w, false)}px`,
              boxShadow: activeKeys.has(midi) 
                ? `inset 0 ${2 * decorationScale(pos.w, false)}px ${4 * decorationScale(pos.w, false)}px rgba(0,0,0,0.1)`
                : `0 ${decorationScale(pos.w, false)}px ${3 * decorationScale(pos.w, false)}px rgba(0,0,0,0.1)`
            }}
          >
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
              borderRadius: 6 * decorationScale(pos.w, true),
              boxShadow: activeKeys.has(midi)
                ? `inset 0 ${2 * decorationScale(pos.w, true)}px ${4 * decorationScale(pos.w, true)}px rgba(0,0,0,0.3)`
                : `inset 0 ${-3 * decorationScale(pos.w, true)}px 0 rgba(255,255,255,0.08), 0 ${decorationScale(pos.w, true)}px ${3 * decorationScale(pos.w, true)}px rgba(0,0,0,0.3)`,
              border: `${Math.max(0.5, decorationScale(pos.w, true))}px solid #0b0b0b`
            }}
          />
        )
      )}
    </div>
  );
}
