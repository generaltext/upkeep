import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { propertyKindLabel } from '../lib/model'
import { assetsForProperty, schedulesForAsset, type EntityRecord } from '../lib/reducer'
import { computeDue, type DueStatus } from '../lib/recurrence'
import { homeTemplateDrafts } from '../lib/templates'
import { Button, StatusPill } from '../components/common'
import { DetailShell, SectionTitle } from '../components/DetailShell'
import { EntityForm } from '../components/EntityForm'
import { FieldsView } from '../components/FieldsView'
import { NoteThread } from '../components/NoteThread'
import { TagEditor } from '../components/TagEditor'
import { Icon } from '../components/Icon'

const RANK: Record<DueStatus, number> = { overdue: 0, soon: 1, upcoming: 2 }

export function PropertyDetail({ entity }: { entity: EntityRecord }) {
  const { state, config, dispatch, version } = useStore()
  void version
  const [addingSystem, setAddingSystem] = useState(false)
  const [seeded, setSeeded] = useState(false)

  const assets = assetsForProperty(state, entity.id)
  const isHome = String(entity.fields.kind ?? '') === 'home'
  const offerTemplate = isHome && assets.length === 0 && !seeded

  async function addTemplate() {
    setSeeded(true)
    await dispatch(homeTemplateDrafts(entity.id))
  }

  return (
    <DetailShell
      entity={entity}
      icon="Home"
      subtitle={propertyKindLabel(String(entity.fields.kind ?? 'other'))}
      extraActions={
        <Button variant="primary" size="sm" onClick={() => setAddingSystem(true)}>
          <Icon name="Plus" size={13} /> System
        </Button>
      }
    >
      <div className="mb-3">
        <TagEditor entity={entity} />
      </div>

      <FieldsView entity={entity} />

      <SectionTitle>Systems</SectionTitle>

      {offerTemplate && (
        <div className="mb-3 rounded-lg border p-4" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
          <div className="flex items-start gap-3">
            <Icon name="Wrench" size={18} style={{ color: 'var(--accent)' }} />
            <div className="flex-1">
              <p className="text-sm font-medium">Start with common home maintenance?</p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
                Adds the usual systems (HVAC, water heater, detectors, gutters, dryer, fridge) with their standard
                recurring tasks. Prune whatever you don't have.
              </p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="primary" onClick={addTemplate}>
                  Add common tasks
                </Button>
                <Button size="sm" onClick={() => setSeeded(true)}>
                  No thanks
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assets.length === 0 ? (
        !offerTemplate && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No systems yet.{' '}
            <button type="button" className="underline" style={{ color: 'var(--accent)' }} onClick={() => setAddingSystem(true)}>
              Add one
            </button>
            .
          </p>
        )
      ) : (
        <div className="rowlist">
          {assets.map((a) => {
            const statuses = schedulesForAsset(state, a.id).map((s) => computeDue(state, config, s).status)
            const worst = statuses.length ? statuses.sort((x, y) => RANK[x] - RANK[y])[0]! : null
            return (
              <Link key={a.id} to={`/e/${a.id}`} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[var(--hover)]" style={{ color: 'var(--fg)' }}>
                <Icon name="Wrench" size={15} style={{ color: 'var(--muted)' }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{String(a.fields.name ?? 'Untitled')}</span>
                    {worst && <StatusPill status={worst} />}
                  </div>
                  {a.fields.category && (
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
                      {String(a.fields.category)}
                    </div>
                  )}
                </div>
                <Icon name="ChevronRight" size={15} style={{ color: 'var(--muted)' }} />
              </Link>
            )
          })}
        </div>
      )}

      <SectionTitle>Notes</SectionTitle>
      <NoteThread targetId={entity.id} />

      {addingSystem && <EntityForm kind="asset" presets={{ propertyId: entity.id }} onClose={() => setAddingSystem(false)} onCreated={() => setAddingSystem(false)} />}
    </DetailShell>
  )
}
