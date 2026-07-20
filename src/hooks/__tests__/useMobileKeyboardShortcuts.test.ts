import { act, renderHook } from '@testing-library/react'
import { useMobileKeyboardShortcuts } from '../useMobileKeyboardShortcuts'

describe('useMobileKeyboardShortcuts', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('prevents the browser default for handled shortcuts by default', () => {
    const playPause = jest.fn()
    const button = document.createElement('button')
    document.body.appendChild(button)
    renderHook(() => useMobileKeyboardShortcuts({ playPause }))

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true
    })

    act(() => {
      button.dispatchEvent(event)
    })

    expect(playPause).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('honors explicit input and prevent-default overrides', () => {
    const playPause = jest.fn()
    const input = document.createElement('input')
    document.body.appendChild(input)
    renderHook(() => useMobileKeyboardShortcuts(
      { playPause },
      { allowInInputs: true, preventDefault: false }
    ))

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true
    })

    act(() => {
      input.dispatchEvent(event)
    })

    expect(playPause).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(false)
  })
})
