'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { parseNoteOn } from '@/utils/midiInput'

export type MidiStatus = 'unsupported' | 'idle' | 'requesting' | 'denied' | 'ready'

interface MidiInputLike {
  name?: string | null
  onmidimessage: ((event: { data: Uint8Array | null }) => void) | null
}
interface MidiAccessLike {
  inputs: Map<string, MidiInputLike>
  onstatechange: (() => void) | null
}

function supportsMidi(): boolean {
  return typeof navigator !== 'undefined' && typeof (navigator as { requestMIDIAccess?: unknown }).requestMIDIAccess === 'function'
}

/**
 * Note-ons from every connected MIDI input (D-086). Access is requested only
 * from `request()`, which the caller runs from the reader's own click: Chrome
 * asks for permission, and asking on page load would prompt everyone. Safari
 * and iOS have no Web MIDI; they report `unsupported` and the on-screen keys
 * remain the input.
 */
export function useMidiInput({ enabled, onNoteOn }: { enabled: boolean; onNoteOn: (midi: number) => void }) {
  const [status, setStatus] = useState<MidiStatus>(() => (supportsMidi() ? 'idle' : 'unsupported'))
  const [devices, setDevices] = useState<string[]>([])
  const [access, setAccess] = useState<MidiAccessLike | null>(null)
  const handler = useRef(onNoteOn)
  handler.current = onNoteOn

  const request = useCallback(async () => {
    if (!supportsMidi()) { setStatus('unsupported'); return }
    setStatus('requesting')
    try {
      const granted = await (navigator as unknown as {
        requestMIDIAccess: (options: { sysex: boolean }) => Promise<MidiAccessLike>
      }).requestMIDIAccess({ sysex: false })
      setAccess(granted)
      setStatus('ready')
    } catch {
      setStatus('denied')
    }
  }, [])

  useEffect(() => {
    if (!access || !enabled) return
    const listen = (event: { data: Uint8Array | null }) => {
      const midi = parseNoteOn(event.data)
      if (midi !== null) handler.current(midi)
    }
    const attach = () => {
      const inputs = [...access.inputs.values()]
      inputs.forEach(input => { input.onmidimessage = listen })
      setDevices(inputs.map(input => input.name || '이름 없는 MIDI 장치'))
    }
    attach()
    access.onstatechange = attach
    return () => {
      access.onstatechange = null
      access.inputs.forEach(input => { input.onmidimessage = null })
    }
  }, [access, enabled])

  return { status, devices, request }
}
