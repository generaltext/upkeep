// The recurrence engine — the heart of the app. For each schedule we derive a
// next-due date from the log rather than storing it: the most recent fulfilling
// service's date + the interval (or the anchor + interval if it's never been done).
// Then we bucket every active schedule into overdue / due-soon / upcoming so the
// dashboard is a pure projection that's always correct by construction.

import { addInterval, daysBetween, isDateStr, todayStr, type Interval } from './dates'
import type { Config } from './model'
import { activeSchedules, servicesForSchedule, type EntityRecord, type ScheduleRecord, type State } from './reducer'

export type DueStatus = 'overdue' | 'soon' | 'upcoming'

export interface DueItem {
  schedule: ScheduleRecord
  asset: EntityRecord | undefined
  /** date of the most recent fulfilling service, or null if never done */
  lastDone: string | null
  /** the raw next-due date (lastDone-or-anchor + interval) */
  nextDue: string
  /** next-due after a snooze is applied (what we actually bucket on) */
  effectiveDue: string
  status: DueStatus
  snoozed: boolean
}

function leadOf(sched: ScheduleRecord, config: Config): Interval {
  return sched.lead ?? config.defaultLead
}

/** Compute the due state of one schedule, relative to `today` (YYYY-MM-DD). */
export function computeDue(
  state: State,
  config: Config,
  sched: ScheduleRecord,
  today: string = todayStr(),
): DueItem {
  const history = servicesForSchedule(state, sched.id)
  const lastDone = history[0]?.occurredOn ?? null
  const base = isDateStr(lastDone) ? lastDone! : isDateStr(sched.anchor) ? sched.anchor : today
  const nextDue = addInterval(base, sched.interval)

  const snoozed = isDateStr(sched.snoozedUntil) && daysBetween(today, sched.snoozedUntil!) > 0
  const effectiveDue = snoozed && sched.snoozedUntil! > nextDue ? sched.snoozedUntil! : nextDue

  const days = daysBetween(today, effectiveDue)
  const leadEnd = addInterval(today, leadOf(sched, config))
  let status: DueStatus
  if (days < 0) status = 'overdue'
  else if (effectiveDue <= leadEnd) status = 'soon'
  else status = 'upcoming'

  return {
    schedule: sched,
    asset: state.entities[sched.assetId],
    lastDone,
    nextDue,
    effectiveDue,
    status,
    snoozed: !!snoozed,
  }
}

/** Every active schedule's due state, soonest-due first. */
export function dueForState(state: State, config: Config, today: string = todayStr()): DueItem[] {
  return activeSchedules(state)
    .map((s) => computeDue(state, config, s, today))
    .sort((a, b) => (a.effectiveDue < b.effectiveDue ? -1 : a.effectiveDue > b.effectiveDue ? 1 : 0))
}

export interface DueBuckets {
  overdue: DueItem[]
  soon: DueItem[]
  upcoming: DueItem[]
}

export function bucketize(items: DueItem[]): DueBuckets {
  return {
    overdue: items.filter((i) => i.status === 'overdue'),
    soon: items.filter((i) => i.status === 'soon'),
    upcoming: items.filter((i) => i.status === 'upcoming'),
  }
}
