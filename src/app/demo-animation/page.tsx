'use client'

import { useState, useEffect } from 'react'
import { PianoKeyboard } from '@/components/piano'
import { AnimationPlayer } from '@/components/animation'
import { useAnimationEngine } from '@/hooks/useAnimationEngine'
import { PianoAnimationData } from '@/types/animation'
import { Button } from '@/components/ui'

// Sample animation data for testing
const sampleAnimationData: PianoAnimationData = {
  version: '1.0',
  title: 'Twinkle Twinkle Little Star',
  composer: 'Traditional',
  duration: 16,
  tempo: 120,
  timeSignature: '4/4',
  notes: [
    // Twinkle twinkle
    { note: 'C4', startTime: 0, duration: 1, velocity: 0.8 },
    { note: 'C4', startTime: 1, duration: 1, velocity: 0.8 },
    { note: 'G4', startTime: 2, duration: 1, velocity: 0.8 },
    { note: 'G4', startTime: 3, duration: 1, velocity: 0.8 },
    { note: 'A4', startTime: 4, duration: 1, velocity: 0.8 },
    { note: 'A4', startTime: 5, duration: 1, velocity: 0.8 },
    { note: 'G4', startTime: 6, duration: 2, velocity: 0.8 },
    
    // Little star
    { note: 'F4', startTime: 8, duration: 1, velocity: 0.8 },
    { note: 'F4', startTime: 9, duration: 1, velocity: 0.8 },
    { note: 'E4', startTime: 10, duration: 1, velocity: 0.8 },
    { note: 'E4', startTime: 11, duration: 1, velocity: 0.8 },
    { note: 'D4', startTime: 12, duration: 1, velocity: 0.8 },
    { note: 'D4', startTime: 13, duration: 1, velocity: 0.8 },
    { note: 'C4', startTime: 14, duration: 2, velocity: 0.8 },
  ],
  metadata: {
    originalFileName: 'twinkle.pdf',
    fileSize: 1024,
    processedAt: new Date().toISOString(),
    difficulty: 'beginner'
  }
}

export default function AnimationDemoPage() {
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set())
  const [userPressedKeys, setUserPressedKeys] = useState<string[]>([])
  const [followModeScore, setFollowModeScore] = useState({ correct: 0, total: 0 })
  
  const {
    state,
    loadAnimation,
    play,
    pause,
    stop,
    seekTo,
    setSpeed,
    setMode,
    processUserInput,
    addEventListener,
    removeEventListener
  } = useAnimationEngine({ debug: true })

  // Load sample animation on mount
  useEffect(() => {
    loadAnimation(sampleAnimationData)
  }, [loadAnimation])

  // Handle piano key press
  const handleKeyPress = (note: string) => {
    setUserPressedKeys(prev => [...prev, note])
    
    // Process input for follow mode
    if (state.mode === 'follow') {
      const isCorrect = processUserInput(note)
      setFollowModeScore(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1
      }))
    }
  }

  // Handle piano key release
  const handleKeyRelease = (note: string) => {
    setUserPressedKeys(prev => prev.filter(k => k !== note))
  }

  // Handle active notes change from animation
  const handleActiveNotesChange = (notes: Set<string>) => {
    setActiveNotes(notes)
  }

  // Reset follow mode score when mode changes
  useEffect(() => {
    if (state.mode === 'follow') {
      setFollowModeScore({ correct: 0, total: 0 })
    }
  }, [state.mode])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const accuracy = followModeScore.total > 0 
    ? Math.round((followModeScore.correct / followModeScore.total) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Animation Engine Demo
          </h1>
          <p className="text-gray-600">
            Test the piano animation playback engine with visual highlighting and audio synchronization
          </p>
        </div>

        {/* Animation Player */}
        <div className="mb-8">
          <AnimationPlayer
            animationData={sampleAnimationData}
            onActiveNotesChange={handleActiveNotesChange}
            className="mb-6"
          />
        </div>

        {/* Piano Keyboard */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Piano Keyboard</h2>
            <PianoKeyboard
              onKeyPress={handleKeyPress}
              onKeyRelease={handleKeyRelease}
              pressedKeys={userPressedKeys}
              animationActiveKeys={Array.from(activeNotes)}
              height={200}
              className="mb-4"
            />
            
            {/* Keyboard Legend */}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Animation Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <span>User Pressed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Playback Controls */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Playback Controls</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={state.isPlaying ? pause : play}
                  variant="primary"
                  disabled={!state.isReady}
                >
                  {state.isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </Button>
                
                <Button
                  onClick={stop}
                  variant="outline"
                  disabled={!state.isReady}
                >
                  ⏹️ Stop
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Speed: {state.speed}x
                </label>
                <input
                  type="range"
                  min="0.25"
                  max="2"
                  step="0.25"
                  value={state.speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full"
                  disabled={!state.isReady}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode
                </label>
                <select
                  value={state.mode}
                  onChange={(e) => setMode(e.target.value as 'listen' | 'follow')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={!state.isReady}
                >
                  <option value="listen">Listen Mode</option>
                  <option value="follow">Follow Mode</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seek to Time
                </label>
                <input
                  type="range"
                  min="0"
                  max={sampleAnimationData.duration}
                  step="0.1"
                  value={state.currentTime}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  className="w-full"
                  disabled={!state.isReady}
                />
                <div className="text-sm text-gray-500 mt-1">
                  {formatTime(state.currentTime)} / {formatTime(sampleAnimationData.duration)}
                </div>
              </div>
            </div>
          </div>

          {/* Status Display */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Status</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Ready:</span>
                <span className={state.isReady ? 'text-green-600' : 'text-red-600'}>
                  {state.isReady ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Playing:</span>
                <span className={state.isPlaying ? 'text-green-600' : 'text-gray-600'}>
                  {state.isPlaying ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Current Time:</span>
                <span>{formatTime(state.currentTime)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Speed:</span>
                <span>{state.speed}x</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Mode:</span>
                <span className="capitalize">{state.mode}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Active Notes:</span>
                <span>{state.activeNotes.size}</span>
              </div>

              {state.mode === 'follow' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accuracy:</span>
                    <span className={accuracy >= 80 ? 'text-green-600' : accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                      {accuracy}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Score:</span>
                    <span>{followModeScore.correct}/{followModeScore.total}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Debug Information */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Debug Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Animation Active Notes:</h4>
                <div className="bg-gray-50 p-2 rounded">
                  {Array.from(activeNotes).join(', ') || 'None'}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">User Pressed Keys:</h4>
                <div className="bg-gray-50 p-2 rounded">
                  {userPressedKeys.join(', ') || 'None'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}