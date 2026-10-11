export function ciWorkers(env: { CI?: string; PLAYWRIGHT_WORKERS?: string }): number | undefined {
  if (!env.CI) return undefined

  const value = env.PLAYWRIGHT_WORKERS
  if (!value || /[^0-9]/.test(value)) return 1

  const workers = Number(value)
  return Number.isInteger(workers) && workers > 0 ? workers : 1
}
