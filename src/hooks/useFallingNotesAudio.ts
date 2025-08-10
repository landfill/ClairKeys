'use client'

import { useRef, useCallback, useEffect } from 'react'
import type { FallingNote } from '@/types/fallingNotes'
import { midiToFreq } from '@/utils/pianoLayout'

/**
 * Audio nodes for a single note
 */
interface AudioNodes {
  osc: OscillatorNode
  gain: GainNode
  lp: BiquadFilterNode
}

/**
 * Hook for managing audio playback with falling notes visualization
 * Provides precise AudioContext-based timing for synchronization
 */
export function useFallingNotesAudio() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const scheduledNodesRef = useRef<AudioNodes[]>([])
  const baseAudioTimeRef = useRef<number | null>(null)
  const offsetSecRef = useRef(0)
  const tempoScaleRef = useRef(1)
  const isPlayingRef = useRef(false)

  /**
   * Initialize audio context
   */
  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current) {
      // Create audio context with compatibility
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      audioContextRef.current = new AudioContextClass()
      
      // Create master gain node
      masterGainRef.current = audioContextRef.current.createGain()
      masterGainRef.current.gain.value = 0.1 // Reasonable volume level
      masterGainRef.current.connect(audioContextRef.current.destination)
    }
  }, [])

  /**
   * Create audio nodes for a single note
   */
  const createNoteAudio = useCallback((
    midi: number,
    audioContext: AudioContext,
    masterGain: GainNode
  ): AudioNodes => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    const lowPassFilter = audioContext.createBiquadFilter()

    // Configure oscillator
    const frequency = midiToFreq(midi)
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency

    // Configure filter for more realistic piano sound
    lowPassFilter.type = 'lowpass'
    lowPassFilter.frequency.value = frequency * 4
    lowPassFilter.Q.value = 1

    // Configure gain for ADSR envelope
    gainNode.gain.value = 0

    // Connect nodes: oscillator -> filter -> gain -> master
    oscillator.connect(lowPassFilter)
    lowPassFilter.connect(gainNode)
    gainNode.connect(masterGain)

    return { osc: oscillator, gain: gainNode, lp: lowPassFilter }
  }, [])

  /**
   * Schedule audio for multiple notes with precise timing
   */
  const scheduleAudio = useCallback((
    notes: FallingNote[],
    offsetSec: number,
    tempoScale: number,
    mute: boolean
  ) => {
    if (!audioContextRef.current || !masterGainRef.current || mute) return []

    const audioContext = audioContextRef.current
    const masterGain = masterGainRef.current
    const scheduledNodes: AudioNodes[] = []
    const baseTime = audioContext.currentTime + 0.02 // Small delay for precision
    const currentAudioTime = audioContext.currentTime

    // Voice limiting for performance
    const VOICE_LIMIT = 24
    const activeEnds: number[] = []

    // Sort notes by start time
    const sortedNotes = [...notes].sort((a, b) => a.start - b.start)

    for (const note of sortedNotes) {
      // Skip notes that have already finished
      if (note.start + note.duration <= offsetSec) continue

      // Calculate precise timing with tempo scaling
      const relativeStart = Math.max(0, (note.start - offsetSec) / tempoScale)
      const relativeEnd = Math.max(0, (note.start + note.duration - offsetSec) / tempoScale)

      // Skip notes that are too far in the past or future
      if (relativeStart > 10 || relativeEnd < 0) continue

      // Clean up finished voices
      for (let i = activeEnds.length - 1; i >= 0; i--) {
        if (activeEnds[i] <= relativeStart) {
          activeEnds.splice(i, 1)
        }
      }

      // Skip if voice limit reached
      if (activeEnds.length >= VOICE_LIMIT) continue
      activeEnds.push(relativeEnd)

      // Calculate absolute timing
      const startTime = baseTime + relativeStart
      const endTime = baseTime + relativeEnd

      // Ensure valid timing
      if (startTime < currentAudioTime || endTime <= startTime) continue

      try {
        // Create audio nodes for this note
        const nodes = createNoteAudio(note.midi, audioContext, masterGain)

        // Configure ADSR envelope
        const attackTime = 0.02
        const decayTime = 0.1
        const sustainLevel = 0.6
        const releaseTime = 0.3

        const velocity = note.velocity || 0.7
        const peakGain = velocity * 0.3

        // Attack
        nodes.gain.gain.setValueAtTime(0, startTime)
        nodes.gain.gain.linearRampToValueAtTime(peakGain, startTime + attackTime)

        // Decay to sustain
        nodes.gain.gain.linearRampToValueAtTime(
          peakGain * sustainLevel, 
          startTime + attackTime + decayTime
        )

        // Release
        nodes.gain.gain.setValueAtTime(
          peakGain * sustainLevel, 
          endTime
        )
        nodes.gain.gain.linearRampToValueAtTime(0, endTime + releaseTime)

        // Start and stop oscillator
        nodes.osc.start(startTime)
        nodes.osc.stop(endTime + releaseTime)

        scheduledNodes.push(nodes)
      } catch (error) {
        console.warn('Failed to schedule note:', error)
      }
    }

    return scheduledNodes
  }, [createNoteAudio])

  /**
   * Start audio playback
   */
  const startAudio = useCallback((
    notes: FallingNote[],
    offsetSec: number,
    tempoScale: number,
    mute: boolean
  ) => {
    initializeAudio()
    
    if (!audioContextRef.current || !masterGainRef.current) return

    // Stop any currently playing audio
    stopAudioNodes(scheduledNodesRef.current)
    scheduledNodesRef.current = []

    // Store current state
    tempoScaleRef.current = tempoScale
    isPlayingRef.current = true
    
    // Resume audio context if suspended (required by some browsers)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }

    // Schedule new audio
    const scheduledNodes = scheduleAudio(notes, offsetSec, tempoScale, mute)
    scheduledNodesRef.current = scheduledNodes

    // Store timing reference
    baseAudioTimeRef.current = audioContextRef.current.currentTime + 0.02
    offsetSecRef.current = offsetSec
  }, [initializeAudio, scheduleAudio])

  /**
   * Stop all audio playback
   */
  const stopAudio = useCallback(() => {
    isPlayingRef.current = false
    stopAudioNodes(scheduledNodesRef.current)
    scheduledNodesRef.current = []
    baseAudioTimeRef.current = null
  }, [])

  /**
   * Get current playback time with precise synchronization
   */
  const getCurrentTime = useCallback((tempoScale: number): number => {
    const context = audioContextRef.current
    const baseTime = baseAudioTimeRef.current

    if (context && baseTime !== null && isPlayingRef.current) {
      // High-precision timing using AudioContext.currentTime
      const audioElapsed = Math.max(0, context.currentTime - baseTime)
      const scaledElapsed = audioElapsed * tempoScale
      return offsetSecRef.current + scaledElapsed
    }

    return offsetSecRef.current
  }, [])

  /**
   * Update tempo scale
   */
  const updateTempoScale = useCallback((tempoScale: number) => {
    tempoScaleRef.current = tempoScale
  }, [])

  /**
   * Set offset time (for seeking)
   */
  const setOffsetTime = useCallback((time: number) => {
    offsetSecRef.current = time
  }, [])

  /**
   * Reset audio state
   */
  const reset = useCallback(() => {
    stopAudio()
    offsetSecRef.current = 0
    tempoScaleRef.current = 1
  }, [stopAudio])

  /**
   * Get timing info for synchronization debugging
   */
  const getTimingInfo = useCallback(() => {
    return {
      isPlaying: isPlayingRef.current,
      offsetSec: offsetSecRef.current,
      tempoScale: tempoScaleRef.current,
      audioContextTime: audioContextRef.current?.currentTime || 0,
      baseAudioTime: baseAudioTimeRef.current
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stopAudio])

  return {
    startAudio,
    stopAudio,
    getCurrentTime,
    updateTempoScale,
    setOffsetTime,
    reset,
    getTimingInfo
  }
}

/**
 * Helper function to stop audio nodes
 */
function stopAudioNodes(nodes: AudioNodes[]) {
  for (const { osc, gain } of nodes) {
    try {
      // Fade out quickly to avoid clicks
      const now = osc.context.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + 0.02)
      
      // Stop oscillator after fade out
      osc.stop(now + 0.02)
    } catch (error) {
      // Ignore errors for already stopped nodes
    }
  }
}