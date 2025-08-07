'use client'

import { PianoNote } from '@/types/animation'

interface PracticeKeyHighlightProps {
  nextNotes: PianoNote[]
  className?: string
}

export default function PracticeKeyHighlight({
  nextNotes,
  className = ''
}: PracticeKeyHighlightProps) {
  if (!nextNotes || nextNotes.length === 0) {
    return null
  }

  return (
    <div className={`practice-key-highlight ${className}`}>
      {/* Key visualization overlay */}
      <div className="relative">
        {/* Visual representation of keys to press */}
        <div className="grid grid-cols-12 gap-1 mb-4">
          {nextNotes.map((note, index) => (
            <div
              key={`${note.note}-${index}`}
              className="practice-key-indicator"
            >
              {/* Key representation */}
              <div className={`
                w-full h-16 rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all duration-500
                ${note.note.includes('#') || note.note.includes('b') 
                  ? 'bg-gray-800 text-white border-gray-600 shadow-lg' 
                  : 'bg-white text-gray-900 border-gray-300 shadow-md'
                }
                animate-pulse
              `}>
                <div className="text-center">
                  <div className="font-bold">{note.note}</div>
                  {note.finger && (
                    <div className="text-xs opacity-75 mt-1">
                      {note.finger}
                    </div>
                  )}
                  {note.hand && (
                    <div className="text-xs opacity-60">
                      {note.hand === 'left' ? 'L' : 'R'}
                    </div>
                  )}
                </div>
              </div>

              {/* Glow effect */}
              <div className="absolute inset-0 rounded-lg bg-blue-400 opacity-30 animate-ping" />
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="text-center p-4 bg-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center justify-center space-x-2 text-blue-800">
            <span className="text-lg">🎹</span>
            <span className="font-medium">
              {nextNotes.length === 1 
                ? `${nextNotes[0].note} 키를 누르세요`
                : `다음 ${nextNotes.length}개 키를 동시에 누르세요`
              }
            </span>
          </div>
          
          {nextNotes.length > 1 && (
            <div className="text-sm text-blue-600 mt-1">
              {nextNotes.map(note => note.note).join(' + ')}
            </div>
          )}

          {/* Finger guidance */}
          {nextNotes.some(note => note.finger) && (
            <div className="mt-2 text-xs text-blue-700">
              손가락 번호: {nextNotes.map(note => note.finger || '?').join(', ')}
            </div>
          )}
        </div>

        {/* Musical staff representation (simplified) */}
        <div className="mt-4 p-3 bg-gray-50 rounded border">
          <div className="text-center text-sm text-gray-600 mb-2">악보 위치</div>
          <div className="relative h-20">
            {/* Staff lines */}
            {[0, 1, 2, 3, 4].map(line => (
              <div
                key={line}
                className="absolute w-full border-t border-gray-400"
                style={{ top: `${line * 20}%` }}
              />
            ))}
            
            {/* Note positions (simplified visualization) */}
            <div className="absolute inset-0 flex items-center justify-center space-x-2">
              {nextNotes.map((note, index) => {
                // Simple note position calculation (this would need proper musical note positioning)
                const notePosition = getNotePosition(note.note)
                return (
                  <div
                    key={`staff-${note.note}-${index}`}
                    className="w-4 h-3 bg-blue-600 rounded-full border border-blue-800"
                    style={{
                      position: 'absolute',
                      top: `${notePosition}%`,
                      left: `${45 + index * 10}%`
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to get approximate staff position for a note
// This is a simplified version - real implementation would need proper musical notation logic
function getNotePosition(note: string): number {
  const noteMap: { [key: string]: number } = {
    'C4': 85,
    'D4': 75,
    'E4': 65,
    'F4': 55,
    'G4': 45,
    'A4': 35,
    'B4': 25,
    'C5': 15,
    'D5': 5,
  }
  
  // Extract base note (without sharp/flat)
  const baseNote = note.replace(/[#b]/, '')
  return noteMap[baseNote] || 50 // Default to middle position
}