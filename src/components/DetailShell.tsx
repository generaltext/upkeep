import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { KINDS } from '../lib/model'
import type { EntityRecord } from '../lib/reducer'
import { Button, IconButton, PageHeader } from './common'
import { EntityForm } from './EntityForm'
import { Icon } from './Icon'

/** Standard detail-page chrome: back button, title, edit + archive, extra actions. */
export function DetailShell({
  entity,
  subtitle,
  icon,
  extraActions,
  children,
}: {
  entity: EntityRecord
  subtitle?: ReactNode
  icon?: string
  extraActions?: ReactNode
  children: ReactNode
}) {
  const { dispatch } = useStore()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const def = KINDS[entity.kind]
  const name = String(entity.fields.name ?? '') || `Untitled ${def.singular.toLowerCase()}`

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <PageHeader
        title={name}
        icon={(icon ?? def.icon) as never}
        subtitle={subtitle}
        back={<IconButton icon="ArrowLeft" onClick={() => navigate(-1)} title="Back" />}
        actions={
          <>
            {extraActions}
            <IconButton icon="Pencil" onClick={() => setEditing(true)} title="Edit" />
            {entity.archived ? (
              <IconButton icon="ArchiveRestore" onClick={() => void dispatch({ type: `${entity.kind}.restore`, subject: entity.id })} title="Restore" />
            ) : (
              <IconButton icon="Archive" onClick={() => void dispatch({ type: `${entity.kind}.archive`, subject: entity.id })} title="Archive" />
            )}
          </>
        }
      />

      {entity.archived && (
        <div className="mb-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          <Icon name="Archive" size={14} /> This {def.singular.toLowerCase()} is archived (hidden from lists; history preserved).
          <Button size="sm" onClick={() => void dispatch({ type: `${entity.kind}.restore`, subject: entity.id })}>
            Restore
          </Button>
        </div>
      )}

      {children}

      {editing && <EntityForm kind={entity.kind} id={entity.id} onClose={() => setEditing(false)} />}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        {children}
      </h2>
      {action}
    </div>
  )
}
