'use client'

import React, { useMemo } from 'react'
import type { FallingNotesProps } from '@/types/fallingNotes'
import { 
  notesToVisualNotes, 
  getFingerBadgePosition, 
  shouldShowFingerBadge 
} from '@/utils/visualUtils'

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
      {visualNotes.map((visualNote, index) => {
        const showFingerBadge = shouldShowFingerBadge(visualNote);
        const badgePosition = showFingerBadge ? getFingerBadgePosition(visualNote) : null;
        
        return (
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
          >
            {showFingerBadge && badgePosition && visualNote.finger && (
              <div
                className="absolute flex items-center justify-center font-black text-white select-none"
                style={{
                  left: badgePosition.x - visualNote.x,
                  top: badgePosition.y - visualNote.y,
                  width: badgePosition.size,
                  height: badgePosition.size,
                  fontSize: Math.max(12, badgePosition.size * 0.8),
                  fontWeight: 900,
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9)',
                  zIndex: 15
                }}
              >
                {visualNote.finger}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}