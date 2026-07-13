// Date-only arithmetic for the recurrence engine. We deliberately work in local
// calendar dates (YYYY-MM-DD strings), never timestamps: "when a service happened"
// and "when the next one is due" are calendar facts a user reasons about in their
// own timezone, and keeping them TZ-free avoids the off-by-a-day drift you get from
// folding a clock time into a due date. The event envelope keeps its own ISO `ts`
// for ordering; these dates are the domain data.

export type IntervalUnit = 'day' | 'week' | 'month' | 'year'

export interface Interval {
  n: number
  unit: IntervalUnit
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isDateStr(s: unknown): s is string {
  return typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(s))
}

/** Today as a local YYYY-MM-DD. */
export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parts(dateStr: string): [number, number, number] {
  const [y, m, d] = dateStr.split('-').map(Number)
  return [y!, m!, d!]
}

function toStr(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Whole days from `from` to `to` (positive if `to` is later). TZ-safe via UTC. */
export function daysBetween(from: string, to: string): number {
  const [ay, am, ad] = parts(from)
  const [by, bm, bd] = parts(to)
  const a = Date.UTC(ay, am - 1, ad)
  const b = Date.UTC(by, bm - 1, bd)
  return Math.round((b - a) / 86_400_000)
}

/**
 * Add an interval to a date, returning a YYYY-MM-DD. Month/year addition clamps
 * to the last valid day of the target month (Jan 31 + 1 month → Feb 28), which is
 * how people expect "monthly on the 31st" to behave.
 */
export function addInterval(dateStr: string, iv: Interval): string {
  const [y, m, d] = parts(dateStr)
  const n = Math.trunc(iv.n)
  if (iv.unit === 'day' || iv.unit === 'week') {
    const days = iv.unit === 'week' ? n * 7 : n
    const t = new Date(Date.UTC(y, m - 1, d))
    t.setUTCDate(t.getUTCDate() + days)
    return toStr(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
  }
  // month / year
  const monthsToAdd = iv.unit === 'year' ? n * 12 : n
  const zeroMonth = m - 1 + monthsToAdd
  const ty = y + Math.floor(zeroMonth / 12)
  const tm = ((zeroMonth % 12) + 12) % 12 // 0..11
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate()
  const td = Math.min(d, lastDay)
  return toStr(ty, tm + 1, td)
}

const UNIT_LABEL: Record<IntervalUnit, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
  year: 'year',
}

/** "every 3 months", "every 6 weeks", "yearly". */
export function intervalLabel(iv: Interval): string {
  const n = Math.trunc(iv.n)
  if (n === 1) {
    return { day: 'daily', week: 'weekly', month: 'monthly', year: 'yearly' }[iv.unit]
  }
  return `every ${n} ${UNIT_LABEL[iv.unit]}s`
}

/** "in 3 days", "in 2 weeks", "today", "3 days ago", "5 weeks overdue". */
export function dueLabel(dueStr: string, from: string = todayStr()): string {
  const days = daysBetween(from, dueStr)
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  if (days === -1) return '1 day overdue'
  if (days < 0) {
    const over = -days
    if (over < 14) return `${over} days overdue`
    if (over < 60) return `${Math.round(over / 7)} weeks overdue`
    return `${Math.round(over / 30)} months overdue`
  }
  if (days < 14) return `due in ${days} days`
  if (days < 60) return `due in ${Math.round(days / 7)} weeks`
  return `due in ${Math.round(days / 30)} months`
}
