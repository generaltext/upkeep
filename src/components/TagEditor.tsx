import { useState } from 'react'
import { useStore } from '../lib/store'
import { tagColor } from '../lib/model'
import type { EntityRecord } from '../lib/reducer'
import { Icon } from './Icon'

export function TagChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  const { config } = useStore()
  return (
    <span className={`tag tag-${tagColor(label, config)}`}>
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove} className="opacity-60 hover:opacity-100" aria-label={`Remove ${label}`}>
          <Icon name="X" size={11} />
        </button>
      )}
    </span>
  )
}

export function TagEditor({ entity }: { entity: EntityRecord }) {
  const { dispatch } = useStore()
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')

  async function add() {
    const label = value.trim().toLowerCase()
    if (!label) return
    await dispatch({ type: 'tag.add', subject: entity.id, data: { label } })
    setValue('')
    setAdding(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {entity.tags.map((t) => (
        <TagChip
          key={t}
          label={t}
          onRemove={() => void dispatch({ type: 'tag.remove', subject: entity.id, data: { label: t } })}
        />
      ))}
      {adding ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => (value.trim() ? void add() : setAdding(false))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void add()
            if (e.key === 'Escape') setAdding(false)
          }}
          placeholder="tag…"
          className="rounded-full border px-2 py-0.5 text-xs outline-none"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)', width: 80 }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        >
          <Icon name="Plus" size={11} /> Tag
        </button>
      )}
    </div>
  )
}
