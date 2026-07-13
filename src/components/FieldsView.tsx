import { useState } from 'react'
import { KINDS, propertyKindLabel } from '../lib/model'
import { formatDate, formatMoney } from '../lib/format'
import type { EntityRecord } from '../lib/reducer'
import { Icon } from './Icon'

function displayValue(key: string, type: string, raw: string | number): string {
  if (raw === '' || raw == null) return ''
  if (type === 'date') return formatDate(String(raw))
  if (type === 'money') return formatMoney(Number(raw))
  if (key === 'kind') return propertyKindLabel(String(raw))
  return String(raw)
}

/** Copyable identifier-ish fields (serial/model numbers you actually paste). */
const COPYABLE = new Set(['serial', 'model', 'spec', 'email', 'phone'])

export function FieldsView({ entity }: { entity: EntityRecord }) {
  const def = KINDS[entity.kind]
  const rows = def.fields.filter((f) => !f.title && f.key !== 'notes' && String(entity.fields[f.key] ?? '') !== '')
  const notes = String(entity.fields.notes ?? '')

  if (rows.length === 0 && !notes) {
    return (
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        No details yet. Use Edit to add make, model, serial, and dates.
      </p>
    )
  }

  return (
    <div>
      {rows.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {rows.map((f) => (
            <div key={f.key} className="contents">
              <dt className="py-0.5" style={{ color: 'var(--muted)' }}>
                {f.label}
              </dt>
              <dd className="py-0.5">
                <ValueCell text={displayValue(f.key, f.type, entity.fields[f.key]!)} copyable={COPYABLE.has(f.key)} isUrl={f.key === 'url'} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {notes && (
        <p className="mt-3 whitespace-pre-wrap border-t pt-3 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}>
          {notes}
        </p>
      )}
    </div>
  )
}

function ValueCell({ text, copyable, isUrl }: { text: string; copyable: boolean; isUrl: boolean }) {
  const [copied, setCopied] = useState(false)

  if (isUrl) {
    const href = text.startsWith('http') ? text : `https://${text}`
    return (
      <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline" style={{ color: 'var(--accent)' }}>
        {text} <Icon name="ExternalLink" size={12} />
      </a>
    )
  }

  if (!copyable) return <span>{text}</span>

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className="group inline-flex items-center gap-1.5 font-mono text-[13px]"
      title="Copy"
    >
      {text}
      <Icon name={copied ? 'Check' : 'Copy'} size={11} style={{ color: 'var(--muted)', opacity: copied ? 1 : 0 }} className="group-hover:opacity-100" />
    </button>
  )
}
