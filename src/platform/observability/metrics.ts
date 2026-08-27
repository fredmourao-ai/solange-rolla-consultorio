export const OPERATIONAL_THRESHOLDS = {
  deadLetterJobs: 0,
  fiscalFailedFinal: 0,
  workerBacklogAgeSeconds: 300,
  healthFailures: 0,
  restoreAgeDays: 90,
} as const

const counters = new Map<string, number>()

export function incrementMetric(name: string, amount = 1): number {
  const next = (counters.get(name) ?? 0) + amount
  counters.set(name, next)
  return next
}

export function readMetrics(): Record<string, number> { return Object.fromEntries(counters.entries()) }
export function resetMetrics(): void { counters.clear() }
