/**
 * useAnimationEngine Hook Tests
 */

import { renderHook, act } from '@testing-library/react'
import { useAnimationEngine } from '../useAnimationEngine'
import { getAnimationEngine } from '@/services/animationEngine'
import { PianoAnimationData } from '@/types/animation'

// Mock animation engine
jest.mock('@/services/animationEngine', () => ({
  getAnimationEngine: jest.fn(() => ({
    loadAnimation: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    seekTo: jest.fn(),
    setSpeed: jest.fn(),
    setMode: jest.fn(),
    processUserInput: jest.fn().mockReturnValue(true),
    getState: jest.fn(() => ({
      isPlaying: false,
      currentTime: 0,
      speed: 1.0,
      mode: 'listen',
      activeNotes: new Set(),
      isReady: false
    })),
    on: jest.fn(),
    off: jest.fn()
  }))
}))

describe('useAnimationEngine', () => {
  let mockEngine: any
  let testAnimationData: PianoAnimationData

  beforeEach(() => {
    mockEngine = getAnimationEngine()
    
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
    jest.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAnimationEngine())
    
    expect(result.current.state.isPlaying).toBe(false)
    expect(result.current.state.currentTime).toBe(0)
    expect(result.current.state.speed).toBe(1.0)
    expect(result.current.state.mode).toBe('listen')
    expect(result.current.state.isReady).toBe(false)
  })

  it('should set up event listeners on mount', () => {
    renderHook(() => useAnimationEngine())
    
    expect(mockEngine.on).toHaveBeenCalledWith('timeUpdate', expect.any(Function))
    expect(mockEngine.on).toHaveBeenCalledWith('playStateChange', expect.any(Function))
    expect(mockEngine.on).toHaveBeenCalledWith('speedChange', expect.any(Function))
    expect(mockEngine.on).toHaveBeenCalledWith('noteStart', expect.any(Function))
    expect(mockEngine.on).toHaveBeenCalledWith('noteEnd', expect.any(Function))
  })

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useAnimationEngine())
    
    unmount()
    
    expect(mockEngine.off).toHaveBeenCalledWith('timeUpdate', expect.any(Function))
    expect(mockEngine.off).toHaveBeenCalledWith('playStateChange', expect.any(Function))
    expect(mockEngine.off).toHaveBeenCalledWith('speedChange', expect.any(Function))
    expect(mockEngine.off).toHaveBeenCalledWith('noteStart', expect.any(Function))
    expect(mockEngine.off).toHaveBeenCalledWith('noteEnd', expect.any(Function))
  })

  it('should load animation data', () => {
    const { result } = renderHook(() => useAnimationEngine())
    
    act(() => {
      result.current.loadAnimation(testAnimationData)
    })
    
    expect(mockEngine.loadAnimation).toHaveBeenCalledWith(testAnimationData)
  })

  it('should control playback', () => {
    const { result } = renderHook(() => useAnimationEngine())
    
    act(() => {
      result.current.play()
    })
    expect(mockEngine.play).toHaveBeenCalled()
    
    act(() => {
      result.current.pause()
    })
    expect(mockEngine.pause).toHaveBeenCalled()
    
    act(() => {
      result.current.stop()
    })
    expect(mockEngine.stop).toHaveBeenCalled()
  })

  it('should seek to specific time', () => {
    const { result } = renderHook(() => useAnimationEngine())
    
    act(() => {
      result.current.seekTo(5.5)
    })
    
    expect(mockEngine.seekTo).toHaveBeenCalledWith(5.5)
  })

  it('should set playback speed', () => {
    const { result } = renderHook(() => useAnimationEngine())
    
    act(() => {
      result.current.setSpeed(1.5)
    })
    
    expect(mockEngine.setSpeed).toHaveBeenCalledWith(1.5)
  })

  it('should set playback mode', () => {
    const { result } = renderHook(() => useAnimationEngine())
    
    act(() => {
      result.current.setMode('follow')
    })
    
    expect(mockEngine.setMode).toHaveBeenCalledWith('follow')
  })

  it('should process user input', () => {
    const { result } = renderHook(() => useAnimationEngine())
    
    let inputResult: boolean
    act(() => {
      inputResult = result.current.processUserInput('C4')
    })
    
    expect(mockEngine.processUserInput).toHaveBeenCalledWith('C4')
    expect(inputResult!).toBe(true)
  })

  it('should manage external event listeners', () => {
    const { result } = renderHook(() => useAnimationEngine())
    const callback = jest.fn()
    
    act(() => {
      result.current.addEventListener('noteStart', callback)
    })
    
    // Simulate engine event
    const engineCallback = mockEngine.on.mock.calls.find(call => call[0] === 'noteStart')[1]
    const testEvent = {
      type: 'noteStart' as const,
      timestamp: Date.now(),
      data: { note: 'C4' }
    }
    
    act(() => {
      engineCallback(testEvent)
    })
    
    expect(callback).toHaveBeenCalledWith(testEvent)
    
    // Remove listener
    act(() => {
      result.current.removeEventListener('noteStart', callback)
    })
    
    // Should not be called again
    callback.mockClear()
    act(() => {
      engineCallback(testEvent)
    })
    
    expect(callback).not.toHaveBeenCalled()
  })

  it('should update state when engine state changes', () => {
    mockEngine.getState.mockReturnValue({
      isPlaying: true,
      currentTime: 5.5,
      speed: 1.5,
      mode: 'follow',
      activeNotes: new Set(['C4', 'E4']),
      isReady: true
    })
    
    const { result } = renderHook(() => useAnimationEngine())
    
    // Simulate state update event
    const timeUpdateCallback = mockEngine.on.mock.calls.find(call => call[0] === 'timeUpdate')[1]
    
    act(() => {
      timeUpdateCallback({
        type: 'timeUpdate',
        timestamp: Date.now(),
        data: { time: 5.5 }
      })
    })
    
    expect(result.current.state.isPlaying).toBe(true)
    expect(result.current.state.currentTime).toBe(5.5)
    expect(result.current.state.speed).toBe(1.5)
    expect(result.current.state.mode).toBe('follow')
    expect(result.current.state.isReady).toBe(true)
  })

  it('should enable debug logging when option is set', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    const { result } = renderHook(() => useAnimationEngine({ debug: true }))
    
    act(() => {
      result.current.loadAnimation(testAnimationData)
    })
    
    expect(consoleSpy).toHaveBeenCalledWith('Animation loaded:', 'Test Song')
    
    consoleSpy.mockRestore()
  })
})