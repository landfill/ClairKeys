/**
 * Audio service for piano sound generation using Tone.js
 * Handles piano audio synthesis, volume control, and audio settings
 */

import { noteToFrequency } from '@/utils/piano'

// Tone.js를 동적으로 import하여 서버 사이드 렌더링 문제 방지
let Tone: any = null

export interface AudioSettings {
  volume: number // 0-1
  attack: number // seconds
  decay: number // seconds
  sustain: number // 0-1
  release: number // seconds
  reverb: number // 0-1
  enabled: boolean
}

export class AudioService {
  private synth: any = null
  private reverb: any = null
  private volume: any = null
  private isInitialized = false
  private settings: AudioSettings = {
    volume: 0.7,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.4,
    release: 1.2,
    reverb: 0.2,
    enabled: true
  }

  /**
   * Initialize the audio system
   * Must be called after user interaction due to browser autoplay policies
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 클라이언트 사이드에서만 Tone.js 로드
      if (typeof window !== 'undefined' && !Tone) {
        Tone = await import('tone')
      }

      if (!Tone) {
        console.warn('Tone.js could not be loaded - running in server environment')
        return
      }

      // Start Tone.js audio context
      if (Tone.context.state !== 'running') {
        await Tone.start()
      }

      // Create reverb effect
      this.reverb = new Tone.Reverb({
        decay: 2,
        wet: this.settings.reverb
      })

      // Create volume control
      this.volume = new Tone.Volume(this.volumeToDb(this.settings.volume))

      // Create polyphonic synthesizer with piano-like sound
      this.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: 'triangle'
        },
        envelope: {
          attack: this.settings.attack,
          decay: this.settings.decay,
          sustain: this.settings.sustain,
          release: this.settings.release
        }
      })

      // Connect audio chain: synth -> reverb -> volume -> destination
      this.synth.connect(this.reverb)
      this.reverb.connect(this.volume)
      this.volume.toDestination()

      this.isInitialized = true
      console.log('Audio service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize audio service:', error)
      throw error
    }
  }

  /**
   * Play a piano note
   */
  playNote(note: string, velocity: number = 0.8, duration?: number): void {
    if (!this.isInitialized || !this.synth || !this.settings.enabled) {
      return
    }

    try {
      const frequency = noteToFrequency(note)
      if (frequency) {
        if (duration) {
          this.synth.triggerAttackRelease(frequency, duration, undefined, velocity)
        } else {
          this.synth.triggerAttack(frequency, undefined, velocity)
        }
      }
    } catch (error) {
      console.error('Error playing note:', error)
    }
  }

  /**
   * Release a piano note
   */
  releaseNote(note: string): void {
    if (!this.isInitialized || !this.synth) {
      return
    }

    try {
      const frequency = noteToFrequency(note)
      if (frequency) {
        this.synth.triggerRelease(frequency)
      }
    } catch (error) {
      console.error('Error releasing note:', error)
    }
  }

  /**
   * Stop all currently playing notes
   */
  stopAllNotes(): void {
    if (!this.isInitialized || !this.synth) {
      return
    }

    try {
      this.synth.releaseAll()
    } catch (error) {
      console.error('Error stopping all notes:', error)
    }
  }

  /**
   * Update audio settings
   */
  updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings }

    if (!this.isInitialized) return

    try {
      // Update volume
      if (newSettings.volume !== undefined && this.volume) {
        this.volume.volume.value = this.volumeToDb(newSettings.volume)
      }

      // Update reverb
      if (newSettings.reverb !== undefined && this.reverb) {
        this.reverb.wet.value = newSettings.reverb
      }

      // Update envelope settings
      if (this.synth && this.synth.voices) {
        this.synth.voices.forEach((voice: any) => {
          if (newSettings.attack !== undefined) {
            voice.envelope.attack = newSettings.attack
          }
          if (newSettings.decay !== undefined) {
            voice.envelope.decay = newSettings.decay
          }
          if (newSettings.sustain !== undefined) {
            voice.envelope.sustain = newSettings.sustain
          }
          if (newSettings.release !== undefined) {
            voice.envelope.release = newSettings.release
          }
        })
      }
    } catch (error) {
      console.error('Error updating audio settings:', error)
    }
  }

  /**
   * Get current audio settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings }
  }

  /**
   * Check if audio service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.synth !== null
  }

  /**
   * Get audio context state
   */
  getContextState(): string {
    if (!Tone || !Tone.context) {
      return 'unavailable'
    }
    return Tone.context.state
  }

  /**
   * Dispose of audio resources
   */
  dispose(): void {
    try {
      if (this.synth) {
        this.synth.dispose()
        this.synth = null
      }
      if (this.reverb) {
        this.reverb.dispose()
        this.reverb = null
      }
      if (this.volume) {
        this.volume.dispose()
        this.volume = null
      }
      this.isInitialized = false
    } catch (error) {
      console.error('Error disposing audio service:', error)
    }
  }

  /**
   * Convert linear volume (0-1) to decibels
   */
  private volumeToDb(volume: number): number {
    if (volume <= 0) return -Infinity
    return 20 * Math.log10(volume)
  }
}

// Singleton instance
let audioServiceInstance: AudioService | null = null

export function getAudioService(): AudioService {
  if (!audioServiceInstance) {
    audioServiceInstance = new AudioService()
  }
  return audioServiceInstance
}

// Convenience function for initializing audio
export async function initializeAudio(): Promise<void> {
  const service = getAudioService()
  await service.initialize()
}