'use client'

import { useEffect, useRef, useState } from 'react'
import { deploymentSha, MonitorReport, parseMonitorSnapshot, ProbeStatus } from '@/lib/omr/monitorContract'

const statuses: ProbeStatus[] = ['ok', 'timeout', 'unavailable', 'http_error', 'invalid_response', 'unsupported', 'not_configured']

function parseReport(value: unknown): MonitorReport {
  const raw = value as MonitorReport
  if (!raw || !statuses.includes(raw.health?.status) || !statuses.includes(raw.monitor?.status)
    || typeof raw.checkedAt !== 'string' || !Number.isFinite(Date.parse(raw.checkedAt))
    || (raw.health.latencyMs !== null && (typeof raw.health.latencyMs !== 'number' || !Number.isFinite(raw.health.latencyMs) || raw.health.latencyMs < 0))) throw new Error('invalid_report')
  return { checkedAt: new Date(raw.checkedAt).toISOString(), webSha: deploymentSha(raw.webSha),
    health: { status: raw.health.status, latencyMs: raw.health.latencyMs },
    monitor: { status: raw.monitor.status, snapshot: raw.monitor.status === 'ok' ? parseMonitorSnapshot(raw.monitor.snapshot) : null } }
}

export function useOmrMonitor() {
  const [report, setReport] = useState<MonitorReport | null>(null)
  const [error, setError] = useState<'access' | 'connection' | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const refreshRef = useRef<() => void>(() => {})

  useEffect(() => {
    let disposed = false
    let controller: AbortController | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      if (disposed || controller || document.visibilityState === 'hidden') return
      controller = new AbortController()
      const current = controller
      setLoading(true)
      timer = setTimeout(() => current.abort(), 7000)
      try {
        const response = await fetch('/api/admin/omr', { cache: 'no-store', signal: current.signal })
        if (response.status === 401 || response.status === 403) {
          if (!disposed && !current.signal.aborted) { setReport(null); setError('access') }
          return
        }
        if (!response.ok) throw new Error('connection')
        const parsed = parseReport(await response.json())
        if (!disposed && !current.signal.aborted) { setReport(parsed); setError(null) }
      } catch {
        if (!disposed && !document.hidden) setError('connection')
      } finally {
        clearTimeout(timer)
        if (controller === current) controller = null
        if (!disposed) { setLoading(false); setNow(Date.now()) }
      }
    }
    refreshRef.current = () => { void refresh() }
    const visibility = () => {
      setNow(Date.now())
      if (document.visibilityState === 'hidden') controller?.abort()
      else void refresh()
    }
    document.addEventListener('visibilitychange', visibility)
    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') { setNow(Date.now()); void refresh() }
    }, 30000)
    void refresh()
    return () => {
      disposed = true
      clearInterval(interval)
      clearTimeout(timer)
      controller?.abort()
      document.removeEventListener('visibilitychange', visibility)
      refreshRef.current = () => {}
    }
  }, [])

  return { report, error, loading, now, refresh: () => refreshRef.current() }
}
