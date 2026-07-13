// A starter set of common home-maintenance systems and their recurring tasks,
// offered on a fresh `home` property so the app is useful in the first minute.
// These are suggestions the user accepts wholesale; they can prune afterward.

import type { Draft } from './events'
import { todayStr, type Interval } from './dates'
import { newId } from './ids'

interface TemplateAsset {
  name: string
  category: string
  spec?: string
  schedules: { title: string; interval: Interval }[]
}

export const HOME_TEMPLATE: TemplateAsset[] = [
  {
    name: 'Furnace / HVAC',
    category: 'HVAC',
    spec: 'filter size: ____',
    schedules: [{ title: 'Replace HVAC filter', interval: { n: 3, unit: 'month' } }],
  },
  {
    name: 'Water heater',
    category: 'Plumbing',
    schedules: [{ title: 'Flush water heater', interval: { n: 1, unit: 'year' } }],
  },
  {
    name: 'Smoke & CO detectors',
    category: 'Safety',
    schedules: [{ title: 'Test detectors', interval: { n: 6, unit: 'month' } }, { title: 'Replace batteries', interval: { n: 1, unit: 'year' } }],
  },
  {
    name: 'Gutters',
    category: 'Exterior',
    schedules: [{ title: 'Clean gutters', interval: { n: 6, unit: 'month' } }],
  },
  {
    name: 'Dryer',
    category: 'Appliance',
    schedules: [{ title: 'Clean dryer vent', interval: { n: 1, unit: 'year' } }],
  },
  {
    name: 'Refrigerator',
    category: 'Appliance',
    schedules: [{ title: 'Clean condenser coils', interval: { n: 6, unit: 'month' } }],
  },
]

/** Build the drafts to add the common-home template under a property. */
export function homeTemplateDrafts(propertyId: string): Draft[] {
  const anchor = todayStr()
  const drafts: Draft[] = []
  for (const a of HOME_TEMPLATE) {
    const assetId = newId('ast')
    drafts.push({
      type: 'asset.create',
      subject: assetId,
      data: { propertyId, name: a.name, category: a.category, ...(a.spec ? { spec: a.spec } : {}) },
    })
    for (const s of a.schedules) {
      drafts.push({
        type: 'schedule.create',
        subject: newId('sch'),
        data: { assetId, title: s.title, interval: s.interval, anchor },
      })
    }
  }
  return drafts
}
