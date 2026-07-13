// The projection: fold the event log into current-state records. Application is
// idempotent (each event id applied at most once) so re-folding a shard tail, or
// seeing our own optimistic write echoed back by the watch, is always safe.
//
// Field conflicts resolve last-writer-wins by log order (appends are monotonic, so
// a later event simply overwrites an earlier one; a full rebuild sorts by (ts, id)
// first to make that deterministic — see store).

import type { Actor, UpkeepEvent } from './events'
import type { Interval } from './dates'
import type { FormKind } from './model'
import { kindOfId } from './model'

export interface EntityRecord {
  id: string
  kind: FormKind
  fields: Record<string, string | number>
  tags: string[]
  archived: boolean
  createdBy: Actor | null
  createdAt: string
  updatedBy: Actor | null
  updatedAt: string
}

export interface ScheduleRecord {
  id: string
  assetId: string
  title: string
  interval: Interval
  /** date the clock starts if the task has never been logged (YYYY-MM-DD) */
  anchor: string
  /** optional per-schedule warning lead; falls back to config.defaultLead */
  lead: Interval | null
  /** if set and in the future, suppresses the warning until this date */
  snoozedUntil: string | null
  archived: boolean
  createdBy: Actor | null
  createdAt: string
  updatedBy: Actor | null
  updatedAt: string
}

export interface ServiceRecord {
  id: string
  assetId: string
  /** the schedule this fulfills, if any (advances that schedule's next-due) */
  scheduleId: string | null
  /** the calendar date the work happened (YYYY-MM-DD) */
  occurredOn: string
  cost: number | null
  /** free label for who did it, e.g. "self" or a company name */
  by: string
  vendorId: string | null
  note: string
  voided: boolean
  createdBy: Actor | null
  createdAt: string
  updatedBy: Actor | null
  updatedAt: string
}

export interface NoteRecord {
  id: string
  target: string
  body: string
  /** relative path of an attached blob under v0/blobs/, if any */
  blobRef: string | null
  blobName: string | null
  blobSize: number | null
  archived: boolean
  createdBy: Actor | null
  createdAt: string
  updatedBy: Actor | null
  updatedAt: string
}

export interface State {
  entities: Record<string, EntityRecord>
  schedules: Record<string, ScheduleRecord>
  services: Record<string, ServiceRecord>
  notes: Record<string, NoteRecord>
  /** every applied event, in application order, for the history feed */
  events: UpkeepEvent[]
  applied: Set<string>
}

export function emptyState(): State {
  return {
    entities: {},
    schedules: {},
    services: {},
    notes: {},
    events: [],
    applied: new Set(),
  }
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function asNumberOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function asInterval(v: unknown): Interval | null {
  if (v && typeof v === 'object') {
    const o = v as { n?: unknown; unit?: unknown }
    if (typeof o.n === 'number' && (o.unit === 'day' || o.unit === 'week' || o.unit === 'month' || o.unit === 'year')) {
      return { n: o.n, unit: o.unit }
    }
  }
  return null
}

export function applyEvent(state: State, ev: UpkeepEvent): void {
  if (state.applied.has(ev.id)) return
  state.applied.add(ev.id)
  state.events.push(ev)

  const [entity, verb] = ev.type.split('.')
  const data = ev.data ?? {}

  switch (entity) {
    case 'property':
    case 'asset':
    case 'vendor':
      applyEntity(state, ev, verb ?? '', data)
      break
    case 'schedule':
      applySchedule(state, ev, verb ?? '', data)
      break
    case 'service':
      applyService(state, ev, verb ?? '', data)
      break
    case 'note':
      applyNote(state, ev, verb ?? '', data)
      break
    case 'tag':
      applyTag(state, ev, verb ?? '', data)
      break
    default:
      // Unknown event type from a newer build: recorded in events (history),
      // otherwise ignored. Forward-compatible by design.
      break
  }
}

function fieldsFrom(data: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string' || typeof v === 'number') out[k] = v
  }
  return out
}

function touch(rec: { updatedAt: string; updatedBy: Actor | null }, ev: UpkeepEvent): void {
  rec.updatedAt = ev.ts
  rec.updatedBy = ev.actor
}

function applyEntity(state: State, ev: UpkeepEvent, verb: string, data: Record<string, unknown>): void {
  const kind = kindOfId(ev.subject)
  if (!kind) return

  if (verb === 'create') {
    if (state.entities[ev.subject]) return
    state.entities[ev.subject] = {
      id: ev.subject,
      kind,
      fields: fieldsFrom(data),
      tags: [],
      archived: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    return
  }

  const rec = state.entities[ev.subject]
  if (!rec) return

  if (verb === 'update') {
    Object.assign(rec.fields, fieldsFrom(data))
    touch(rec, ev)
  } else if (verb === 'archive') {
    rec.archived = true
    touch(rec, ev)
  } else if (verb === 'restore') {
    rec.archived = false
    touch(rec, ev)
  }
}

function applySchedule(state: State, ev: UpkeepEvent, verb: string, data: Record<string, unknown>): void {
  if (verb === 'create') {
    if (state.schedules[ev.subject]) return
    const interval = asInterval(data.interval) ?? { n: 3, unit: 'month' }
    state.schedules[ev.subject] = {
      id: ev.subject,
      assetId: asString(data.assetId),
      title: asString(data.title),
      interval,
      anchor: asString(data.anchor),
      lead: asInterval(data.lead),
      snoozedUntil: null,
      archived: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    return
  }
  const rec = state.schedules[ev.subject]
  if (!rec) return
  if (verb === 'update') {
    if (typeof data.title === 'string') rec.title = data.title
    if (typeof data.anchor === 'string') rec.anchor = data.anchor
    const iv = asInterval(data.interval)
    if (iv) rec.interval = iv
    if ('lead' in data) rec.lead = asInterval(data.lead)
    touch(rec, ev)
  } else if (verb === 'snooze') {
    rec.snoozedUntil = asString(data.until) || null
    touch(rec, ev)
  } else if (verb === 'archive') {
    rec.archived = true
    touch(rec, ev)
  } else if (verb === 'restore') {
    rec.archived = false
    touch(rec, ev)
  }
}

function applyService(state: State, ev: UpkeepEvent, verb: string, data: Record<string, unknown>): void {
  if (verb === 'log') {
    if (state.services[ev.subject]) return
    state.services[ev.subject] = {
      id: ev.subject,
      assetId: asString(data.assetId),
      scheduleId: asString(data.scheduleId) || null,
      occurredOn: asString(data.occurredOn),
      cost: asNumberOrNull(data.cost),
      by: asString(data.by),
      vendorId: asString(data.vendorId) || null,
      note: asString(data.note),
      voided: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    // Logging against a schedule clears any snooze — the task got done.
    const sched = state.schedules[state.services[ev.subject]!.scheduleId ?? '']
    if (sched) sched.snoozedUntil = null
    return
  }
  const rec = state.services[ev.subject]
  if (!rec) return
  if (verb === 'update') {
    if (typeof data.occurredOn === 'string') rec.occurredOn = data.occurredOn
    if ('cost' in data) rec.cost = asNumberOrNull(data.cost)
    if (typeof data.by === 'string') rec.by = data.by
    if ('vendorId' in data) rec.vendorId = asString(data.vendorId) || null
    if (typeof data.note === 'string') rec.note = data.note
    if ('scheduleId' in data) rec.scheduleId = asString(data.scheduleId) || null
    touch(rec, ev)
  } else if (verb === 'void') {
    rec.voided = true
    touch(rec, ev)
  } else if (verb === 'restore') {
    rec.voided = false
    touch(rec, ev)
  }
}

function applyNote(state: State, ev: UpkeepEvent, verb: string, data: Record<string, unknown>): void {
  if (verb === 'create') {
    if (state.notes[ev.subject]) return
    state.notes[ev.subject] = {
      id: ev.subject,
      target: asString(data.target),
      body: asString(data.body),
      blobRef: asString(data.blobRef) || null,
      blobName: asString(data.blobName) || null,
      blobSize: asNumberOrNull(data.blobSize),
      archived: false,
      createdBy: ev.actor,
      createdAt: ev.ts,
      updatedBy: ev.actor,
      updatedAt: ev.ts,
    }
    return
  }
  const rec = state.notes[ev.subject]
  if (!rec) return
  if (verb === 'update') {
    if (typeof data.body === 'string') rec.body = data.body
    touch(rec, ev)
  } else if (verb === 'archive') {
    rec.archived = true
    touch(rec, ev)
  } else if (verb === 'restore') {
    rec.archived = false
    touch(rec, ev)
  }
}

function applyTag(state: State, ev: UpkeepEvent, verb: string, data: Record<string, unknown>): void {
  const rec = state.entities[ev.subject]
  if (!rec) return
  const label = asString(data.label).trim()
  if (!label) return
  if (verb === 'add') {
    if (!rec.tags.includes(label)) {
      rec.tags.push(label)
      rec.tags.sort()
    }
  } else if (verb === 'remove') {
    rec.tags = rec.tags.filter((t) => t !== label)
  }
}

// ── selectors ────────────────────────────────────────────────────────────────

function byUpdatedDesc(a: { updatedAt: string }, b: { updatedAt: string }): number {
  return b.updatedAt < a.updatedAt ? -1 : 1
}

export function entitiesOfKind(state: State, kind: FormKind, includeArchived = false): EntityRecord[] {
  return Object.values(state.entities)
    .filter((e) => e.kind === kind && (includeArchived || !e.archived))
    .sort(byUpdatedDesc)
}

export function assetsForProperty(state: State, propertyId: string, includeArchived = false): EntityRecord[] {
  return Object.values(state.entities)
    .filter(
      (e) => e.kind === 'asset' && e.fields.propertyId === propertyId && (includeArchived || !e.archived),
    )
    .sort((a, b) => String(a.fields.name ?? '').localeCompare(String(b.fields.name ?? '')))
}

export function schedulesForAsset(state: State, assetId: string, includeArchived = false): ScheduleRecord[] {
  return Object.values(state.schedules)
    .filter((s) => s.assetId === assetId && (includeArchived || !s.archived))
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function servicesForAsset(state: State, assetId: string, includeVoided = false): ServiceRecord[] {
  return Object.values(state.services)
    .filter((s) => s.assetId === assetId && (includeVoided || !s.voided))
    .sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : a.occurredOn > b.occurredOn ? -1 : b.createdAt < a.createdAt ? -1 : 1))
}

/** Non-voided services fulfilling a given schedule, newest occurredOn first. */
export function servicesForSchedule(state: State, scheduleId: string): ServiceRecord[] {
  return Object.values(state.services)
    .filter((s) => s.scheduleId === scheduleId && !s.voided)
    .sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1))
}

export function allServices(state: State, includeVoided = false): ServiceRecord[] {
  return Object.values(state.services)
    .filter((s) => includeVoided || !s.voided)
    .sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : a.occurredOn > b.occurredOn ? -1 : 0))
}

export function notesForTarget(state: State, targetId: string, includeArchived = false): NoteRecord[] {
  return Object.values(state.notes)
    .filter((n) => n.target === targetId && (includeArchived || !n.archived))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) // newest first
}

export function activeSchedules(state: State): ScheduleRecord[] {
  return Object.values(state.schedules).filter((s) => {
    if (s.archived) return false
    const asset = state.entities[s.assetId]
    return !!asset && !asset.archived
  })
}

export function allTags(state: State): { label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const e of Object.values(state.entities)) {
    if (e.archived) continue
    for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function entitiesWithTag(state: State, label: string): EntityRecord[] {
  return Object.values(state.entities)
    .filter((e) => !e.archived && e.tags.includes(label))
    .sort(byUpdatedDesc)
}

export function entityTitle(state: State, id: string): string {
  const e = state.entities[id]
  if (!e) return ''
  return String(e.fields.name ?? '') || 'Untitled'
}
