// The entity model. The field-driven records (Property, Asset, Vendor) are
// declared here as data so their forms and detail views are generated from one
// registry — adding a field is a one-line change. Schedules, service records, and
// notes have specialized shapes (intervals, dates, attachments) and are handled by
// the reducer and their own forms rather than this generic field machinery.

import type { IntervalUnit } from './dates'

export type FormKind = 'property' | 'asset' | 'vendor'

export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'date' | 'select' | 'category'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  /** the field that titles the record (shown as its name everywhere) */
  title?: boolean
  placeholder?: string
  /** for type 'select': the fixed options */
  options?: { value: string; label: string }[]
  /** show this field in the compact list/summary row */
  summary?: boolean
}

export interface KindDef {
  kind: FormKind
  /** id prefix, e.g. 'ast' → ast_01J… */
  prefix: string
  singular: string
  plural: string
  /** lucide-react icon name */
  icon: string
  /** hash route segment, e.g. 'vendors' */
  route: string
  fields: FieldDef[]
}

export const PROPERTY_KINDS = [
  { value: 'home', label: 'Home' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
] as const

export const KINDS: Record<FormKind, KindDef> = {
  property: {
    kind: 'property',
    prefix: 'prop',
    singular: 'Property',
    plural: 'Properties',
    icon: 'Home',
    route: 'properties',
    fields: [
      { key: 'name', label: 'Name', type: 'text', title: true, placeholder: 'e.g. Main house, The Honda' },
      { key: 'kind', label: 'Type', type: 'select', options: [...PROPERTY_KINDS], summary: true },
      { key: 'address', label: 'Address / detail', type: 'text', placeholder: 'Street address, VIN, or a note' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  asset: {
    kind: 'asset',
    prefix: 'ast',
    singular: 'System',
    plural: 'Systems',
    icon: 'Wrench',
    route: 'systems',
    fields: [
      { key: 'name', label: 'Name', type: 'text', title: true, placeholder: 'e.g. Furnace, Water heater, Roof' },
      { key: 'category', label: 'Category', type: 'category', summary: true },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'e.g. Basement, Attic' },
      { key: 'make', label: 'Make', type: 'text', placeholder: 'Manufacturer' },
      { key: 'model', label: 'Model', type: 'text', placeholder: 'Model number' },
      { key: 'serial', label: 'Serial', type: 'text', placeholder: 'Serial number' },
      { key: 'spec', label: 'Filter / spec', type: 'text', placeholder: 'e.g. 20x25x1 MERV 11' },
      { key: 'installedOn', label: 'Installed', type: 'date' },
      { key: 'warrantyUntil', label: 'Warranty until', type: 'date' },
      { key: 'purchasePrice', label: 'Purchase price', type: 'money' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  vendor: {
    kind: 'vendor',
    prefix: 'ven',
    singular: 'Contact',
    plural: 'Contacts',
    icon: 'Phone',
    route: 'contacts',
    fields: [
      { key: 'name', label: 'Name', type: 'text', title: true, placeholder: 'Contractor or company' },
      { key: 'trade', label: 'Trade', type: 'text', placeholder: 'e.g. Plumber, HVAC', summary: true },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text', placeholder: 'name@example.com' },
      { key: 'url', label: 'Website', type: 'text', placeholder: 'https://' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
}

export const KIND_LIST: KindDef[] = [KINDS.property, KINDS.asset, KINDS.vendor]

const PREFIX_TO_KIND: Record<string, FormKind> = {
  prop: 'property',
  ast: 'asset',
  ven: 'vendor',
}

export function kindOfId(id: string): FormKind | null {
  const p = id.slice(0, id.indexOf('_'))
  return PREFIX_TO_KIND[p] ?? null
}

export function titleField(kind: FormKind): string {
  return KINDS[kind].fields.find((f) => f.title)?.key ?? 'name'
}

export function propertyKindLabel(value: string): string {
  return PROPERTY_KINDS.find((k) => k.value === value)?.label ?? 'Other'
}

// ── Config (asset categories, tag palette, default reminder lead) ─────────────
// Stored in v0/config.json — the one small, mutable, shared file.

export interface Config {
  /** asset category chips, editable */
  categories: string[]
  /** tag label → palette color key */
  tagColors: Record<string, string>
  /** how far ahead a schedule warns by default, when it sets no explicit lead */
  defaultLead: { n: number; unit: IntervalUnit }
}

export const DEFAULT_CONFIG: Config = {
  categories: ['HVAC', 'Plumbing', 'Electrical', 'Appliance', 'Exterior', 'Safety', 'Vehicle', 'Other'],
  tagColors: {},
  defaultLead: { n: 2, unit: 'week' },
}

// Curated tag colors (map to CSS classes in global.css).
export const TAG_PALETTE = [
  'teal',
  'blue',
  'green',
  'violet',
  'rose',
  'amber',
  'orange',
  'cyan',
] as const
export type TagColor = (typeof TAG_PALETTE)[number]

export function tagColor(label: string, config: Config): TagColor {
  const explicit = config.tagColors[label]
  if (explicit && (TAG_PALETTE as readonly string[]).includes(explicit)) return explicit as TagColor
  // stable hash → palette, so an unassigned tag still gets a consistent color
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length]!
}
