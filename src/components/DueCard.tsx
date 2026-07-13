import { Link } from 'react-router-dom'
import { dueLabel, intervalLabel } from '../lib/dates'
import { formatDate } from '../lib/format'
import type { DueItem } from '../lib/recurrence'
import { STATUS_META, Button, IconButton } from './common'
import { Icon } from './Icon'

export function DueCard({
  item,
  showAsset = true,
  onLogDone,
  onSnooze,
  onEdit,
}: {
  item: DueItem
  showAsset?: boolean
  onLogDone: () => void
  onSnooze: () => void
  onEdit?: () => void
}) {
  const m = STATUS_META[item.status]
  const assetName = String(item.asset?.fields.name ?? 'System')

  return (
    <div
      className="flex flex-col gap-2.5 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-3"
      style={{ borderColor: 'var(--border)', background: 'var(--panel)', borderLeft: `3px solid ${m.fg}` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{item.schedule.title}</span>
          {showAsset && item.asset && (
            <Link to={`/e/${item.asset.id}`} className="inline-flex items-center gap-1 text-sm hover:underline" style={{ color: 'var(--muted)' }}>
              <Icon name="Wrench" size={12} /> {assetName}
            </Link>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs" style={{ color: 'var(--muted)' }}>
          <span style={{ color: m.fg, fontWeight: 500 }}>{dueLabel(item.effectiveDue)}</span>
          <span>·</span>
          <span>{intervalLabel(item.schedule.interval)}</span>
          <span>·</span>
          <span>{item.lastDone ? `last ${formatDate(item.lastDone)}` : 'never logged'}</span>
          {item.snoozed && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="BellOff" size={11} /> snoozed
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1.5">
        {onEdit && <IconButton icon="Pencil" size={13} onClick={onEdit} title="Edit schedule" />}
        <Button size="sm" onClick={onSnooze} title="Snooze the reminder">
          <Icon name="BellOff" size={13} /> Snooze
        </Button>
        <Button size="sm" variant="primary" onClick={onLogDone}>
          <Icon name="Check" size={13} /> Log done
        </Button>
      </div>
    </div>
  )
}
