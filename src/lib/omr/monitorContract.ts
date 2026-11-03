// Explicit allowlist shared by the server boundary and client response validation.
export const stages = ['queued', 'save_pdf', 'audiveris_wait', 'audiveris', 'xml_to_json', 'callback'] as const
export const jobStatuses = ['pending', 'processing', 'completed', 'failed'] as const
export const callbackStatuses = ['not_started', 'pending', 'retrying', 'delivered', 'failed', 'exhausted'] as const
export type MonitorJob = {
  id: string; status: typeof jobStatuses[number]; stage: typeof stages[number]
  created_at: string; updated_at: string; wait_seconds: number | null
  callback: { status: typeof callbackStatuses[number]; attempts: number }
}
export type HostSnapshot = {
  status: 'ok' | 'stale' | 'unavailable'; sampled_at: string | null
  memory_total_bytes: number | null; memory_available_bytes: number | null
  data_total_bytes: number | null; data_free_bytes: number | null
}
export type MonitorSnapshot = {
  version: 1; sampled_at: string; deployment_sha: string | null
  started_at: string; uptime_seconds: number
  retention: { max_completed: number; seconds: number }
  jobs: { queued: number; processing: number; callback_pending: number; completed: number
    failed: number; oldest_wait_seconds: number; recent: MonitorJob[] }
  host: HostSnapshot
}
export type ProbeStatus = 'ok' | 'timeout' | 'unavailable' | 'http_error' | 'invalid_response' | 'unsupported' | 'not_configured'
export type MonitorReport = {
  checkedAt: string; webSha: string | null
  health: { status: ProbeStatus; latencyMs: number | null }
  monitor: { status: ProbeStatus; snapshot: MonitorSnapshot | null }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_snapshot')
  return value as Record<string, unknown>
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e15) throw new Error('invalid_number')
  return value
}
function count(value: unknown): number {
  const result = number(value)
  if (!Number.isSafeInteger(result)) throw new Error('invalid_count')
  return result
}
function date(value: unknown): string {
  if (typeof value !== 'string' || value.length > 40 || !/^\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00)$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('invalid_date')
  return new Date(value).toISOString()
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) throw new Error('invalid_choice')
  return value as T
}
export function deploymentSha(value: unknown): string | null {
  return typeof value === 'string' && /^[a-f0-9]{40}$/.test(value) ? value : null
}

export function parseMonitorSnapshot(value: unknown): MonitorSnapshot {
  const raw = object(value)
  if (raw.version !== 1) throw new Error('unsupported_version')
  const jobs = object(raw.jobs)
  const retention = object(raw.retention)
  if (retention.max_completed !== 100 || retention.seconds !== 3600 || !Array.isArray(jobs.recent) || jobs.recent.length > 100) throw new Error('invalid_window')
  const recent = jobs.recent.map(value => {
    const row = object(value)
    const callback = object(row.callback)
    if (typeof row.id !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(row.id)) throw new Error('invalid_id')
    return { id: row.id, status: choice(row.status, jobStatuses), stage: choice(row.stage, stages),
      created_at: date(row.created_at), updated_at: date(row.updated_at),
      wait_seconds: row.wait_seconds === null ? null : number(row.wait_seconds),
      callback: { status: choice(callback.status, callbackStatuses), attempts: count(callback.attempts) } }
  })
  const host = object(raw.host)
  const status = choice(host.status, ['ok', 'stale', 'unavailable'] as const)
  const parsedHost: HostSnapshot = { status, sampled_at: null, memory_total_bytes: null,
    memory_available_bytes: null, data_total_bytes: null, data_free_bytes: null }
  if (status !== 'unavailable') {
    parsedHost.sampled_at = date(host.sampled_at)
    parsedHost.memory_total_bytes = number(host.memory_total_bytes)
    parsedHost.memory_available_bytes = number(host.memory_available_bytes)
    parsedHost.data_total_bytes = number(host.data_total_bytes)
    parsedHost.data_free_bytes = number(host.data_free_bytes)
    if (parsedHost.memory_total_bytes <= 0 || parsedHost.data_total_bytes <= 0 || parsedHost.memory_available_bytes > parsedHost.memory_total_bytes || parsedHost.data_free_bytes > parsedHost.data_total_bytes) throw new Error('invalid_resource')
  }
  return { version: 1, sampled_at: date(raw.sampled_at), deployment_sha: deploymentSha(raw.deployment_sha),
    started_at: date(raw.started_at), uptime_seconds: number(raw.uptime_seconds),
    retention: { max_completed: 100, seconds: 3600 }, host: parsedHost,
    jobs: { queued: count(jobs.queued), processing: count(jobs.processing), callback_pending: count(jobs.callback_pending),
      completed: count(jobs.completed), failed: count(jobs.failed), oldest_wait_seconds: number(jobs.oldest_wait_seconds), recent } }
}
