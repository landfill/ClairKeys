import type { MonitorReport } from './monitorContract'

export type Tone = 'ok' | 'attention' | 'down' | 'unknown'
export type MonitorSummary = {
  level: Tone
  reasons: string[]
  stale: boolean
  snapshotStale: boolean
  tiles: { connection: Tone; jobs: Tone; delivery: Tone; resources: Tone }
  callbackFailed: number
  callbackRetrying: number
  memoryUsedPercent: number | null
  dataUsedPercent: number | null
  hostFresh: boolean
}

function usedPercent(free: number | null, total: number | null): number | null {
  if (free === null || total === null || total <= 0) return null
  return Math.round((1 - free / total) * 100)
}

export function summarizeMonitor({ report, error, now }: {
  report: MonitorReport | null
  error: 'access' | 'connection' | null
  now: number
}): MonitorSummary {
  const snapshot = report?.monitor.snapshot
  const host = snapshot?.host
  const stale = Boolean(error || (report && now - Date.parse(report.checkedAt) > 90000))
  const snapshotStale = Boolean(snapshot && (now - Date.parse(snapshot.sampled_at) > 90000 || Date.parse(snapshot.sampled_at) > now + 5000))
  const hostFresh = Boolean(host?.status === 'ok' && host.sampled_at && now - Date.parse(host.sampled_at) <= 90000)
  const recent = snapshot?.jobs.recent ?? []
  const result: MonitorSummary = {
    level: 'unknown', reasons: [], stale, snapshotStale,
    tiles: { connection: 'unknown', jobs: 'unknown', delivery: 'unknown', resources: 'unknown' },
    callbackFailed: recent.filter(row => row.callback.status === 'failed' || row.callback.status === 'exhausted').length,
    callbackRetrying: recent.filter(row => row.callback.status === 'retrying').length,
    memoryUsedPercent: host && host.status !== 'unavailable' ? usedPercent(host.memory_available_bytes, host.memory_total_bytes) : null,
    dataUsedPercent: host && host.status !== 'unavailable' ? usedPercent(host.data_free_bytes, host.data_total_bytes) : null,
    hostFresh,
  }

  if (!report) {
    result.reasons = error === 'access' ? ['운영자 권한을 확인할 수 없음'] : error === 'connection' ? ['조회하지 못함'] : []
    return result
  }
  if (stale) {
    result.reasons = ['이전 조회 결과만 있음']
    return result
  }

  result.tiles.connection = report.health.status === 'ok' ? 'ok' : 'down'
  if (report.monitor.status !== 'ok' || !snapshot) {
    result.reasons.push('작업·자원 계측을 읽지 못함')
  } else {
    if (snapshotStale) result.reasons.push('OMR 계측 시각이 오래됨')
    result.tiles.jobs = snapshot.jobs.failed > 0 ? 'attention' : 'ok'
    if (snapshot.jobs.failed > 0) result.reasons.push(`변환 실패 ${snapshot.jobs.failed}건`)
    result.tiles.delivery = result.callbackFailed > 0 ? 'attention' : 'ok'
    if (result.callbackFailed > 0) result.reasons.push(`결과 전달 실패 ${result.callbackFailed}건`)

    if (host?.status === 'unavailable') {
      result.reasons.push('VM 자원을 수집하지 못함')
    } else if (!hostFresh) {
      result.reasons.push('VM 자원 데이터가 오래됨')
    } else if (host) {
      result.tiles.resources = 'ok'
      // Use the raw free ratio: 9.9% needs attention even when displayed as 10%.
      if (host.memory_available_bytes! / host.memory_total_bytes! < 0.1) {
        result.reasons.push(`메모리 여유 ${100 - result.memoryUsedPercent!}%`)
        result.tiles.resources = 'attention'
      }
      if (host.data_free_bytes! / host.data_total_bytes! < 0.1) {
        result.reasons.push(`디스크 여유 ${100 - result.dataUsedPercent!}%`)
        result.tiles.resources = 'attention'
      }
    }

    if (snapshotStale) {
      result.tiles.jobs = result.tiles.delivery = result.tiles.resources = 'unknown'
    }
  }

  if (report.health.status !== 'ok') {
    result.level = 'down'
    result.reasons = ['OMR 서버가 응답하지 않음']
  } else {
    result.level = result.reasons.length ? 'attention' : 'ok'
  }
  return result
}

export function formatDuration(seconds: number): string {
  const whole = Math.floor(seconds)
  const units = [
    { size: 86400, label: '일' }, { size: 3600, label: '시간' },
    { size: 60, label: '분' }, { size: 1, label: '초' },
  ]
  const index = units.findIndex(unit => whole >= unit.size)
  if (index < 0) return '0초'
  const first = units[index]
  const second = units[index + 1]
  const firstValue = Math.floor(whole / first.size)
  const secondValue = second ? Math.floor((whole % first.size) / second.size) : 0
  return `${firstValue}${first.label}${secondValue ? ` ${secondValue}${second.label}` : ''}`
}
