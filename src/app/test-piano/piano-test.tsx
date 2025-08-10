'use client'

import { useState, useEffect, useMemo } from 'react'
import SimplePianoKeyboard from '@/components/piano/SimplePianoKeyboard'
import AudioSettings from '@/components/audio/AudioSettings'
import { generateTestSequence, noteToKeyNumber, isBlackKey } from '@/utils/piano'
import { buildKeyLayout } from '@/utils/pianoLayout'
import { useAudio } from '@/hooks/useAudio'

export default function PianoTest() {
  const [pressedKeys, setPressedKeys] = useState<string[]>([])
  const [highlightedKeys, setHighlightedKeys] = useState<string[]>([])
  const [lastPressed, setLastPressed] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0)
  const [showAudioSettings, setShowAudioSettings] = useState(false)

  const { playNote, releaseNote, isReady, isInitialized, contextState } = useAudio({
    enableKeyboardShortcuts: true
  })

  const testSequence = generateTestSequence()
  
  // Convert key names to MIDI numbers for SimplePianoKeyboard
  const convertKeyToMidi = (key: string): number => {
    try {
      return noteToKeyNumber(key)
    } catch (error) {
      console.error('Error converting key to MIDI:', key, error)
      return 60 // Default to C4
    }
  }
  
  // Create piano layout
  const keyWidth = 24
  const layout = useMemo(() => buildKeyLayout(keyWidth), [keyWidth])
  
  // Convert string arrays to MIDI Sets for SimplePianoKeyboard
  const activeKeys = useMemo(() => {
    const midiKeys = new Set<number>()
    highlightedKeys.forEach(key => {
      const midi = convertKeyToMidi(key)
      midiKeys.add(midi)
    })
    pressedKeys.forEach(key => {
      const midi = convertKeyToMidi(key)
      midiKeys.add(midi)
    })
    return midiKeys
  }, [highlightedKeys, pressedKeys])

  const handleKeyPress = (key: string) => {
    console.log('Key pressed:', key)
    setLastPressed(key)
    setPressedKeys(prev => [...prev, key])
    
    // Show key info
    try {
      const keyNumber = noteToKeyNumber(key)
      const isBlack = isBlackKey(key)
      console.log(`Key ${key}: Number ${keyNumber}, ${isBlack ? 'Black' : 'White'} key`)
    } catch (error) {
      console.error('Error getting key info:', error)
    }
  }

  const handleKeyRelease = (key: string) => {
    console.log('Key released:', key)
    setPressedKeys(prev => prev.filter(k => k !== key))
  }

  const playSequence = () => {
    if (isPlaying) {
      setIsPlaying(false)
      setHighlightedKeys([])
      return
    }

    setIsPlaying(true)
    setCurrentSequenceIndex(0)
  }

  const playChord = () => {
    const chord = ['C4', 'E4', 'G4'] // C major chord
    setHighlightedKeys(chord)
    chord.forEach(note => playNote(note, 0.7, 1.5))
    
    setTimeout(() => {
      setHighlightedKeys([])
    }, 1500)
  }

  const playArpeggio = () => {
    const arpeggio = ['C4', 'E4', 'G4', 'C5']
    let index = 0
    
    const playNext = () => {
      if (index < arpeggio.length) {
        const note = arpeggio[index]
        setHighlightedKeys([note])
        playNote(note, 0.8, 0.4)
        index++
        setTimeout(playNext, 300)
      } else {
        setHighlightedKeys([])
      }
    }
    
    playNext()
  }

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      if (currentSequenceIndex >= testSequence.length) {
        setIsPlaying(false)
        setHighlightedKeys([])
        setCurrentSequenceIndex(0)
        return
      }

      const currentKey = testSequence[currentSequenceIndex]
      setHighlightedKeys([currentKey])
      // Play the note with audio
      playNote(currentKey, 0.8, 0.5)
      setCurrentSequenceIndex(prev => prev + 1)
    }, 600)

    return () => clearInterval(interval)
  }, [isPlaying, currentSequenceIndex, testSequence, playNote])

  const testKeyRange = () => {
    // Test first, middle, and last keys
    const testKeys = ['A0', 'C4', 'C8']
    setHighlightedKeys(testKeys)
    testKeys.forEach((key, index) => {
      setTimeout(() => playNote(key, 0.8, 0.5), index * 200)
    })
  }

  const testBlackKeys = () => {
    const blackKeys = ['C#4', 'D#4', 'F#4', 'G#4', 'A#4']
    setHighlightedKeys(blackKeys)
    blackKeys.forEach((key, index) => {
      setTimeout(() => playNote(key, 0.8, 0.3), index * 150)
    })
  }

  const testWhiteKeys = () => {
    const whiteKeys = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']
    setHighlightedKeys(whiteKeys)
    whiteKeys.forEach((key, index) => {
      setTimeout(() => playNote(key, 0.8, 0.3), index * 150)
    })
  }

  const clearAll = () => {
    setHighlightedKeys([])
    setPressedKeys([])
    setIsPlaying(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Piano Audio System Test</h1>
        
        {/* Audio Status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Audio Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <span className="font-medium">Audio Ready:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                isReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isReady ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">Initialized:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                isInitialized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {isInitialized ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">Context:</span>
              <span className="px-2 py-1 rounded text-sm bg-gray-100 text-gray-800">
                {contextState}
              </span>
            </div>
          </div>
          {!isReady && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                오디오를 사용하려면 피아노 키를 클릭하여 오디오를 활성화하세요.
              </p>
            </div>
          )}
        </div>
        
        {/* Desktop Piano */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Desktop Piano (200px height) - MVP Style</h2>
          <div className="border rounded" style={{ height: 200, background: '#0f0f10' }}>
            <SimplePianoKeyboard 
              layout={layout} 
              activeKeys={activeKeys}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Note: MVP-style keyboard is display-only. Use test controls below to trigger notes.
          </p>
        </div>

        {/* Mobile Piano */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Mobile Piano (120px height) - MVP Style</h2>
          <div className="border rounded" style={{ height: 120, background: '#0f0f10' }}>
            <SimplePianoKeyboard 
              layout={layout} 
              activeKeys={activeKeys}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Note: MVP-style keyboard is display-only. Use test controls below to trigger notes.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <button
              onClick={playSequence}
              className={`px-4 py-2 rounded font-medium ${
                isPlaying 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isPlaying ? 'Stop Sequence' : 'Play Sequence'}
            </button>
            <button
              onClick={playChord}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Play Chord
            </button>
            <button
              onClick={playArpeggio}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Play Arpeggio
            </button>
            <button
              onClick={testKeyRange}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              Test Range
            </button>
            <button
              onClick={testBlackKeys}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
            >
              Black Keys
            </button>
            <button
              onClick={testWhiteKeys}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              White Keys
            </button>
          </div>
          <div className="flex gap-4">
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowAudioSettings(!showAudioSettings)}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              {showAudioSettings ? 'Hide' : 'Show'} Audio Settings
            </button>
          </div>
        </div>

        {/* Audio Settings */}
        {showAudioSettings && (
          <div className="mb-6">
            <AudioSettings />
          </div>
        )}

        {/* Status Display */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Last Pressed:</h3>
              <p className="bg-gray-100 p-3 rounded font-mono">
                {lastPressed || 'None'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Currently Pressed:</h3>
              <p className="bg-gray-100 p-3 rounded font-mono">
                {pressedKeys.length > 0 ? pressedKeys.join(', ') : 'None'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Highlighted:</h3>
              <p className="bg-gray-100 p-3 rounded font-mono">
                {highlightedKeys.length > 0 ? highlightedKeys.join(', ') : 'None'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Sequence Progress:</h3>
              <p className="bg-gray-100 p-3 rounded font-mono">
                {isPlaying ? `${currentSequenceIndex}/${testSequence.length}` : 'Stopped'}
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions & Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Interaction:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>Use the test control buttons above to trigger piano notes</li>
                <li>MVP-style piano keyboards are display-only (no click interaction)</li>
                <li>Keyboard shortcuts still work: a, w, s, e, d, f, t, g, y, h, u, j, k</li>
                <li>Visual feedback shows active keys in real-time</li>
                <li>Audio plays through the test control buttons</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Audio Features:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>Tone.js-based piano synthesis</li>
                <li>Volume and reverb controls</li>
                <li>ADSR envelope settings</li>
                <li>Polyphonic playback (multiple notes)</li>
                <li>Automatic audio initialization on first interaction</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold mb-2 text-blue-800">MVP Style Changes:</h3>
            <p className="text-sm text-blue-700">
              The piano keyboards now use the MVP-style visual design (HTML/CSS based) instead of Canvas. 
              This provides better performance and consistency with the falling notes player. 
              Interactive functionality is available through the test control buttons and keyboard shortcuts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}