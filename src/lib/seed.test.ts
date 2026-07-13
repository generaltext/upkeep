import { describe, expect, it } from 'vitest'
import { seedDemo } from './seed'
import { emptyState, applyEvent, entitiesOfKind, allServices } from './reducer'
import type { Draft } from './events'
import { newId } from './ids'
import { dueForState, bucketize } from './recurrence'
import { DEFAULT_CONFIG } from './model'
import { todayStr } from './dates'
import { buildIcs } from './ics'

// End-to-end: run the exact demo seed through the real reducer + recurrence engine,
// simulating the store (drafts → stamped events → fold), so the "Try it live" demo
// is guaranteed to open onto a populated, sensible dashboard rather than by luck.
describe('seed → dashboard integration', () => {
  it('produces a populated set of due buckets and a matching ICS export', async () => {
    const s = emptyState()
    const dispatch = async (drafts: Draft[]) => {
      for (const d of drafts) {
        applyEvent(s, {
          id: newId('evt'),
          ts: new Date().toISOString(),
          actor: { id: 'demo', name: 'You' },
          type: d.type,
          subject: d.subject,
          ...(d.data ? { data: d.data } : {}),
        })
      }
    }
    await seedDemo(dispatch)

    expect(entitiesOfKind(s, 'property')).toHaveLength(2) // a house and a car
    expect(entitiesOfKind(s, 'asset').length).toBeGreaterThanOrEqual(6)
    expect(allServices(s).length).toBeGreaterThan(0)

    const items = dueForState(s, DEFAULT_CONFIG, todayStr())
    const { overdue, soon, upcoming } = bucketize(items)

    // Filter change (done 4mo ago, every 3mo) and detector batteries (never done,
    // 13-month-old anchor) are overdue regardless of the current date.
    const overdueTitles = overdue.map((i) => i.schedule.title)
    expect(overdueTitles).toContain('Replace HVAC filter')
    expect(overdueTitles).toContain('Replace detector batteries')
    // Fridge coils (done 1mo ago, every 6mo) are always well in the future.
    expect(soon.length + upcoming.length).toBeGreaterThanOrEqual(1)

    // One recurring VEVENT per active schedule.
    const eventCount = (buildIcs(s, DEFAULT_CONFIG, new Date().toISOString()).match(/BEGIN:VEVENT/g) ?? []).length
    expect(eventCount).toBe(items.length)
  })
})
