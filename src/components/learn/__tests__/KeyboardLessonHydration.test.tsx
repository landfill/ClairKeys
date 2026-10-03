import { act } from '@testing-library/react'
import { renderToString } from 'react-dom/server.node'
import { hydrateRoot, type Root } from 'react-dom/client'
import KeyboardLesson from '../KeyboardLesson'

it.each([true, false])('hydrates without errors and detects MIDI after mount (supported: %s)', async supported => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'requestMIDIAccess')
  const error = jest.spyOn(console, 'error').mockImplementation(() => {})
  const requestMIDIAccess = jest.fn()
  const container = document.createElement('div')
  let root: Root | undefined
  try {
    // 서버에는 Web MIDI API가 없다. 브라우저에서는 hydrate 전에 지원 여부가 달라진다.
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: undefined })
    const html = renderToString(<KeyboardLesson />)
    container.innerHTML = html
    document.body.appendChild(container)
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: supported ? requestMIDIAccess : undefined })
    await act(async () => {
      root = hydrateRoot(container, <KeyboardLesson />)
    })
    expect(error).not.toHaveBeenCalled()
    const midiButton = [...container.querySelectorAll('button')].find(button => button.textContent === 'MIDI 연결')!
    expect(midiButton.disabled).toBe(!supported)
    expect(container).toHaveTextContent(supported ? 'MIDI 피아노도 연결할 수 있어요.' : '이 브라우저는 MIDI를 지원하지 않아요.')
    expect(requestMIDIAccess).not.toHaveBeenCalled()
  } finally {
    await act(async () => { root?.unmount() })
    container.remove()
    if (original) Object.defineProperty(navigator, 'requestMIDIAccess', original)
    else Reflect.deleteProperty(navigator, 'requestMIDIAccess')
    error.mockRestore()
  }
})
