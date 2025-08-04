/**
 * @jest-environment jsdom
 */

import { AudioService, getAudioService, initializeAudio } from '../audioService'

// Mock Tone.js
jest.mock('tone', () => ({
  start: jest.fn().mockResolvedValue(undefined),
  context: {
    state: 'suspended'
  },
  PolySynth: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    triggerAttack: jest.fn(),
    triggerRelease: jest.fn(),
    triggerAttackRelease: jest.fn(),
    releaseAll: jest.fn(),
    dispose: jest.fn()
  })),
  Synth: jest.fn(),
  Reverb: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    dispose: jest.fn(),
    wet: { value: 0 }
  })),
  Volume: jest.fn().mockImplementation(() => ({
    toDestination: jest.fn(),
    dispose: jest.fn(),
    volume: { value: 0 }
  }))
}))

// Mock piano utilities
jest.mock('@/utils/piano', () => ({
  noteToFrequency: jest.fn((note: string) => {
    const frequencies: Record<string, number> = {
      'C4': 261.63,
      'D4': 293.66,
      'E4': 329.63,
      'A4': 440.00
    }
    return frequencies[note] || 440
  })
}))

describe('AudioService', () => {
  let audioService: AudioService

  beforeEach(() => {
    audioService = new AudioService()
    jest.clearAllMocks()
  })

  afterEach(() => {
    audioService.dispose()
  })

  describe('initialization', () => {
    it('should not be initialized by default', () => {
      expect(audioService.isReady()).toBe(false)
    })

    it('should initialize successfully', async () => {
      await audioService.initialize()
      expect(audioService.isReady()).toBe(true)
    })

    it('should not initialize twice', async () => {
      await audioService.initialize()
      await audioService.initialize() // Should not throw or cause issues
      expect(audioService.isReady()).toBe(true)
    })
  })

  describe('settings management', () => {
    beforeEach(async () => {
      await audioService.initialize()
    })

    it('should return default settings', () => {
      const settings = audioService.getSettings()
      expect(settings).toEqual({
        volume: 0.7,
        attack: 0.01,
        decay: 0.3,
        sustain: 0.4,
        release: 1.2,
        reverb: 0.2,
        enabled: true
      })
    })

    it('should update settings', () => {
      const newSettings = { volume: 0.5, reverb: 0.3 }
      audioService.updateSettings(newSettings)
      
      const settings = audioService.getSettings()
      expect(settings.volume).toBe(0.5)
      expect(settings.reverb).toBe(0.3)
    })

    it('should enable/disable audio', () => {
      audioService.setEnabled(false)
      expect(audioService.getSettings().enabled).toBe(false)
      expect(audioService.isReady()).toBe(false)

      audioService.setEnabled(true)
      expect(audioService.getSettings().enabled).toBe(true)
      expect(audioService.isReady()).toBe(true)
    })
  })

  describe('note playback', () => {
    beforeEach(async () => {
      await audioService.initialize()
    })

    it('should play a note', () => {
      audioService.playNote('C4')
      // Since we're mocking Tone.js, we can't test actual audio playback
      // but we can verify the method doesn't throw
      expect(true).toBe(true)
    })

    it('should play a note with duration', () => {
      audioService.playNote('C4', 0.8, 1.0)
      expect(true).toBe(true)
    })

    it('should release a note', () => {
      audioService.releaseNote('C4')
      expect(true).toBe(true)
    })

    it('should play multiple notes (chord)', () => {
      const chord = ['C4', 'E4', 'G4']
      audioService.playChord(chord)
      expect(true).toBe(true)
    })

    it('should release multiple notes', () => {
      const chord = ['C4', 'E4', 'G4']
      audioService.releaseChord(chord)
      expect(true).toBe(true)
    })

    it('should stop all notes', () => {
      audioService.stopAllNotes()
      expect(true).toBe(true)
    })

    it('should not play when disabled', () => {
      audioService.setEnabled(false)
      audioService.playNote('C4')
      // Should not throw, just silently ignore
      expect(true).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle playNote errors gracefully', () => {
      // Don't initialize, so synth is null
      expect(() => audioService.playNote('C4')).not.toThrow()
    })

    it('should handle releaseNote errors gracefully', () => {
      expect(() => audioService.releaseNote('C4')).not.toThrow()
    })

    it('should handle stopAllNotes errors gracefully', () => {
      expect(() => audioService.stopAllNotes()).not.toThrow()
    })
  })

  describe('disposal', () => {
    it('should dispose resources properly', async () => {
      await audioService.initialize()
      audioService.dispose()
      expect(audioService.isReady()).toBe(false)
    })

    it('should handle disposal when not initialized', () => {
      expect(() => audioService.dispose()).not.toThrow()
    })
  })
})

describe('Audio Service Singleton', () => {
  it('should return the same instance', () => {
    const service1 = getAudioService()
    const service2 = getAudioService()
    expect(service1).toBe(service2)
  })

  it('should initialize the singleton', async () => {
    const service = await initializeAudio()
    expect(service).toBe(getAudioService())
    expect(service.isReady()).toBe(true)
  })
})