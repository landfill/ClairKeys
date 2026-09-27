import { act, renderHook } from '@testing-library/react'
import { useMidiInput } from '../useMidiInput'

type Input = { name: string; onmidimessage: ((event: { data: Uint8Array }) => void) | null }

function fakeAccess(names: string[]) {
  const inputs = new Map<string, Input>(names.map((name, i) => [String(i), { name, onmidimessage: null }]))
  const access = { inputs, onstatechange: null as null | (() => void) }
  return access
}

const setMidi = (value: unknown) =>
  Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, writable: true, value })

afterEach(() => setMidi(undefined))

describe('useMidiInput', () => {
  it('reports a browser without Web MIDI instead of failing', () => {
    setMidi(undefined)
    const { result } = renderHook(() => useMidiInput({ enabled: true, onNoteOn: jest.fn() }))
    expect(result.current.status).toBe('unsupported')
  })

  it('listens to every connected input once access is granted', async () => {
    const access = fakeAccess(['Digital Piano'])
    setMidi(jest.fn().mockResolvedValue(access))
    const onNoteOn = jest.fn()
    const { result } = renderHook(() => useMidiInput({ enabled: true, onNoteOn }))

    await act(async () => { await result.current.request() })
    expect(navigator.requestMIDIAccess).toHaveBeenCalledWith({ sysex: false })
    expect(result.current.status).toBe('ready')
    expect(result.current.devices).toEqual(['Digital Piano'])

    act(() => access.inputs.get('0')!.onmidimessage!({ data: new Uint8Array([0x90, 60, 90]) }))
    act(() => access.inputs.get('0')!.onmidimessage!({ data: new Uint8Array([0x80, 60, 0]) }))
    expect(onNoteOn.mock.calls).toEqual([[60]])
  })

  it('picks up a piano plugged in later', async () => {
    const access = fakeAccess([])
    setMidi(jest.fn().mockResolvedValue(access))
    const onNoteOn = jest.fn()
    const { result } = renderHook(() => useMidiInput({ enabled: true, onNoteOn }))
    await act(async () => { await result.current.request() })
    expect(result.current.devices).toEqual([])

    access.inputs.set('9', { name: 'Late Piano', onmidimessage: null })
    act(() => access.onstatechange!())
    expect(result.current.devices).toEqual(['Late Piano'])
    act(() => access.inputs.get('9')!.onmidimessage!({ data: new Uint8Array([0x90, 62, 10]) }))
    expect(onNoteOn).toHaveBeenCalledWith(62)
  })

  it('reports a refused permission and stops listening when disabled', async () => {
    setMidi(jest.fn().mockRejectedValue(new DOMException('no', 'SecurityError')))
    const refused = renderHook(() => useMidiInput({ enabled: true, onNoteOn: jest.fn() }))
    await act(async () => { await refused.result.current.request() })
    expect(refused.result.current.status).toBe('denied')

    const access = fakeAccess(['Digital Piano'])
    setMidi(jest.fn().mockResolvedValue(access))
    const onNoteOn = jest.fn()
    const hook = renderHook(({ enabled }) => useMidiInput({ enabled, onNoteOn }), { initialProps: { enabled: true } })
    await act(async () => { await hook.result.current.request() })
    hook.rerender({ enabled: false })
    expect(access.inputs.get('0')!.onmidimessage).toBeNull()
  })
})
