import { healthySnapshotFixture, snapshotFixture } from '../../../../fixtures/omr-monitor'
import { MonitorReport, parseMonitorSnapshot } from '../monitorContract'
import { formatDuration, summarizeMonitor } from '../monitorSummary'

const now = Date.parse('2026-11-10T03:00:00.000Z')
const at = (offset = 0) => new Date(now + offset).toISOString()

function reportFixture(): MonitorReport {
  const snapshot = parseMonitorSnapshot(healthySnapshotFixture())
  snapshot.sampled_at = at()
  snapshot.host.sampled_at = at()
  return {
    checkedAt: at(), webSha: 'b'.repeat(40),
    health: { status: 'ok', latencyMs: 21 }, monitor: { status: 'ok', snapshot },
  }
}

function summarize(report: MonitorReport | null, error: 'access' | 'connection' | null = null) {
  return summarizeMonitor({ report, error, now })
}

const unknownTiles = { connection: 'unknown', jobs: 'unknown', delivery: 'unknown', resources: 'unknown' }

describe('summarizeMonitor', () => {
  test.each([
    [null, []], ['access', ['운영자 권한을 확인할 수 없음']], ['connection', ['조회하지 못함']],
  ] as const)('no report with %s is unknown', (error, reasons) => {
    expect(summarize(null, error)).toMatchObject({ level: 'unknown', tiles: unknownTiles, reasons })
  })

  test('a fresh healthy report is ok with rounded usage and no reasons', () => {
    expect(summarize(reportFixture())).toEqual({
      level: 'ok', reasons: [], stale: false, snapshotStale: false,
      tiles: { connection: 'ok', jobs: 'ok', delivery: 'ok', resources: 'ok' },
      callbackFailed: 0, callbackRetrying: 0, memoryUsedPercent: 25, dataUsedPercent: 25, hostFresh: true,
    })
  })

  test.each(['access', 'connection'] as const)('an error %s overrides even health failure', error => {
    const report = reportFixture()
    report.health.status = 'timeout'
    expect(summarize(report, error)).toMatchObject({
      level: 'unknown', stale: true, tiles: unknownTiles, reasons: ['이전 조회 결과만 있음'],
    })
  })

  test('old reports with zero failures are unknown; exactly 90 seconds is still fresh', () => {
    const report = reportFixture()
    report.checkedAt = at(-90000)
    expect(summarize(report).level).toBe('ok')
    report.checkedAt = at(-90001)
    expect(summarize(report)).toMatchObject({
      level: 'unknown', stale: true, tiles: unknownTiles, reasons: ['이전 조회 결과만 있음'],
    })
  })

  test('health failure takes priority over missing collection and failures', () => {
    const report = reportFixture()
    report.health.status = 'timeout'
    report.monitor.snapshot!.jobs.failed = 2
    report.monitor.snapshot!.host = parseMonitorSnapshot(snapshotFixture()).host
    expect(summarize(report)).toMatchObject({
      level: 'down', reasons: ['OMR 서버가 응답하지 않음'],
      tiles: { connection: 'down', jobs: 'attention', delivery: 'ok', resources: 'unknown' },
    })
    report.monitor.snapshot = null
    expect(summarize(report).tiles).toEqual({ ...unknownTiles, connection: 'down' })
  })

  test.each(['unsupported', 'timeout'] as const)('unreadable monitor %s is not healthy', status => {
    const report = reportFixture()
    report.monitor = { status, snapshot: null }
    expect(summarize(report)).toMatchObject({
      level: 'attention', reasons: ['작업·자원 계측을 읽지 못함'],
      tiles: { ...unknownTiles, connection: 'ok' }, memoryUsedPercent: null, dataUsedPercent: null,
    })
  })

  test('missing snapshot cannot be classified as healthy', () => {
    const report = reportFixture()
    report.monitor.snapshot = null
    expect(summarize(report)).toMatchObject({ level: 'attention', tiles: { ...unknownTiles, connection: 'ok' } })
  })

  test.each([-90001, 6000])('snapshot timestamp offset %s is stale', offset => {
    const report = reportFixture()
    report.monitor.snapshot!.sampled_at = at(offset)
    expect(summarize(report)).toMatchObject({
      level: 'attention', snapshotStale: true, reasons: ['OMR 계측 시각이 오래됨'],
      tiles: { ...unknownTiles, connection: 'ok' },
    })
  })

  test.each([-90000, 5000])('snapshot timestamp boundary %s is accepted', offset => {
    const report = reportFixture()
    report.monitor.snapshot!.sampled_at = at(offset)
    expect(summarize(report).snapshotStale).toBe(false)
  })

  test('conversion failures affect only the jobs tile', () => {
    const report = reportFixture()
    report.monitor.snapshot!.jobs.failed = 3
    expect(summarize(report)).toMatchObject({
      level: 'attention', reasons: ['변환 실패 3건'],
      tiles: { connection: 'ok', jobs: 'attention', delivery: 'ok', resources: 'ok' },
    })
  })

  test('counts failed and exhausted callbacks separately from retrying', () => {
    const report = reportFixture()
    const snapshot = report.monitor.snapshot!
    const row = snapshot.jobs.recent[0]
    snapshot.jobs.recent = ['failed', 'exhausted', 'retrying', 'pending', 'delivered', 'not_started'].map(status => ({
      ...row, callback: { status: status as typeof row.callback.status, attempts: 2 },
    }))
    expect(summarize(report)).toMatchObject({
      level: 'attention', reasons: ['결과 전달 실패 2건'], callbackFailed: 2, callbackRetrying: 1,
      tiles: { delivery: 'attention', jobs: 'ok' },
    })
  })

  test('callback retrying alone is not a failure', () => {
    const report = reportFixture()
    report.monitor.snapshot!.jobs.recent[0].callback.status = 'retrying'
    expect(summarize(report)).toMatchObject({ level: 'ok', callbackFailed: 0, callbackRetrying: 1 })
  })

  test('unavailable resources are unknown, never ok or zero usage', () => {
    const report = reportFixture()
    report.monitor.snapshot!.host = parseMonitorSnapshot(snapshotFixture()).host
    expect(summarize(report)).toMatchObject({
      level: 'attention', reasons: ['VM 자원을 수집하지 못함'], hostFresh: false,
      memoryUsedPercent: null, dataUsedPercent: null, tiles: { resources: 'unknown' },
    })
  })

  test.each(['stale', 'old', 'missing-time'] as const)('host %s is unknown even with low free resources', kind => {
    const report = reportFixture()
    const host = report.monitor.snapshot!.host
    if (kind === 'stale') host.status = 'stale'
    if (kind === 'old') host.sampled_at = at(-90001)
    if (kind === 'missing-time') host.sampled_at = null
    host.memory_available_bytes = 0
    expect(summarize(report)).toMatchObject({
      level: 'attention', reasons: ['VM 자원 데이터가 오래됨'], hostFresh: false, tiles: { resources: 'unknown' },
    })
  })

  test('host exactly 90 seconds old is fresh', () => {
    const report = reportFixture()
    report.monitor.snapshot!.host.sampled_at = at(-90000)
    expect(summarize(report).hostFresh).toBe(true)
  })

  test.each(['memory', 'data'] as const)('%s free ratio uses the raw 10%% threshold before rounding', resource => {
    const report = reportFixture()
    const host = report.monitor.snapshot!.host
    host.memory_total_bytes = host.data_total_bytes = 1000
    host.memory_available_bytes = host.data_free_bytes = 100
    expect(summarize(report).level).toBe('ok')
    if (resource === 'memory') host.memory_available_bytes = 99
    else host.data_free_bytes = 99
    expect(summarize(report)).toMatchObject({
      level: 'attention', reasons: [resource === 'memory' ? '메모리 여유 10%' : '디스크 여유 10%'],
      tiles: { resources: 'attention' },
    })
  })

  test('collects reasons in their specified order', () => {
    const report = reportFixture()
    const snapshot = report.monitor.snapshot!
    snapshot.jobs.failed = 2
    snapshot.jobs.recent[0].callback.status = 'exhausted'
    snapshot.host.memory_available_bytes = 0
    snapshot.host.data_free_bytes = 0
    expect(summarize(report).reasons).toEqual([
      '변환 실패 2건', '결과 전달 실패 1건', '메모리 여유 0%', '디스크 여유 0%',
    ])
    snapshot.sampled_at = at(-90001)
    expect(summarize(report).tiles).toEqual({ ...unknownTiles, connection: 'ok' })
    expect(summarize(report).reasons[0]).toBe('OMR 계측 시각이 오래됨')
  })
})

describe('formatDuration', () => {
  test.each([
    [0, '0초'], [45, '45초'], [45.9, '45초'], [60, '1분'], [185, '3분 5초'],
    [3600, '1시간'], [3601, '1시간'], [8040, '2시간 14분'], [86400, '1일'], [273600, '3일 4시간'],
  ])('%s seconds is %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected)
  })
})
