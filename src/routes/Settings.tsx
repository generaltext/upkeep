import { useState } from 'react'
import { useStore } from '../lib/store'
import { dueForState } from '../lib/recurrence'
import { buildIcs } from '../lib/ics'
import { ICS_PATH } from '../lib/log'
import type { IntervalUnit } from '../lib/dates'
import { Button, Card, PageHeader } from '../components/common'
import { NumberInput, Select } from '../components/inputs'
import { Icon } from '../components/Icon'

const UNIT_OPTIONS: { value: IntervalUnit; label: string }[] = [
  { value: 'day', label: 'days' },
  { value: 'week', label: 'weeks' },
  { value: 'month', label: 'months' },
  { value: 'year', label: 'years' },
]

export function Settings() {
  const { state, config, saveConfig, version } = useStore()
  void version
  const [newCat, setNewCat] = useState('')
  const [exported, setExported] = useState<string | null>(null)

  const scheduleCount = dueForState(state, config).length

  function addCategory() {
    const c = newCat.trim()
    if (!c || config.categories.includes(c)) return setNewCat('')
    void saveConfig({ ...config, categories: [...config.categories, c] })
    setNewCat('')
  }

  function removeCategory(c: string) {
    void saveConfig({ ...config, categories: config.categories.filter((x) => x !== c) })
  }

  function setLead(patch: Partial<{ n: number; unit: IntervalUnit }>) {
    void saveConfig({ ...config, defaultLead: { ...config.defaultLead, ...patch } })
  }

  function exportIcs() {
    const ics = buildIcs(state, config, new Date().toISOString())
    // Offer a download…
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'upkeep.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    // …and also save it into the workspace so it syncs.
    void window.gt.writeFile(ICS_PATH, ics).then(
      () => setExported(`Saved ${scheduleCount} event${scheduleCount === 1 ? '' : 's'} to ${ICS_PATH} and downloaded upkeep.ics.`),
      () => setExported('Downloaded upkeep.ics.'),
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <PageHeader title="Settings" icon="Settings" />

      <div className="space-y-5">
        <Card>
          <h2 className="text-sm font-semibold">System categories</h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            Suggested when you add or edit a system.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {config.categories.map((c) => (
              <span key={c} className="tag tag-teal">
                {c}
                <button type="button" onClick={() => removeCategory(c)} aria-label={`Remove ${c}`} className="opacity-60 hover:opacity-100">
                  <Icon name="X" size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              placeholder="Add a category…"
              className="w-52 rounded-md border px-2.5 py-1.5 text-sm outline-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
            <Button onClick={addCategory}>
              <Icon name="Plus" size={13} /> Add
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Default reminder lead</h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            How far ahead a task counts as “due soon” on the dashboard, unless a schedule sets its own.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              Warn
            </span>
            <div className="w-20">
              <NumberInput value={String(config.defaultLead.n)} onChange={(v) => setLead({ n: Math.max(0, Math.trunc(Number(v))) })} min={0} step={1} />
            </div>
            <div className="w-32">
              <Select value={config.defaultLead.unit} onChange={(v) => setLead({ unit: v as IntervalUnit })} options={UNIT_OPTIONS} />
            </div>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              ahead
            </span>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Calendar export</h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            Upkeep can't send reminders on its own (no backend, by design). Instead, export your schedules as an{' '}
            <code>.ics</code> feed and subscribe to it in Apple/Google Calendar — reminders fire where you already
            look. Re-export after logging work to refresh the dates.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary" onClick={exportIcs} disabled={scheduleCount === 0}>
              <Icon name="Download" size={13} /> Export {scheduleCount > 0 ? `${scheduleCount} ` : ''}schedule{scheduleCount === 1 ? '' : 's'}
            </Button>
          </div>
          {exported && (
            <p className="mt-2 text-xs" style={{ color: 'var(--ok)' }}>
              {exported}
            </p>
          )}
          {scheduleCount === 0 && (
            <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
              Add some maintenance schedules first.
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
