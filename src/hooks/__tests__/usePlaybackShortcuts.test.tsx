import { fireEvent, render } from '@testing-library/react'
import { resolvePlaybackShortcut, SEEK_STEP_SEC, usePlaybackShortcuts } from '../usePlaybackShortcuts'

function Harness(props: Parameters<typeof usePlaybackShortcuts>[0]) {
  usePlaybackShortcuts(props)
  return (
    <div>
      <button type="button">버튼</button>
      <input aria-label="검색" />
      <input aria-label="음량" type="range" />
      <select aria-label="속도"><option>1x</option></select>
      <div role="slider" tabIndex={0} aria-label="재생 위치" aria-valuenow={0} />
      <a href="#x">링크</a>
    </div>
  )
}

const setup = (enabled = true) => {
  const onToggle = jest.fn()
  const onSeekBy = jest.fn()
  const view = render(<Harness enabled={enabled} onToggle={onToggle} onSeekBy={onSeekBy} />)
  return { onToggle, onSeekBy, ...view }
}

describe('resolvePlaybackShortcut', () => {
  const body = () => document.body

  it('maps space and the arrows on the page itself', () => {
    expect(resolvePlaybackShortcut({ key: ' ', target: body() })).toEqual({ type: 'toggle' })
    expect(resolvePlaybackShortcut({ key: 'ArrowLeft', target: body() })).toEqual({ type: 'seek', by: -SEEK_STEP_SEC })
    expect(resolvePlaybackShortcut({ key: 'ArrowRight', target: body() })).toEqual({ type: 'seek', by: SEEK_STEP_SEC })
    expect(resolvePlaybackShortcut({ key: 'a', target: body() })).toBeNull()
  })

  it('leaves modified keys and repeated space to the browser', () => {
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey'] as const) {
      expect(resolvePlaybackShortcut({ key: ' ', target: body(), [modifier]: true })).toBeNull()
    }
    expect(resolvePlaybackShortcut({ key: ' ', target: body(), repeat: true })).toBeNull()
  })
})

describe('usePlaybackShortcuts', () => {
  it('toggles and seeks from the page body', () => {
    const { onToggle, onSeekBy } = setup()
    fireEvent.keyDown(document.body, { key: ' ' })
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onSeekBy.mock.calls).toEqual([[SEEK_STEP_SEC], [-SEEK_STEP_SEC]])
  })

  it('keeps space off controls that already answer it and prevents page scrolling otherwise', () => {
    const { onToggle, getByRole } = setup()
    for (const target of [getByRole('button'), getByRole('link'), getByRole('textbox'), getByRole('combobox')]) {
      fireEvent.keyDown(target, { key: ' ' })
    }
    expect(onToggle).not.toHaveBeenCalled()

    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    document.body.dispatchEvent(event)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('never steals the arrows from a slider, text field or select', () => {
    const { onSeekBy, getAllByRole, getByRole } = setup()
    for (const target of [...getAllByRole('slider'), getByRole('textbox'), getByRole('combobox')]) {
      fireEvent.keyDown(target, { key: 'ArrowRight' })
    }
    expect(onSeekBy).not.toHaveBeenCalled()
  })

  it('does nothing while disabled or after another handler claimed the key', () => {
    const disabled = setup(false)
    fireEvent.keyDown(document.body, { key: ' ' })
    expect(disabled.onToggle).not.toHaveBeenCalled()
    disabled.unmount()

    const { onToggle } = setup()
    const claimed = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    claimed.preventDefault()
    document.body.dispatchEvent(claimed)
    expect(onToggle).not.toHaveBeenCalled()
  })
})
