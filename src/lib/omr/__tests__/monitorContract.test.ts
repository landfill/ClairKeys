import { parseMonitorSnapshot } from '../monitorContract'

import { snapshotFixture } from '../../../../fixtures/omr-monitor'

it('copies only allowlisted fields at every level', () => {
  const raw = snapshotFixture()
  const result = parseMonitorSnapshot({ ...raw, token: 'private',
    jobs: { ...raw.jobs, recent: [{ ...raw.jobs.recent[0], filename: 'private.pdf', callback_url: 'private-url' }] },
    host: { ...raw.host, token: 'private' } })
  expect(JSON.stringify(result)).not.toMatch(/private/)
  expect(result.jobs.queued).toBe(1)
  expect(result.host.memory_total_bytes).toBeNull()
})

it.each([NaN, Infinity, -1, '0', null, 0.5])('rejects an invalid queue count %s', count => {
  const raw = snapshotFixture()
  expect(() => parseMonitorSnapshot({ ...raw, jobs: { ...raw.jobs, queued: count } })).toThrow()
})

it('rejects unbounded history and arbitrary identifiers', () => {
  const raw = snapshotFixture()
  expect(() => parseMonitorSnapshot({ ...raw, jobs: { ...raw.jobs, recent: Array(101).fill(raw.jobs.recent[0]) } })).toThrow()
  expect(() => parseMonitorSnapshot({ ...raw, jobs: { ...raw.jobs, recent: [{ ...raw.jobs.recent[0], id: 'private-file.pdf' }] } })).toThrow()
})
