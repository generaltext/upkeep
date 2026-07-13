import { useState } from 'react'
import { useStore } from '../lib/store'
import { newId } from '../lib/ids'
import { todayStr, type IntervalUnit } from '../lib/dates'
import { Button, Modal } from './common'
import { DateInput, Labeled, NumberInput, Select, TextInput } from './inputs'

const UNIT_OPTIONS: { value: IntervalUnit; label: string }[] = [
  { value: 'day', label: 'days' },
  { value: 'week', label: 'weeks' },
  { value: 'month', label: 'months' },
  { value: 'year', label: 'years' },
]

/** Create or edit a recurring maintenance schedule on an asset. */
export function ScheduleForm({ assetId, id, onClose }: { assetId: string; id?: string; onClose: () => void }) {
  const { state, dispatch, config } = useStore()
  const existing = id ? state.schedules[id] : undefined

  const [title, setTitle] = useState(existing?.title ?? '')
  const [n, setN] = useState(String(existing?.interval.n ?? 3))
  const [unit, setUnit] = useState<IntervalUnit>(existing?.interval.unit ?? 'month')
  const [anchor, setAnchor] = useState(existing?.anchor || todayStr())
  const [customLead, setCustomLead] = useState(!!existing?.lead)
  const [leadN, setLeadN] = useState(String(existing?.lead?.n ?? config.defaultLead.n))
  const [leadUnit, setLeadUnit] = useState<IntervalUnit>(existing?.lead?.unit ?? config.defaultLead.unit)

  const canSave = title.trim().length > 0 && Number(n) > 0

  async function save() {
    if (!canSave) return
    const interval = { n: Math.max(1, Math.trunc(Number(n))), unit }
    const lead = customLead ? { n: Math.max(0, Math.trunc(Number(leadN))), unit: leadUnit } : null
    if (id) {
      await dispatch({ type: 'schedule.update', subject: id, data: { title: title.trim(), interval, anchor, lead } })
    } else {
      await dispatch({
        type: 'schedule.create',
        subject: newId('sch'),
        data: { assetId, title: title.trim(), interval, anchor, ...(lead ? { lead } : {}) },
      })
    }
    onClose()
  }

  return (
    <Modal title={id ? 'Edit schedule' : 'New maintenance schedule'} onClose={onClose}>
      <div className="space-y-4">
        <Labeled label="Task">
          <TextInput value={title} onChange={setTitle} placeholder="e.g. Replace HVAC filter" autoFocus onEnter={save} />
        </Labeled>

        <Labeled label="Repeat every" hint="How often this recurs.">
          <div className="flex gap-2">
            <div className="w-24">
              <NumberInput value={n} onChange={setN} min={1} step={1} />
            </div>
            <div className="flex-1">
              <Select value={unit} onChange={(v) => setUnit(v as IntervalUnit)} options={UNIT_OPTIONS} />
            </div>
          </div>
        </Labeled>

        <Labeled
          label="Starting from"
          hint="The clock starts here until the first service is logged; after that, the last service date drives the next due date."
        >
          <DateInput value={anchor} onChange={setAnchor} />
        </Labeled>

        <div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={customLead} onChange={(e) => setCustomLead(e.target.checked)} />
            <span>Custom reminder lead</span>
            {!customLead && (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                (default: {config.defaultLead.n} {config.defaultLead.unit}
                {config.defaultLead.n === 1 ? '' : 's'} ahead)
              </span>
            )}
          </label>
          {customLead && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Warn
              </span>
              <div className="w-20">
                <NumberInput value={leadN} onChange={setLeadN} min={0} step={1} />
              </div>
              <div className="w-32">
                <Select value={leadUnit} onChange={(v) => setLeadUnit(v as IntervalUnit)} options={UNIT_OPTIONS} />
              </div>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                ahead
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose} variant="ghost">
          Cancel
        </Button>
        <Button onClick={save} variant="primary" disabled={!canSave}>
          {id ? 'Save' : 'Add schedule'}
        </Button>
      </div>
    </Modal>
  )
}
