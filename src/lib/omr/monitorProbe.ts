import { getOmrServiceUrl, omrAuthHeaders } from './serviceUrl'
import { deploymentSha, MonitorReport, parseMonitorSnapshot, ProbeStatus } from './monitorContract'

async function probe(path: string, origin: string) {
  const started = performance.now()
  try {
    const response = await fetch(`${origin.replace(/\/$/, '')}${path}`, {
      headers: omrAuthHeaders(), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) {
      await response.body?.cancel()
      return { status: (response.status === 404 && path === '/monitor' ? 'unsupported' : 'http_error') as ProbeStatus, value: null, latencyMs: null }
    }
    // Bound reads even if an upstream accidentally returns a score or HTML page.
    const reader = response.body?.getReader()
    if (!reader) throw new Error('invalid_response')
    const decoder = new TextDecoder()
    let size = 0
    let body = ''
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > (path === '/health' ? 4096 : 131072)) throw new Error('invalid_response')
        body += decoder.decode(chunk.value, { stream: true })
      }
      body += decoder.decode()
    } finally {
      await reader.cancel()
    }
    let value: unknown
    try { value = JSON.parse(body) } catch { throw new Error('invalid_response') }
    return { status: 'ok' as ProbeStatus, value, latencyMs: Math.round(performance.now() - started) }
  } catch (error) {
    const name = error && typeof error === 'object' && 'name' in error ? error.name : ''
    const invalid = error instanceof Error && error.message === 'invalid_response'
    return { status: (name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : invalid ? 'invalid_response' : 'unavailable') as ProbeStatus,
      value: null, latencyMs: null }
  }
}

export async function readMonitorReport(): Promise<MonitorReport> {
  const report: MonitorReport = { checkedAt: new Date().toISOString(), webSha: deploymentSha(process.env.VERCEL_GIT_COMMIT_SHA),
    health: { status: 'not_configured', latencyMs: null }, monitor: { status: 'not_configured', snapshot: null } }
  let origin: string
  try { origin = getOmrServiceUrl() } catch { return report }
  const [health, monitor] = await Promise.all([probe('/health', origin), probe('/monitor', origin)])
  const healthy = health.value && typeof health.value === 'object' && 'status' in health.value && health.value.status === 'healthy'
  report.health = { status: health.status === 'ok' && !healthy ? 'invalid_response' : health.status, latencyMs: healthy ? health.latencyMs : null }
  report.monitor.status = monitor.status
  if (monitor.status === 'ok') {
    try { report.monitor.snapshot = parseMonitorSnapshot(monitor.value) }
    catch { report.monitor.status = 'invalid_response' }
  }
  report.checkedAt = new Date().toISOString()
  return report
}
