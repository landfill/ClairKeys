import * as Tone from 'tone'

export class PianoAudio {
  private synth: Tone.Synth
  private isInitialized = false

  constructor() {
    this.synth = new Tone.Synth().toDestination()
  }

  async initialize() {
    if (!this.isInitialized) {
      await Tone.start()
      this.isInitialized = true
    }
  }

  playNote(note: string, duration: string = '8n') {
    if (!this.isInitialized) {
      console.warn('Piano audio not initialized')
      return
    }
    
    this.synth.triggerAttackRelease(note, duration)
  }

  setVolume(volume: number) {
    this.synth.volume.value = volume
  }

  dispose() {
    this.synth.dispose()
  }
}