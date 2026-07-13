import { useState } from 'react'
import { useStore } from '../lib/store'
import { newId } from '../lib/ids'
import { todayStr } from '../lib/dates'
import { entitiesOfKind, schedulesForAsset } from '../lib/reducer'
import { Button, Modal } from './common'
import { DateInput, Labeled, NumberInput, Select, TextArea } from './inputs'

/** Log a service record against an asset, optionally fulfilling a schedule. */
export function ServiceComposer({
  assetId,
  scheduleId,
  serviceId,
  onClose,
}: {
  assetId: string
  scheduleId?: string
  serviceId?: string
  onClose: () => void
}) {
  const { state, dispatch } = useStore()
  const existing = serviceId ? state.services[serviceId] : undefined
  const schedules = schedulesForAsset(state, assetId)
  const vendors = entitiesOfKind(state, 'vendor')

  const [occurredOn, setOccurredOn] = useState(existing?.occurredOn || todayStr())
  const [schedId, setSchedId] = useState(existing?.scheduleId ?? scheduleId ?? '')
  const [by, setBy] = useState(existing?.by || 'self')
  const [cost, setCost] = useState(existing?.cost != null ? String(existing.cost) : '')
  const [note, setNote] = useState(existing?.note ?? '')

  const scheduleOptions = [
    { value: '', label: 'One-off (no schedule)' },
    ...schedules.map((s) => ({ value: s.id, label: s.title })),
  ]

  async function save() {
    const matchedVendor = vendors.find((v) => String(v.fields.name ?? '').toLowerCase() === by.trim().toLowerCase())
    const data: Record<string, unknown> = {
      assetId,
      occurredOn,
      by: by.trim(),
      note: note.trim(),
      scheduleId: schedId,
    }
    if (cost.trim() !== '') data.cost = Number(cost)
    if (matchedVendor) data.vendorId = matchedVendor.id

    if (serviceId) {
      await dispatch({ type: 'service.update', subject: serviceId, data })
    } else {
      await dispatch({ type: 'service.log', subject: newId('svc'), data })
    }
    onClose()
  }

  return (
    <Modal title={serviceId ? 'Edit service record' : 'Log a service'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Labeled label="Date">
            <DateInput value={occurredOn} onChange={setOccurredOn} />
          </Labeled>
          <Labeled label="Cost">
            <NumberInput value={cost} onChange={setCost} placeholder="optional" min={0} step={0.01} />
          </Labeled>
        </div>

        {schedules.length > 0 && (
          <Labeled label="Fulfills schedule" hint="Logging against a schedule advances its next-due date.">
            <Select value={schedId} onChange={setSchedId} options={scheduleOptions} />
          </Labeled>
        )}

        <Labeled label="Done by">
          <input
            list="svc-vendors"
            value={by}
            onChange={(e) => setBy(e.target.value)}
            placeholder="self, or a contractor"
            className="w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
          />
          <datalist id="svc-vendors">
            <option value="self" />
            {vendors.map((v) => (
              <option key={v.id} value={String(v.fields.name ?? '')} />
            ))}
          </datalist>
        </Labeled>

        <Labeled label="Note">
          <TextArea value={note} onChange={setNote} placeholder="What was done, parts used, observations…" rows={3} />
        </Labeled>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose} variant="ghost">
          Cancel
        </Button>
        <Button onClick={save} variant="primary">
          {serviceId ? 'Save' : 'Log service'}
        </Button>
      </div>
    </Modal>
  )
}
