import { act, renderHook } from '@testing-library/react'
import { MIN_REPORT_SEC, usePracticeReport } from '../usePracticeReport'

let now = 0
beforeEach(() => {
  now = 0
  jest.spyOn(performance, 'now').mockImplementation(() => now)
})
afterEach(() => jest.restoreAllMocks())

type Props = { isPlaying: boolean; isSessionActive: boolean; currentTime: number }
const setup = () => {
  const onReport = jest.fn()
  const hook = renderHook((props: Props) => usePracticeReport({ ...props, totalLength: 100, onReport }), {
    initialProps: { isPlaying: false, isSessionActive: false, currentTime: 0 },
  })
  return { onReport, hook }
}

describe('usePracticeReport', () => {
  it('reports the time spent sounding and the furthest point reached when the run ends', () => {
    const { onReport, hook } = setup()
    hook.rerender({ isPlaying: true, isSessionActive: true, currentTime: 0 })
    now = 30_000
    hook.rerender({ isPlaying: true, isSessionActive: true, currentTime: 40 })
    // A pause does not count toward the time.
    hook.rerender({ isPlaying: false, isSessionActive: true, currentTime: 40 })
    now = 90_000
    hook.rerender({ isPlaying: true, isSessionActive: true, currentTime: 40 })
    now = 100_000
    hook.rerender({ isPlaying: true, isSessionActive: true, currentTime: 50 })
    hook.rerender({ isPlaying: false, isSessionActive: false, currentTime: 0 })

    expect(onReport).toHaveBeenCalledTimes(1)
    expect(onReport).toHaveBeenCalledWith({ durationSeconds: 40, completedPercentage: 50 }, { leavingPage: false })
  })

  it('does not report a run too short to be practice', () => {
    const { onReport, hook } = setup()
    hook.rerender({ isPlaying: true, isSessionActive: true, currentTime: 0 })
    now = (MIN_REPORT_SEC - 1) * 1000
    hook.rerender({ isPlaying: false, isSessionActive: false, currentTime: 0 })
    expect(onReport).not.toHaveBeenCalled()
  })

  it('reports what was played when the page is hidden and does not count it twice', () => {
    const { onReport, hook } = setup()
    hook.rerender({ isPlaying: true, isSessionActive: true, currentTime: 0 })
    now = 20_000
    hook.rerender({ isPlaying: true, isSessionActive: true, currentTime: 20 })

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    expect(onReport).toHaveBeenLastCalledWith({ durationSeconds: 20, completedPercentage: 20 }, { leavingPage: true })

    now = 35_000
    hook.rerender({ isPlaying: false, isSessionActive: false, currentTime: 0 })
    expect(onReport).toHaveBeenLastCalledWith({ durationSeconds: 15, completedPercentage: 20 }, { leavingPage: false })
  })

  it('reports a run that ends by leaving the page in-app, where the page stays visible', () => {
    const { onReport, hook } = setup()
    hook.rerender({ isPlaying: true, isSessionActive: true, currentTime: 0 })
    now = 25_000
    hook.rerender({ isPlaying: true, isSessionActive: true, currentTime: 30 })
    hook.unmount()
    expect(onReport).toHaveBeenCalledWith({ durationSeconds: 25, completedPercentage: 30 }, { leavingPage: true })
  })
})
