import { act, renderHook } from '@testing-library/react'
import { useOmrMonitor } from '../useOmrMonitor'

const report = () => ({ checkedAt: new Date().toISOString(), webSha: null,
  health: { status: 'ok', latencyMs: 1 }, monitor: { status: 'unsupported', snapshot: null } })

beforeEach(() => {
  jest.useFakeTimers()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => report() })
})
afterEach(() => { jest.useRealTimers() })

it('does not overlap requests and aborts on unmount', async () => {
  jest.mocked(fetch).mockImplementation(() => new Promise(() => {}))
  const view = renderHook(() => useOmrMonitor())
  act(() => { view.result.current.refresh(); jest.advanceTimersByTime(60000) })
  expect(fetch).toHaveBeenCalledTimes(1)
  const signal = jest.mocked(fetch).mock.calls[0][1]?.signal
  view.unmount()
  expect(signal?.aborted).toBe(true)
})

it('pauses hidden tabs and clears timers after unmount', async () => {
  const view = renderHook(() => useOmrMonitor())
  await act(async () => {})
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  act(() => { document.dispatchEvent(new Event('visibilitychange')); jest.advanceTimersByTime(60000) })
  expect(fetch).toHaveBeenCalledTimes(1)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(fetch).toHaveBeenCalledTimes(2)
  view.unmount()
  act(() => { jest.advanceTimersByTime(60000) })
  expect(fetch).toHaveBeenCalledTimes(2)
})

it('marks previous results stale on failure and erases them on access loss', async () => {
  const view = renderHook(() => useOmrMonitor())
  await act(async () => {})
  expect(view.result.current.report?.health.status).toBe('ok')
  jest.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
  await act(async () => { view.result.current.refresh() })
  expect(view.result.current.error).toBe('connection')
  expect(view.result.current.report).not.toBeNull()
  jest.mocked(fetch).mockResolvedValueOnce({ status: 403 } as Response)
  await act(async () => { view.result.current.refresh() })
  expect(view.result.current.error).toBe('access')
  expect(view.result.current.report).toBeNull()
})
