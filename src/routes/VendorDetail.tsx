import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { allServices, type EntityRecord } from '../lib/reducer'
import { formatDate, formatMoney } from '../lib/format'
import { DetailShell, SectionTitle } from '../components/DetailShell'
import { FieldsView } from '../components/FieldsView'
import { NoteThread } from '../components/NoteThread'
import { TagEditor } from '../components/TagEditor'
import { Icon } from '../components/Icon'

export function VendorDetail({ entity }: { entity: EntityRecord }) {
  const { state, version } = useStore()
  void version

  const services = allServices(state).filter((s) => s.vendorId === entity.id)
  const total = services.reduce((sum, s) => sum + (s.cost ?? 0), 0)

  return (
    <DetailShell entity={entity} icon="Phone" subtitle={String(entity.fields.trade ?? '')}>
      <div className="mb-3">
        <TagEditor entity={entity} />
      </div>

      <FieldsView entity={entity} />

      <SectionTitle
        action={
          total > 0 ? (
            <span className="text-xs font-normal normal-case" style={{ color: 'var(--muted)' }}>
              {formatMoney(total)} total
            </span>
          ) : undefined
        }
      >
        Service history
      </SectionTitle>

      {services.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          No service records attribute work to this contact yet. Set “Done by” to their name when you log a service.
        </p>
      ) : (
        <div className="rowlist">
          {services.map((s) => {
            const asset = state.entities[s.assetId]
            return (
              <Link key={s.id} to={`/e/${s.assetId}`} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[var(--hover)]" style={{ color: 'var(--fg)' }}>
                <div className="w-24 shrink-0 font-medium">{formatDate(s.occurredOn)}</div>
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{asset ? String(asset.fields.name ?? 'System') : 'System'}</span>
                  {s.note && (
                    <div className="mt-0.5 truncate text-xs" style={{ color: 'var(--muted)' }}>
                      {s.note}
                    </div>
                  )}
                </div>
                {s.cost != null && <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatMoney(s.cost)}</span>}
                <Icon name="ChevronRight" size={15} style={{ color: 'var(--muted)' }} />
              </Link>
            )
          })}
        </div>
      )}

      <SectionTitle>Notes</SectionTitle>
      <NoteThread targetId={entity.id} />
    </DetailShell>
  )
}
