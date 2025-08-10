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
              border: '1px solid #cbd5e1',
              borderBottom: '4px solid #b6c2d1',
              borderRadius: '0 0 8px 8px',
              boxShadow: activeKeys.has(midi) 
                ? 'inset 0 2px 4px rgba(0,0,0,0.1)' 
                : '0 1px 3px rgba(0,0,0,0.1)'
            }}
          />
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
              left: pos.x + pos.w * 0.2,
              top: 0,
              width: pos.w,
              height: '64%',
              zIndex: Z_INDICES.BLACK_KEY,
              borderRadius: 6,
              boxShadow: activeKeys.has(midi)
                ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                : 'inset 0 -3px 0 rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.3)',
              border: '1px solid #0b0b0b'
            }}
          />
        )
      )}
    </div>
  );
}