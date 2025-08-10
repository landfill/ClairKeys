'use client'

import React, { useMemo } from 'react'
import type { FallingNotesProps } from '@/types/fallingNotes'
import { notesToVisualNotes } from '@/utils/visualUtils'

/**
 * Falling Notes Component
 * Renders animated falling notes that represent the musical score
 * Based on MVP implementation for SimplyPiano-style visualization
 */
export default function FallingNotes({
  notes,
  nowSec,
  pxPerSec,
  height,
  layout
}: FallingNotesProps) {
  // Convert notes to visual representations, memoized for performance
  const visualNotes = useMemo(() => {
    return notesToVisualNotes(notes, nowSec, pxPerSec, height, layout);
  }, [notes, nowSec, pxPerSec, height, layout]);

  return (
    <div 
      className="absolute left-0 right-0" 
      style={{ top: 0, height }}
    >
      {visualNotes.map((visualNote, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            transform: `translate(${visualNote.x}px, ${visualNote.y}px)`,
            width: visualNote.w,
            height: visualNote.h,
            background: visualNote.color,
            boxShadow: '0 1px 8px rgba(0,0,0,0.45)',
            borderRadius: 6,
            zIndex: visualNote.z
          }}
        />
      ))}
    </div>
  );
}