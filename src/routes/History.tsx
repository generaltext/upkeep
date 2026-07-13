import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { allServices } from '../lib/reducer'
import { formatDate, formatMoney } from '../lib/format'
import { todayStr } from '../lib/dates'
import { EmptyState, PageHeader } from '../components/common'
import { Icon } from '../components/Icon'

export function History() {
  const { state, version } = useStore()
  void version
  const services = allServices(state)
  const year = todayStr().slice(0, 4)

  const { allTime, thisYear } = useMemo(() => {
    let allTime = 0
    let thisYear = 0
    for (const s of services) {
      allTime += s.cost ?? 0
      if (s.occurredOn.startsWith(year)) thisYear += s.cost ?? 0
    }
    return { allTime, thisYear }
  }, [services, year])

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <PageHeader title="History" icon="History" subtitle={`${services.length} service record${services.length === 1 ? '' : 's'}`} />

      {services.length === 0 ? (
        <EmptyState icon="CalendarDays" title="No history yet" hint="Every service you log across all your systems shows up here, newest first." />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <Stat label={`Spent in ${year}`} value={formatMoney(thisYear)} />
            <Stat label="Spent all-time" value={formatMoney(allTime)} />
          </div>

          <div className="rowlist">
            {services.map((s) => {
              const asset = state.entities[s.assetId]
              const schedule = s.scheduleId ? state.schedules[s.scheduleId] : undefined
              return (
                <Link key={s.id} to={`/e/${s.assetId}`} className="flex items-start gap-3 px-3 py-2.5 text-sm hover:bg-[var(--hover)]" style={{ color: 'var(--fg)' }}>
                  <div className="w-24 shrink-0 pt-0.5 font-medium">{formatDate(s.occurredOn)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="font-medium">{asset ? String(asset.fields.name ?? 'System') : 'System'}</span>
                      {schedule && <span className="text-xs" style={{ color: 'var(--muted)' }}>· {schedule.title}</span>}
                      {s.by && <span className="text-xs" style={{ color: 'var(--muted)' }}>· {s.by}</span>}
                    </div>
                    {s.note && (
                      <div className="mt-0.5 truncate text-xs" style={{ color: 'var(--muted)' }}>
                        {s.note}
                      </div>
                    )}
                  </div>
                  {s.cost != null && <span className="shrink-0 text-xs" style={{ color: 'var(--muted)' }}>{formatMoney(s.cost)}</span>}
                  <Icon name="ChevronRight" size={15} style={{ color: 'var(--muted)' }} />
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
      <div className="text-xs" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold">{value || '$0.00'}</div>
    </div>
  )
}
