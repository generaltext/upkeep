import { useState } from 'react'
import { useStore } from '../lib/store'
import { addInterval, todayStr } from '../lib/dates'
import { bucketize, dueForState, type DueItem } from '../lib/recurrence'
import { entitiesOfKind } from '../lib/reducer'
import { Button, EmptyState, PageHeader, STATUS_META } from '../components/common'
import { DueCard } from '../components/DueCard'
import { EntityForm } from '../components/EntityForm'
import { ServiceComposer } from '../components/ServiceComposer'
import { Icon } from '../components/Icon'

export function Dashboard() {
  const { state, config, dispatch, version } = useStore()
  void version

  const [logging, setLogging] = useState<{ assetId: string; scheduleId: string } | null>(null)
  const [newProperty, setNewProperty] = useState(false)

  const items = dueForState(state, config)
  const { overdue, soon, upcoming } = bucketize(items)
  const properties = entitiesOfKind(state, 'property')
  const assets = entitiesOfKind(state, 'asset')

  function snooze(item: DueItem) {
    const until = addInterval(todayStr(), { n: 1, unit: 'week' })
    void dispatch({ type: 'schedule.snooze', subject: item.schedule.id, data: { until } })
  }

  const logDone = (item: DueItem) => setLogging({ assetId: item.schedule.assetId, scheduleId: item.schedule.id })

  // ── Onboarding: no properties yet ──
  if (properties.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <PageHeader title="Dashboard" icon="Gauge" />
        <EmptyState
          icon="Home"
          title="Start your home log"
          hint="Add a property — your home, a rental, a car — then add the systems you maintain and the tasks that recur. Upkeep tracks what's due and keeps a service history you own forever."
          action={
            <Button variant="primary" onClick={() => setNewProperty(true)}>
              <Icon name="Plus" size={14} /> Add a property
            </Button>
          }
        />
        {newProperty && <EntityForm kind="property" onClose={() => setNewProperty(false)} />}
      </div>
    )
  }

  const caughtUp = overdue.length === 0 && soon.length === 0

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <PageHeader
        title="Dashboard"
        icon="Gauge"
        subtitle={
          items.length === 0
            ? 'No recurring maintenance scheduled yet.'
            : `${overdue.length} overdue · ${soon.length} due soon · ${upcoming.length} upcoming`
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon="CalendarClock"
          title="No maintenance scheduled"
          hint={
            assets.length === 0
              ? 'Add a system to one of your properties, then set up the tasks that recur (filter changes, flushes, inspections).'
              : 'Open one of your systems and add a recurring task, and it will start showing up here.'
          }
        />
      ) : (
        <div className="space-y-6">
          {caughtUp && (
            <div
              className="flex items-center gap-2 rounded-lg border p-3 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--ok-soft)', color: 'var(--ok)' }}
            >
              <Icon name="CircleCheck" size={16} /> You're all caught up. Nothing due right now.
            </div>
          )}

          {overdue.length > 0 && <Bucket title="Overdue" color={STATUS_META.overdue.fg} items={overdue} onLog={logDone} onSnooze={snooze} />}
          {soon.length > 0 && <Bucket title="Due soon" color={STATUS_META.soon.fg} items={soon} onLog={logDone} onSnooze={snooze} />}
          {upcoming.length > 0 && <Bucket title="Upcoming" color={STATUS_META.upcoming.fg} items={upcoming} onLog={logDone} onSnooze={snooze} />}
        </div>
      )}

      {logging && (
        <ServiceComposer assetId={logging.assetId} scheduleId={logging.scheduleId} onClose={() => setLogging(null)} />
      )}
      {newProperty && <EntityForm kind="property" onClose={() => setNewProperty(false)} />}
    </div>
  )
}

function Bucket({
  title,
  color,
  items,
  onLog,
  onSnooze,
}: {
  title: string
  color: string
  items: DueItem[]
  onLog: (i: DueItem) => void
  onSnooze: (i: DueItem) => void
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color }}>
        {title}
        <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: 'var(--hover)', color: 'var(--muted)' }}>
          {items.length}
        </span>
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <DueCard key={item.schedule.id} item={item} onLogDone={() => onLog(item)} onSnooze={() => onSnooze(item)} />
        ))}
      </div>
    </section>
  )
}
