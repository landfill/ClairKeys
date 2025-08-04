/**
 * Animation Engine Tests
 * Tests for time-based animation playback, key highlighting, and audio synchronization
 */

import { AnimationEngine, getAnimationEngine } from '../animationEngine'
import { PianoAnimationData, AnimationEvent } from '@/types/animation'
import { getAudioService } from '../audioService'

// Mock audio service
jest.mock('../audioService', () => ({
  getAudioService: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    playNote: jest.fn(),
    releaseNote: jest.fn(),
    stopAllNotes: jest.fn(),
    isReady: jest.fn().mockReturnValue(true),
    dispose: jest.fn()
  }))
}))

// Mock timers
jest.useFakeTimers()

describe('AnimationEngine', () => {
  let engine: AnimationEngine
  let mockAudioService: any
  let testAnimationData: PianoAnimationData

  beforeEach(() => {
    engine = getAnimationEngine()
    mockAudioService = getAudioService()
    
    testAnimationData = {
      version: '1.0',
      title: 'Test Song',
      composer: 'Test Composer',
      duration: 10,
      tempo: 120,
      timeSignature: '4/4',
      notes: [
        {
          note: 'C4',
          startTime: 0,
          duration: 1,
          velocity: 0.8
        },
        {
          note: 'D4',
          startTime: 1,
          duration: 1,
          velocity: 0.7
        },
        {
          note: 'E4',
          startTime: 2,
          duration: 2,
          velocity: 0.9
        }
      ],
      metadata: {
        originalFileName: 'test.pdf',
        fileSize: 1024,
        processedAt: new Date().toISOString()
      }
    }
  })

  afterEach(() => {
    if (engine) {
      engine.dispose()
    }
    jest.clearAllMocks()
    jest.clearAllTimers()
  })

  describe('loadAnimation', () => {
    it('should load animation data and set ready state', () => {
      engine.loadAnimation(testAnimationData)
      
      const state = engine.getState()
      expect(state.isReady).toBe(true)
      expect(state.currentTime).toBe(0)
      expect(state.isPlaying).toBe(false)
    })

    it('should stop current animation when loading new data', () => {
      engine.loadAnimation(testAnimationData)
      engine.play()
      
      const newData = { ...testAnimationData, title: 'New Song' }
      engine.loadAnimation(newData)
      
      const state = engine.getState()
      expect(state.isPlaying).toBe(false)
      expect(state.currentTime).toBe(0)
    })
  })

  describe('play/pause/stop', () => {
    beforeEach(() => {
      engine.loadAnimation(testAnimationData)
    })

    it('should start playback', () => {
      engine.play()
      
      const state = engine.getState()
      expect(state.isPlaying).toBe(true)
    })

    it('should not start if animation data not loaded', () => {
      const emptyEngine = getAnimationEngine()
      // Reset the engine to empty state
      emptyEngine.dispose()
      emptyEngine.play()
      
      const state = emptyEngine.getState()
      expect(state.isPlaying).toBe(false)
    })

    it('should pause playback', () => {
      engine.play()
      engine.pause()
      
      const state = engine.getState()
      expect(state.isPlaying).toBe(false)
    })

    it('should stop all active notes when pausing', () => {
      engine.play()
      
      // Simulate some active notes
      const state = engine.getState()
      state.activeNotes.add('C4')
      
      engine.pause()
      
      expect(mockAudioService.releaseNote).toHaveBeenCalledWith('C4')
    })

    it('should stop playback and reset time', () => {
      engine.play()
      
      // Simulate some progress
      jest.advanceTimersByTime(1000)
      
      engine.stop()
      
      const state = engine.getState()
      expect(state.isPlaying).toBe(false)
      expect(state.currentTime).toBe(0)
    })
  })

  describe('seekTo', () => {
    beforeEach(() => {
      engine.loadAnimation(testAnimationData)
    })

    it('should seek to specific time', () => {
      engine.seekTo(5)
      
      const state = engine.getState()
      expect(state.currentTime).toBe(5)
    })

    it('should clamp time to valid range', () => {
      engine.seekTo(-1)
      expect(engine.getState().currentTime).toBe(0)
      
      engine.seekTo(15)
      expect(engine.getState().currentTime).toBe(10) // duration is 10
    })

    it('should resume playback if was playing', () => {
      engine.play()
      engine.seekTo(3)
      
      const state = engine.getState()
      expect(state.isPlaying).toBe(true)
      expect(state.currentTime).toBe(3)
    })
  })

  describe('setSpeed', () => {
    beforeEach(() => {
      engine.loadAnimation(testAnimationData)
    })

    it('should set playback speed', () => {
      engine.setSpeed(1.5)
      
      const state = engine.getState()
      expect(state.speed).toBe(1.5)
    })

    it('should clamp speed to valid range', () => {
      engine.setSpeed(0.1)
      expect(engine.getState().speed).toBe(0.25)
      
      engine.setSpeed(5)
      expect(engine.getState().speed).toBe(4.0)
    })

    it('should emit speed change event', () => {
      const callback = jest.fn()
      engine.on('speedChange', callback)
      
      engine.setSpeed(2.0)
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'speedChange',
          data: { speed: 2.0 }
        })
      )
    })
  })

  describe('setMode', () => {
    beforeEach(() => {
      engine.loadAnimation(testAnimationData)
    })

    it('should set playback mode', () => {
      engine.setMode('follow')
      
      const state = engine.getState()
      expect(state.mode).toBe('follow')
    })

    it('should pause when switching to follow mode', () => {
      engine.play()
      engine.setMode('follow')
      
      const state = engine.getState()
      expect(state.isPlaying).toBe(false)
    })
  })

  describe('getTimelineAt', () => {
    beforeEach(() => {
      engine.loadAnimation(testAnimationData)
    })

    it('should return timeline for specific time', () => {
      const timeline = engine.getTimelineAt(1.5)
      
      expect(timeline.currentTime).toBe(1.5)
      expect(timeline.duration).toBe(10)
      expect(timeline.activeNotes.has('D4')).toBe(true)
    })

    it('should identify notes to start and stop', () => {
      const timeline = engine.getTimelineAt(0.95)
      
      expect(timeline.notesToStart.some(n => n.note === 'D4')).toBe(true)
      expect(timeline.notesToStop.some(n => n.note === 'C4')).toBe(true)
    })

    it('should handle empty animation data', () => {
      const emptyEngine = getAnimationEngine()
      // Reset the engine to empty state
      emptyEngine.dispose()
      const timeline = emptyEngine.getTimelineAt(5)
      
      expect(timeline.activeNotes.size).toBe(0)
      expect(timeline.duration).toBe(0)
    })
  })

  describe('event system', () => {
    beforeEach(() => {
      engine.loadAnimation(testAnimationData)
    })

    it('should emit play state change events', () => {
      const callback = jest.fn()
      engine.on('playStateChange', callback)
      
      engine.play()
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'playStateChange',
          data: { isPlaying: true }
        })
      )
    })

    it('should emit time update events', () => {
      const callback = jest.fn()
      engine.on('timeUpdate', callback)
      
      engine.seekTo(3)
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timeUpdate',
          data: { time: 3 }
        })
      )
    })

    it('should remove event listeners', () => {
      const callback = jest.fn()
      engine.on('timeUpdate', callback)
      engine.off('timeUpdate', callback)
      
      engine.seekTo(3)
      
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('animation loop', () => {
    beforeEach(() => {
      engine.loadAnimation(testAnimationData)
    })

    it('should update time during playback', () => {
      engine.play()
      
      jest.advanceTimersByTime(1000) // 1 second
      
      const state = engine.getState()
      expect(state.currentTime).toBeGreaterThan(0)
    })

    it('should stop at end of animation', () => {
      engine.play()
      
      jest.advanceTimersByTime(11000) // Beyond duration
      
      const state = engine.getState()
      expect(state.isPlaying).toBe(false)
      expect(state.currentTime).toBe(10) // duration
    })

    it('should play and release notes at correct times', () => {
      engine.play()
      
      // At start, C4 should play
      jest.advanceTimersByTime(100)
      expect(mockAudioService.playNote).toHaveBeenCalledWith('C4', 0.8)
      
      // At 1 second, C4 should stop and D4 should start
      jest.advanceTimersByTime(900)
      expect(mockAudioService.releaseNote).toHaveBeenCalledWith('C4')
      expect(mockAudioService.playNote).toHaveBeenCalledWith('D4', 0.7)
    })
  })

  describe('follow mode', () => {
    beforeEach(() => {
      engine.loadAnimation(testAnimationData)
      engine.setMode('follow')
    })

    it('should process correct user input', () => {
      const result = engine.processUserInput('C4')
      expect(result).toBe(true)
      expect(mockAudioService.playNote).toHaveBeenCalledWith('C4', 0.8)
    })

    it('should reject incorrect user input', () => {
      const result = engine.processUserInput('F4')
      expect(result).toBe(false)
    })

    it('should advance time on correct input', () => {
      const initialTime = engine.getState().currentTime
      engine.processUserInput('C4')
      
      const newTime = engine.getState().currentTime
      expect(newTime).toBeGreaterThan(initialTime)
    })
  })

  describe('audio synchronization', () => {
    beforeEach(() => {
      engine.loadAnimation(testAnimationData)
    })

    it('should initialize audio service on play', () => {
      mockAudioService.isReady.mockReturnValue(false)
      
      engine.play()
      
      expect(mockAudioService.initialize).toHaveBeenCalled()
    })

    it('should respect audio service readiness', () => {
      mockAudioService.isReady.mockReturnValue(false)
      
      engine.play()
      jest.advanceTimersByTime(100)
      
      // Should still try to play notes even if audio not ready
      // (audio service handles the readiness check internally)
      expect(mockAudioService.playNote).toHaveBeenCalled()
    })
  })

  describe('singleton instance', () => {
    it('should return same instance', () => {
      const instance1 = getAnimationEngine()
      const instance2 = getAnimationEngine()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('dispose', () => {
    it('should clean up resources', () => {
      engine.loadAnimation(testAnimationData)
      engine.play()
      
      engine.dispose()
      
      const state = engine.getState()
      expect(state.isPlaying).toBe(false)
      expect(state.isReady).toBe(false)
    })
  })
})