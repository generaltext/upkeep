import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { KINDS, type FormKind } from '../lib/model'
import { Icon, type IconName } from './Icon'
import { EntityForm } from './EntityForm'

interface Item {
  key: string
  label: string
  icon: IconName
  sub?: string
  run: () => void
}

const CREATE_KINDS: FormKind[] = ['property', 'asset', 'vendor']

export function CommandBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [creating, setCreating] = useState<FormKind | null>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      setCreating(null)
    }
  }, [open])

  const items = useMemo<Item[]>(() => {
    const ql = q.trim().toLowerCase()
    const actions: Item[] = CREATE_KINDS.map((k) => ({
      key: `new-${k}`,
      label: `New ${KINDS[k].singular.toLowerCase()}`,
      icon: KINDS[k].icon as IconName,
      run: () => setCreating(k),
    })).filter((a) => ql === '' || a.label.toLowerCase().includes(ql))

    const ents: Item[] =
      ql === ''
        ? []
        : Object.values(state.entities)
            .filter((e) => !e.archived)
            .map((e) => ({ e, title: String(e.fields.name ?? '') }))
            .filter((x) => x.title.toLowerCase().includes(ql))
            .slice(0, 8)
            .map(({ e, title }) => ({
              key: e.id,
              label: title || `Untitled ${KINDS[e.kind].singular}`,
              icon: KINDS[e.kind].icon as IconName,
              sub: KINDS[e.kind].singular,
              run: () => {
                onClose()
                navigate(`/e/${e.id}`)
              },
            }))

    return [...actions, ...ents]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, state, navigate])

  if (!open) return null

  if (creating) {
    return (
      <EntityForm
        kind={creating}
        onClose={() => {
          setCreating(null)
          onClose()
        }}
        onCreated={(id) => navigate(`/e/${id}`)}
      />
    )
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return onClose()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      items[active]?.run()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]" onClick={onClose} style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3" style={{ borderColor: 'var(--border)' }}>
          <Icon name="Search" size={16} style={{ color: 'var(--muted)' }} />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder='Search or create… (try "new system")'
            className="flex-1 bg-transparent py-3 text-sm outline-none"
          />
        </div>

        <ul className="max-h-80 overflow-auto py-1">
          {items.length === 0 && (
            <li className="px-3 py-3 text-sm" style={{ color: 'var(--muted)' }}>
              No matches.
            </li>
          )}
          {items.map((it, i) => (
            <li key={it.key}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={it.run}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm"
                style={{ background: i === active ? 'var(--hover)' : 'transparent' }}
              >
                <Icon name={it.icon} size={16} style={{ color: 'var(--muted)' }} />
                <span className="flex-1 truncate">{it.label}</span>
                {it.sub && (
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    {it.sub}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
