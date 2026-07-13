// Calendar hand-off. We can't push notifications (no backend, by design), so we
// export the schedule as an iCalendar feed: one recurring all-day VEVENT per active
// schedule, anchored at its next-due date. Subscribe to it once in a calendar app
// and that app — built for reminders — fires them. A static file follows the fixed
// RRULE anchor; when a completion resets the clock, re-export to refresh it.

import type { IntervalUnit } from './dates'
import type { Config } from './model'
import { dueForState } from './recurrence'
import type { State } from './reducer'

const FREQ: Record<IntervalUnit, string> = {
  day: 'DAILY',
  week: 'WEEKLY',
  month: 'MONTHLY',
  year: 'YEARLY',
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** Fold lines to 75 octets per RFC 5545 (approximate: by char, which is fine for our ASCII-ish content). */
function fold(line: string): string {
  if (line.length <= 75) return line
  const out: string[] = [line.slice(0, 75)]
  let rest = line.slice(75)
  while (rest.length > 74) {
    out.push(' ' + rest.slice(0, 74))
    rest = rest.slice(74)
  }
  out.push(' ' + rest)
  return out.join('\r\n')
}

function dateValue(dateStr: string): string {
  return dateStr.replace(/-/g, '')
}

/**
 * Build an iCalendar string. `stamp` is the DTSTAMP (an ISO instant); pass one in
 * so this stays a pure function (the caller stamps at export time).
 */
export function buildIcs(state: State, config: Config, stamp: string): string {
  const dtstamp = stamp.replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/(\d{8}T\d{6})Z?/, '$1Z')
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//General Text//Upkeep//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Upkeep',
  ]

  for (const item of dueForState(state, config)) {
    const assetName = String(item.asset?.fields.name ?? 'System')
    const summary = `${item.schedule.title} — ${assetName}`
    const spec = String(item.asset?.fields.spec ?? '')
    const desc = spec ? `${assetName}: ${spec}` : assetName
    const iv = item.schedule.interval
    lines.push(
      'BEGIN:VEVENT',
      fold(`UID:${item.schedule.id}@upkeep.generaltext.org`),
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dateValue(item.nextDue)}`,
      `RRULE:FREQ=${FREQ[iv.unit]};INTERVAL=${Math.max(1, Math.trunc(iv.n))}`,
      fold(`SUMMARY:${escapeText(summary)}`),
      fold(`DESCRIPTION:${escapeText(desc)}`),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      fold(`DESCRIPTION:${escapeText(summary)}`),
      'TRIGGER:PT9H', // 9am-ish reminder on the due day (relative to all-day 00:00)
      'END:VALARM',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
