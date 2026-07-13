import { describe, expect, it } from 'vitest'
import { serializeEvent, type UpkeepEvent } from './events'
import {
  applyEvent,
  allServices,
  emptyState,
  entitiesOfKind,
  notesForTarget,
  schedulesForAsset,
  servicesForAsset,
  servicesForSchedule,
} from './reducer'
import { appendLine, foldTail } from './log'
import { addInterval, daysBetween, dueLabel, intervalLabel, isDateStr, todayStr } from './dates'
import { computeDue, dueForState, bucketize } from './recurrence'
import { DEFAULT_CONFIG } from './model'
import { buildIcs } from './ics'

function ev(partial: Partial<UpkeepEvent> & Pick<UpkeepEvent, 'type' | 'subject'>): UpkeepEvent {
  return {
    id: partial.id ?? `evt_${Math.random().toString(36).slice(2)}`,
    ts: partial.ts ?? '2026-07-01T00:00:00.000Z',
    actor: partial.actor ?? { id: 'u1', name: 'Ada' },
    type: partial.type,
    subject: partial.subject,
    ...(partial.data ? { data: partial.data } : {}),
  }
}

describe('dates', () => {
  it('adds day/week/month/year intervals', () => {
    expect(addInterval('2026-01-01', { n: 10, unit: 'day' })).toBe('2026-01-11')
    expect(addInterval('2026-01-01', { n: 2, unit: 'week' })).toBe('2026-01-15')
    expect(addInterval('2026-01-01', { n: 3, unit: 'month' })).toBe('2026-04-01')
    expect(addInterval('2026-01-01', { n: 1, unit: 'year' })).toBe('2027-01-01')
  })

  it('clamps month/year addition to the last valid day', () => {
    expect(addInterval('2026-01-31', { n: 1, unit: 'month' })).toBe('2026-02-28')
    expect(addInterval('2024-02-29', { n: 1, unit: 'year' })).toBe('2025-02-28')
  })

  it('handles negative intervals (snooze/anchor math)', () => {
    expect(addInterval('2026-03-15', { n: -1, unit: 'week' })).toBe('2026-03-08')
    expect(addInterval('2026-03-15', { n: -6, unit: 'month' })).toBe('2025-09-15')
  })

  it('counts whole days between dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-08')).toBe(7)
    expect(daysBetween('2026-01-08', '2026-01-01')).toBe(-7)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1) // 2026 not a leap year
  })

  it('validates and labels', () => {
    expect(isDateStr('2026-07-12')).toBe(true)
    expect(isDateStr('nope')).toBe(false)
    expect(isDateStr('')).toBe(false)
    expect(intervalLabel({ n: 3, unit: 'month' })).toBe('every 3 months')
    expect(intervalLabel({ n: 1, unit: 'year' })).toBe('yearly')
    expect(dueLabel('2026-01-10', '2026-01-10')).toBe('due today')
    expect(dueLabel('2026-01-05', '2026-01-10')).toBe('5 days overdue')
    expect(dueLabel('2026-01-13', '2026-01-10')).toBe('due in 3 days')
  })
})

describe('reducer', () => {
  it('creates, updates (LWW), and materializes an entity', () => {
    const s = emptyState()
    applyEvent(s, ev({ type: 'asset.create', subject: 'ast_1', data: { name: 'Furnace', make: 'Carrier' } }))
    applyEvent(s, ev({ type: 'asset.update', subject: 'ast_1', data: { make: 'Trane' } }))
    expect(s.entities.ast_1!.fields.name).toBe('Furnace')
    expect(s.entities.ast_1!.fields.make).toBe('Trane')
    expect(entitiesOfKind(s, 'asset')).toHaveLength(1)
  })

  it('is idempotent — applying the same event twice is a no-op', () => {
    const s = emptyState()
    const e = ev({ id: 'evt_x', type: 'property.create', subject: 'prop_1', data: { name: 'House' } })
    applyEvent(s, e)
    applyEvent(s, e)
    expect(s.events).toHaveLength(1)
    expect(Object.keys(s.entities)).toHaveLength(1)
  })

  it('adds and removes tags', () => {
    const s = emptyState()
    applyEvent(s, ev({ type: 'asset.create', subject: 'ast_1', data: { name: 'Furnace' } }))
    applyEvent(s, ev({ type: 'tag.add', subject: 'ast_1', data: { label: 'seasonal' } }))
    applyEvent(s, ev({ type: 'tag.add', subject: 'ast_1', data: { label: 'seasonal' } })) // dupe
    expect(s.entities.ast_1!.tags).toEqual(['seasonal'])
    applyEvent(s, ev({ type: 'tag.remove', subject: 'ast_1', data: { label: 'seasonal' } }))
    expect(s.entities.ast_1!.tags).toEqual([])
  })

  it('logs services, voids them, and links them to schedules', () => {
    const s = emptyState()
    applyEvent(s, ev({ type: 'asset.create', subject: 'ast_1', data: { name: 'Furnace' } }))
    applyEvent(s, ev({ type: 'schedule.create', subject: 'sch_1', data: { assetId: 'ast_1', title: 'Filter', interval: { n: 3, unit: 'month' }, anchor: '2026-01-01' } }))
    applyEvent(s, ev({ type: 'service.log', subject: 'svc_1', data: { assetId: 'ast_1', scheduleId: 'sch_1', occurredOn: '2026-02-01', cost: 25 } }))
    applyEvent(s, ev({ type: 'service.log', subject: 'svc_2', data: { assetId: 'ast_1', occurredOn: '2026-03-01' } })) // one-off
    expect(servicesForAsset(s, 'ast_1')).toHaveLength(2)
    expect(servicesForSchedule(s, 'sch_1')).toHaveLength(1)
    expect(schedulesForAsset(s, 'ast_1')).toHaveLength(1)
    applyEvent(s, ev({ type: 'service.void', subject: 'svc_1' }))
    expect(servicesForAsset(s, 'ast_1')).toHaveLength(1)
    expect(servicesForSchedule(s, 'sch_1')).toHaveLength(0)
    expect(allServices(s, true)).toHaveLength(2)
  })

  it('logging against a schedule clears its snooze', () => {
    const s = emptyState()
    applyEvent(s, ev({ type: 'asset.create', subject: 'ast_1', data: { name: 'Furnace' } }))
    applyEvent(s, ev({ type: 'schedule.create', subject: 'sch_1', data: { assetId: 'ast_1', title: 'Filter', interval: { n: 3, unit: 'month' }, anchor: '2026-01-01' } }))
    applyEvent(s, ev({ type: 'schedule.snooze', subject: 'sch_1', data: { until: '2099-01-01' } }))
    expect(s.schedules.sch_1!.snoozedUntil).toBe('2099-01-01')
    applyEvent(s, ev({ type: 'service.log', subject: 'svc_1', data: { assetId: 'ast_1', scheduleId: 'sch_1', occurredOn: '2026-02-01' } }))
    expect(s.schedules.sch_1!.snoozedUntil).toBe(null)
  })

  it('attaches notes with optional blob refs and archives them', () => {
    const s = emptyState()
    applyEvent(s, ev({ type: 'asset.create', subject: 'ast_1', data: { name: 'Furnace' } }))
    applyEvent(s, ev({ type: 'note.create', subject: 'note_1', data: { target: 'ast_1', body: 'Filter is 20x25x1', blobRef: 'v0/blobs/note_1/plate.jpg', blobName: 'plate.jpg', blobSize: 4321 } }))
    expect(notesForTarget(s, 'ast_1')).toHaveLength(1)
    expect(notesForTarget(s, 'ast_1')[0]!.blobRef).toBe('v0/blobs/note_1/plate.jpg')
    applyEvent(s, ev({ type: 'note.archive', subject: 'note_1' }))
    expect(notesForTarget(s, 'ast_1')).toHaveLength(0)
    expect(notesForTarget(s, 'ast_1', true)).toHaveLength(1)
  })

  it('ignores unknown event types (forward-compatible) but records them', () => {
    const s = emptyState()
    applyEvent(s, ev({ type: 'widget.frobnicate', subject: 'wid_1', data: { x: 1 } }))
    expect(s.events).toHaveLength(1)
    expect(Object.keys(s.entities)).toHaveLength(0)
  })
})

describe('recurrence', () => {
  function base() {
    const s = emptyState()
    applyEvent(s, ev({ type: 'asset.create', subject: 'ast_1', data: { name: 'Furnace' } }))
    return s
  }

  it('is overdue when the last service + interval is in the past', () => {
    const s = base()
    applyEvent(s, ev({ type: 'schedule.create', subject: 'sch_1', data: { assetId: 'ast_1', title: 'Filter', interval: { n: 3, unit: 'month' }, anchor: '2026-01-01' } }))
    applyEvent(s, ev({ type: 'service.log', subject: 'svc_1', data: { assetId: 'ast_1', scheduleId: 'sch_1', occurredOn: '2026-01-01' } }))
    const due = computeDue(s, DEFAULT_CONFIG, s.schedules.sch_1!, '2026-05-01')
    expect(due.nextDue).toBe('2026-04-01')
    expect(due.lastDone).toBe('2026-01-01')
    expect(due.status).toBe('overdue')
  })

  it('is due-soon within the lead window and upcoming beyond it', () => {
    const s = base()
    applyEvent(s, ev({ type: 'schedule.create', subject: 'sch_1', data: { assetId: 'ast_1', title: 'Filter', interval: { n: 3, unit: 'month' }, anchor: '2026-01-01' } }))
    applyEvent(s, ev({ type: 'service.log', subject: 'svc_1', data: { assetId: 'ast_1', scheduleId: 'sch_1', occurredOn: '2026-01-01' } }))
    // nextDue = 2026-04-01; default lead = 2 weeks
    expect(computeDue(s, DEFAULT_CONFIG, s.schedules.sch_1!, '2026-03-25').status).toBe('soon')
    expect(computeDue(s, DEFAULT_CONFIG, s.schedules.sch_1!, '2026-02-01').status).toBe('upcoming')
  })

  it('uses the anchor when the task has never been logged', () => {
    const s = base()
    applyEvent(s, ev({ type: 'schedule.create', subject: 'sch_1', data: { assetId: 'ast_1', title: 'Batteries', interval: { n: 1, unit: 'year' }, anchor: '2025-06-01' } }))
    const due = computeDue(s, DEFAULT_CONFIG, s.schedules.sch_1!, '2026-07-01')
    expect(due.lastDone).toBe(null)
    expect(due.nextDue).toBe('2026-06-01')
    expect(due.status).toBe('overdue')
  })

  it('a future snooze pushes the effective due date past the warning window', () => {
    const s = base()
    applyEvent(s, ev({ type: 'schedule.create', subject: 'sch_1', data: { assetId: 'ast_1', title: 'Filter', interval: { n: 3, unit: 'month' }, anchor: '2026-01-01' } }))
    // overdue as of 2026-05-01, but snoozed a month out
    applyEvent(s, ev({ type: 'schedule.snooze', subject: 'sch_1', data: { until: '2026-06-01' } }))
    const due = computeDue(s, DEFAULT_CONFIG, s.schedules.sch_1!, '2026-05-01')
    expect(due.snoozed).toBe(true)
    expect(due.effectiveDue).toBe('2026-06-01')
    expect(due.status).toBe('upcoming')
  })

  it('buckets active schedules and skips archived assets', () => {
    const s = base()
    applyEvent(s, ev({ type: 'schedule.create', subject: 'sch_1', data: { assetId: 'ast_1', title: 'Filter', interval: { n: 3, unit: 'month' }, anchor: '2020-01-01' } }))
    applyEvent(s, ev({ type: 'asset.create', subject: 'ast_2', data: { name: 'Old boiler' } }))
    applyEvent(s, ev({ type: 'schedule.create', subject: 'sch_2', data: { assetId: 'ast_2', title: 'Service', interval: { n: 1, unit: 'year' }, anchor: '2020-01-01' } }))
    applyEvent(s, ev({ type: 'asset.archive', subject: 'ast_2' }))
    const items = dueForState(s, DEFAULT_CONFIG, '2026-05-01')
    expect(items).toHaveLength(1) // ast_2's schedule excluded (asset archived)
    expect(bucketize(items).overdue).toHaveLength(1)
  })
})

describe('log fold', () => {
  it('folds incrementally and skips a half-synced trailing line', () => {
    const s = emptyState()
    const e1 = serializeEvent(ev({ id: 'e1', type: 'asset.create', subject: 'ast_1', data: { name: 'Furnace' } }))
    const e2 = serializeEvent(ev({ id: 'e2', type: 'asset.create', subject: 'ast_2', data: { name: 'Heater' } }))

    const partial = appendLine('', e1) + e2 // e1\n + e2 (no trailing newline)
    const len1 = foldTail(s, partial, 0)
    expect(Object.keys(s.entities)).toEqual(['ast_1'])
    expect(len1).toBe(appendLine('', e1).length)

    const full = appendLine(appendLine('', e1), e2)
    const len2 = foldTail(s, full, len1)
    expect(Object.keys(s.entities).sort()).toEqual(['ast_1', 'ast_2'])
    expect(len2).toBe(full.length)
    expect(s.events).toHaveLength(2)
  })

  it('appendLine keeps the log newline-terminated', () => {
    expect(appendLine('', '{"a":1}')).toBe('{"a":1}\n')
    expect(appendLine('{"a":1}\n', '{"b":2}')).toBe('{"a":1}\n{"b":2}\n')
  })
})

describe('ics export', () => {
  it('emits one recurring VEVENT per active schedule', () => {
    const s = emptyState()
    applyEvent(s, ev({ type: 'asset.create', subject: 'ast_1', data: { name: 'Furnace', spec: '20x25x1' } }))
    applyEvent(s, ev({ type: 'schedule.create', subject: 'sch_1', data: { assetId: 'ast_1', title: 'Replace filter', interval: { n: 3, unit: 'month' }, anchor: '2026-01-01' } }))
    const ics = buildIcs(s, DEFAULT_CONFIG, '2026-07-01T00:00:00.000Z')
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('RRULE:FREQ=MONTHLY;INTERVAL=3')
    expect(ics).toContain('SUMMARY:Replace filter — Furnace')
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true)
  })

  it('is stable given a fixed today (uses todayStr only indirectly)', () => {
    // sanity: todayStr returns a valid date string
    expect(isDateStr(todayStr())).toBe(true)
  })
})
