import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { addInterval, todayStr } from '../lib/dates'
import { formatDate, formatMoney } from '../lib/format'
import { schedulesForAsset, servicesForAsset, type EntityRecord, type ServiceRecord } from '../lib/reducer'
import { computeDue } from '../lib/recurrence'
import { Button, EmptyState, IconButton } from '../components/common'
import { DetailShell, SectionTitle } from '../components/DetailShell'
import { DueCard } from '../components/DueCard'
import { ScheduleForm } from '../components/ScheduleForm'
import { ServiceComposer } from '../components/ServiceComposer'
import { FieldsView } from '../components/FieldsView'
import { NoteThread } from '../components/NoteThread'
import { TagEditor } from '../components/TagEditor'
import { Icon } from '../components/Icon'

export function AssetDetail({ entity }: { entity: EntityRecord }) {
  const { state, config, dispatch, version } = useStore()
  void version

  const [logging, setLogging] = useState<{ scheduleId?: string } | null>(null)
  const [editingService, setEditingService] = useState<string | null>(null)
  const [scheduleForm, setScheduleForm] = useState<{ id?: string } | null>(null)

  const property = state.entities[String(entity.fields.propertyId ?? '')]
  const schedules = schedulesForAsset(state, entity.id)
  const services = servicesForAsset(state, entity.id)
  const totalCost = services.reduce((sum, s) => sum + (s.cost ?? 0), 0)

  function snooze(scheduleId: string) {
    void dispatch({ type: 'schedule.snooze', subject: scheduleId, data: { until: addInterval(todayStr(), { n: 1, unit: 'week' }) } })
  }

  const subtitle = (
    <span className="flex flex-wrap items-center gap-x-2">
      {entity.fields.category && <span>{String(entity.fields.category)}</span>}
      {property && (
        <>
          <span>·</span>
          <Link to={`/e/${property.id}`} className="inline-flex items-center gap-1 hover:underline">
            <Icon name="Home" size={12} /> {String(property.fields.name ?? '')}
          </Link>
        </>
      )}
    </span>
  )

  return (
    <DetailShell
      entity={entity}
      icon="Wrench"
      subtitle={subtitle}
      extraActions={
        <Button variant="primary" size="sm" onClick={() => setLogging({})}>
          <Icon name="Plus" size={13} /> Log service
        </Button>
      }
    >
      <div className="mb-3">
        <TagEditor entity={entity} />
      </div>

      <FieldsView entity={entity} />

      <SectionTitle
        action={
          <Button size="sm" onClick={() => setScheduleForm({})}>
            <Icon name="Plus" size={12} /> Add schedule
          </Button>
        }
      >
        Maintenance schedules
      </SectionTitle>

      {schedules.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          No recurring tasks yet.{' '}
          <button type="button" className="underline" style={{ color: 'var(--accent)' }} onClick={() => setScheduleForm({})}>
            Add a schedule
          </button>{' '}
          so this shows up on your dashboard.
        </p>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <DueCard
              key={s.id}
              item={computeDue(state, config, s)}
              showAsset={false}
              onLogDone={() => setLogging({ scheduleId: s.id })}
              onSnooze={() => snooze(s.id)}
              onEdit={() => setScheduleForm({ id: s.id })}
            />
          ))}
        </div>
      )}

      <SectionTitle
        action={
          totalCost > 0 ? (
            <span className="text-xs font-normal normal-case" style={{ color: 'var(--muted)' }}>
              {formatMoney(totalCost)} total
            </span>
          ) : undefined
        }
      >
        Service history
      </SectionTitle>

      {services.length === 0 ? (
        <EmptyState icon="CalendarDays" title="No service logged" hint="Log a service to start this system's history." />
      ) : (
        <div className="rowlist">
          {services.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              scheduleTitle={s.scheduleId ? state.schedules[s.scheduleId]?.title : undefined}
              onEdit={() => setEditingService(s.id)}
              onVoid={() => void dispatch({ type: 'service.void', subject: s.id })}
            />
          ))}
        </div>
      )}

      <SectionTitle>Notes</SectionTitle>
      <NoteThread targetId={entity.id} />

      {logging && (
        <ServiceComposer
          assetId={entity.id}
          {...(logging.scheduleId ? { scheduleId: logging.scheduleId } : {})}
          onClose={() => setLogging(null)}
        />
      )}
      {editingService && <ServiceComposer assetId={entity.id} serviceId={editingService} onClose={() => setEditingService(null)} />}
      {scheduleForm && <ScheduleForm assetId={entity.id} {...(scheduleForm.id ? { id: scheduleForm.id } : {})} onClose={() => setScheduleForm(null)} />}
    </DetailShell>
  )
}

function ServiceRow({
  service,
  scheduleTitle,
  onEdit,
  onVoid,
}: {
  service: ServiceRecord
  scheduleTitle?: string | undefined
  onEdit: () => void
  onVoid: () => void
}) {
  return (
    <div className="group flex items-start gap-3 px-3 py-2.5 text-sm">
      <div className="w-24 shrink-0 pt-0.5 font-medium">{formatDate(service.occurredOn)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span>{scheduleTitle ?? 'Service'}</span>
          {service.by && (
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              · {service.by}
            </span>
          )}
          {service.cost != null && (
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              · {formatMoney(service.cost)}
            </span>
          )}
        </div>
        {service.note && (
          <div className="mt-0.5 whitespace-pre-wrap text-xs" style={{ color: 'var(--muted)' }}>
            {service.note}
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <IconButton icon="Pencil" size={13} onClick={onEdit} title="Edit" />
        <IconButton icon="Trash2" size={13} onClick={onVoid} title="Void this record" />
      </div>
    </div>
  )
}
