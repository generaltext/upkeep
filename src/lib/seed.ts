// Sample content for the gallery "Try it live" demo, so it opens full instead of
// empty — and lands on a dashboard with real overdue / due-soon / upcoming buckets.
// Only ever runs in demo mode against a throwaway workspace (see store). Service
// dates are computed relative to today so the buckets always look right.

import { addInterval, todayStr } from './dates'
import type { Draft } from './events'
import { newId } from './ids'

/** today minus n units (a past date), as YYYY-MM-DD. */
function ago(n: number, unit: 'day' | 'week' | 'month' | 'year'): string {
  return addInterval(todayStr(), { n: -n, unit })
}

export async function seedDemo(dispatch: (d: Draft[]) => Promise<void>): Promise<void> {
  const house = newId('prop')
  const car = newId('prop')

  const furnace = newId('ast')
  const heater = newId('ast')
  const detectors = newId('ast')
  const fridge = newId('ast')
  const roof = newId('ast')
  const engine = newId('ast')

  const schFilter = newId('sch')
  const schFlush = newId('sch')
  const schBatteries = newId('sch')
  const schCoils = newId('sch')
  const schOil = newId('sch')

  const acme = newId('ven')

  const drafts: Draft[] = [
    // ── Properties ──
    { type: 'property.create', subject: house, data: { name: 'Maple Street House', kind: 'home', address: '124 Maple St', notes: 'Built 1998. Bought spring 2021.' } },
    { type: 'property.create', subject: car, data: { name: 'The Subaru', kind: 'vehicle', address: 'Outback · VIN 4S4BSANC…' } },

    // ── Vendor ──
    { type: 'vendor.create', subject: acme, data: { name: 'Acme Heating & Air', trade: 'HVAC', phone: '(555) 214-8890', email: 'service@acmehvac.example' } },

    // ── House systems ──
    { type: 'asset.create', subject: furnace, data: { propertyId: house, name: 'Furnace', category: 'HVAC', location: 'Basement', make: 'Carrier', model: '59TP6A', serial: '3204A19871', spec: '20x25x1 MERV 11', installedOn: ago(6, 'year'), warrantyUntil: addInterval(todayStr(), { n: 4, unit: 'year' }), purchasePrice: 4200 } },
    { type: 'asset.create', subject: heater, data: { propertyId: house, name: 'Water heater', category: 'Plumbing', location: 'Basement', make: 'Rheem', model: 'XE50T10', serial: 'RH50-99231', installedOn: ago(3, 'year'), purchasePrice: 1350 } },
    { type: 'asset.create', subject: detectors, data: { propertyId: house, name: 'Smoke & CO detectors', category: 'Safety', location: 'All floors', spec: '9V + AA backups' } },
    { type: 'asset.create', subject: fridge, data: { propertyId: house, name: 'Refrigerator', category: 'Appliance', location: 'Kitchen', make: 'LG', model: 'LRFVS3006S', serial: 'LG-3006-77120' } },
    { type: 'asset.create', subject: roof, data: { propertyId: house, name: 'Roof', category: 'Exterior', spec: 'Architectural asphalt shingle', installedOn: ago(6, 'year'), warrantyUntil: addInterval(todayStr(), { n: 24, unit: 'year' }) } },

    // ── Vehicle system ──
    { type: 'asset.create', subject: engine, data: { propertyId: car, name: 'Engine & oil', category: 'Vehicle', spec: '0W-20 synthetic, 4.4 qt' } },

    // ── Schedules ──
    { type: 'schedule.create', subject: schFilter, data: { assetId: furnace, title: 'Replace HVAC filter', interval: { n: 3, unit: 'month' }, anchor: ago(9, 'month') } },
    { type: 'schedule.create', subject: schFlush, data: { assetId: heater, title: 'Flush water heater', interval: { n: 1, unit: 'year' }, anchor: ago(3, 'year') } },
    { type: 'schedule.create', subject: schBatteries, data: { assetId: detectors, title: 'Replace detector batteries', interval: { n: 1, unit: 'year' }, anchor: ago(13, 'month') } },
    { type: 'schedule.create', subject: schCoils, data: { assetId: fridge, title: 'Clean condenser coils', interval: { n: 6, unit: 'month' }, anchor: ago(2, 'year') } },
    { type: 'schedule.create', subject: schOil, data: { assetId: engine, title: 'Oil change', interval: { n: 6, unit: 'month' }, anchor: ago(2, 'year') } },

    // ── Service history (drives the buckets) ──
    // Filter last done 4 months ago (every 3mo) → OVERDUE
    { type: 'service.log', subject: newId('svc'), data: { assetId: furnace, scheduleId: schFilter, occurredOn: ago(7, 'month'), by: 'self', cost: 24.99, note: '20x25x1 MERV 11' } },
    { type: 'service.log', subject: newId('svc'), data: { assetId: furnace, scheduleId: schFilter, occurredOn: ago(4, 'month'), by: 'self', cost: 24.99 } },
    // Flush last done ~51 weeks ago (yearly) → DUE SOON
    { type: 'service.log', subject: newId('svc'), data: { assetId: heater, scheduleId: schFlush, occurredOn: ago(51, 'week'), by: 'self', note: 'Drained ~2 gal of sediment.' } },
    // Coils last done 1 month ago (every 6mo) → UPCOMING
    { type: 'service.log', subject: newId('svc'), data: { assetId: fridge, scheduleId: schCoils, occurredOn: ago(1, 'month'), by: 'self' } },
    // Oil last done ~5.5 months ago (every 6mo) → DUE SOON
    { type: 'service.log', subject: newId('svc'), data: { assetId: engine, scheduleId: schOil, occurredOn: ago(24, 'week'), by: 'Quick Lube', cost: 79.5, note: 'Rotated tires too.' } },
    // Detector batteries: never logged, anchor 13mo ago → OVERDUE
    // Roof: a one-off inspection, no schedule
    { type: 'service.log', subject: newId('svc'), data: { assetId: roof, occurredOn: ago(8, 'month'), by: 'Summit Roofing', cost: 150, note: 'Annual inspection: replaced 3 lifted shingles, resealed a vent boot.' } },

    // ── Tags ──
    { type: 'tag.add', subject: furnace, data: { label: 'seasonal' } },
    { type: 'tag.add', subject: heater, data: { label: 'seasonal' } },
    { type: 'tag.add', subject: detectors, data: { label: 'safety' } },

    // ── A note ──
    { type: 'note.create', subject: newId('note'), data: { target: furnace, body: 'Buy filters in a 6-pack from the hardware store on 5th; they carry the 20x25x1 MERV 11.' } },
  ]

  await dispatch(drafts)
}
