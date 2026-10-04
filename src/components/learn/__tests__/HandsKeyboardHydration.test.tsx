import { act } from '@testing-library/react'
import { renderToString } from 'react-dom/server.node'
import { hydrateRoot, type Root } from 'react-dom/client'
import HandsKeyboard from '../HandsKeyboard'

it('hydrates the same default right-hand position without errors or audio startup', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {})
  const recoverable = jest.fn()
  const audio = jest.mocked(AudioContext)
  audio.mockClear()
  const container = document.createElement('div')
  let root: Root | undefined
  try {
    container.innerHTML = renderToString(<HandsKeyboard />)
    const initial = container.textContent
    document.body.appendChild(container)
    await act(async () => { root = hydrateRoot(container, <HandsKeyboard />, { onRecoverableError: recoverable }) })
    expect(container.textContent).toBe(initial)
    expect(recoverable).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(audio).not.toHaveBeenCalled()
  } finally {
    await act(async () => { root?.unmount() })
    container.remove()
    error.mockRestore()
  }
})
