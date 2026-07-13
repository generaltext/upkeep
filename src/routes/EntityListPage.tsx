import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { KINDS, propertyKindLabel, type FormKind } from '../lib/model'
import {
  assetsForProperty,
  entitiesOfKind,
  schedulesForAsset,
  type EntityRecord,
} from '../lib/reducer'
import { computeDue, type DueStatus } from '../lib/recurrence'
import { Button, EmptyState, PageHeader, StatusPill } from '../components/common'
import { EntityForm } from '../components/EntityForm'
import { Icon } from '../components/Icon'
import { TagChip } from '../components/TagEditor'

const RANK: Record<DueStatus, number> = { overdue: 0, soon: 1, upcoming: 2 }

export function EntityListPage({ kind }: { kind: FormKind }) {
  const { state, config, version } = useStore()
  void version
  const def = KINDS[kind]
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')

  const all = entitiesOfKind(state, kind)
  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase()
    if (!ql) return all
    return all.filter((e) =>
      def.fields.some((f) => String(e.fields[f.key] ?? '').toLowerCase().includes(ql)),
    )
  }, [all, q, def])

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <PageHeader
        title={def.plural}
        icon={def.icon as never}
        subtitle={`${all.length} ${all.length === 1 ? def.singular.toLowerCase() : def.plural.toLowerCase()}`}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Icon name="Plus" size={14} /> New {def.singular.toLowerCase()}
          </Button>
        }
      />

      {all.length > 5 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Filter ${def.plural.toLowerCase()}…`}
          className="mb-3 w-full rounded-md border px-3 py-1.5 text-sm outline-none"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
      )}

      {all.length === 0 ? (
        <EmptyState
          icon={def.icon as never}
          title={`No ${def.plural.toLowerCase()} yet`}
          hint={hintFor(kind)}
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Icon name="Plus" size={14} /> New {def.singular.toLowerCase()}
            </Button>
          }
        />
      ) : (
        <div className="rowlist">
          {rows.map((e) => (
            <Row key={e.id} entity={e} kind={kind} state={state} config={config} />
          ))}
          {rows.length === 0 && (
            <div className="px-3 py-4 text-sm" style={{ color: 'var(--muted)' }}>
              No matches.
            </div>
          )}
        </div>
      )}

      {creating && <EntityForm kind={kind} onClose={() => setCreating(false)} />}
    </div>
  )
}

function Row({
  entity,
  kind,
  state,
  config,
}: {
  entity: EntityRecord
  kind: FormKind
  state: ReturnType<typeof useStore>['state']
  config: ReturnType<typeof useStore>['config']
}) {
  const name = String(entity.fields.name ?? '') || `Untitled ${KINDS[kind].singular.toLowerCase()}`

  let sub = ''
  let pill: DueStatus | null = null

  if (kind === 'property') {
    const count = assetsForProperty(state, entity.id).length
    sub = `${propertyKindLabel(String(entity.fields.kind ?? 'other'))} · ${count} system${count === 1 ? '' : 's'}`
  } else if (kind === 'asset') {
    const cat = String(entity.fields.category ?? '')
    const prop = state.entities[String(entity.fields.propertyId ?? '')]
    sub = [cat, prop ? String(prop.fields.name ?? '') : ''].filter(Boolean).join(' · ')
    const statuses = schedulesForAsset(state, entity.id).map((s) => computeDue(state, config, s).status)
    if (statuses.length) pill = statuses.sort((a, b) => RANK[a] - RANK[b])[0]!
  } else {
    sub = [String(entity.fields.trade ?? ''), String(entity.fields.phone ?? '')].filter(Boolean).join(' · ')
  }

  return (
    <Link to={`/e/${entity.id}`} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[var(--hover)]" style={{ color: 'var(--fg)' }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{name}</span>
          {pill && <StatusPill status={pill} />}
          {entity.tags.slice(0, 3).map((t) => (
            <TagChip key={t} label={t} />
          ))}
        </div>
        {sub && (
          <div className="mt-0.5 truncate text-xs" style={{ color: 'var(--muted)' }}>
            {sub}
          </div>
        )}
      </div>
      <Icon name="ChevronRight" size={15} style={{ color: 'var(--muted)' }} />
    </Link>
  )
}

function hintFor(kind: FormKind): string {
  if (kind === 'property') return 'A property is the top-level container: your home, a rental, a vehicle. Systems and service records hang off it.'
  if (kind === 'asset') return 'A system is anything you maintain — a furnace, water heater, roof, appliance, or a car. Add one to a property.'
  return 'Keep contractors and companies here so you can attach them to service records.'
}
