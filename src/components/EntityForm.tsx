import { useState } from 'react'
import { useStore } from '../lib/store'
import { KINDS, titleField, type FieldDef, type FormKind } from '../lib/model'
import { newId } from '../lib/ids'
import { entitiesOfKind } from '../lib/reducer'
import { Button, Modal } from './common'
import { DateInput, Labeled, NumberInput, Select, TextArea, TextInput } from './inputs'

type Values = Record<string, string>

/**
 * Create or edit a field-driven record (property / asset / vendor). Fields render
 * from the model registry; `presets` seeds hidden fields like an asset's propertyId.
 */
export function EntityForm({
  kind,
  id,
  presets,
  onClose,
  onCreated,
}: {
  kind: FormKind
  id?: string
  presets?: Record<string, string | number>
  onClose: () => void
  onCreated?: (id: string) => void
}) {
  const { state, dispatch, config } = useStore()
  const def = KINDS[kind]
  const existing = id ? state.entities[id] : undefined

  const [values, setValues] = useState<Values>(() => {
    const v: Values = {}
    for (const f of def.fields) {
      const raw = existing?.fields[f.key]
      v[f.key] = raw == null ? '' : String(raw)
    }
    return v
  })

  const set = (k: string, val: string) => setValues((prev) => ({ ...prev, [k]: val }))
  const titleKey = titleField(kind)

  // Assets belong to a property. When one isn't preset (e.g. created from the
  // command bar), offer a picker seeded to the existing/most-recent property.
  const properties = kind === 'asset' && !existing && !presets?.propertyId ? entitiesOfKind(state, 'property') : []
  const showPropertyPicker = properties.length > 0
  const [propertyId, setPropertyId] = useState(
    String(existing?.fields.propertyId ?? presets?.propertyId ?? properties[0]?.id ?? ''),
  )

  const canSave = (values[titleKey] ?? '').trim().length > 0

  async function save() {
    if (!canSave) return
    const data: Record<string, string | number> = { ...(presets ?? {}) }
    if (showPropertyPicker && propertyId) data.propertyId = propertyId
    for (const f of def.fields) {
      const raw = (values[f.key] ?? '').trim()
      if (raw === '') continue
      data[f.key] = f.type === 'money' || f.type === 'number' ? Number(raw) : raw
    }
    if (id) {
      // send blanked fields too, so clearing a value persists (LWW to '')
      for (const f of def.fields) {
        if ((values[f.key] ?? '').trim() === '' && existing?.fields[f.key] != null) data[f.key] = ''
      }
      await dispatch({ type: `${kind}.update`, subject: id, data })
      onClose()
    } else {
      const newid = newId(def.prefix)
      await dispatch({ type: `${kind}.create`, subject: newid, data })
      onClose()
      onCreated?.(newid)
    }
  }

  return (
    <Modal title={`${id ? 'Edit' : 'New'} ${def.singular.toLowerCase()}`} onClose={onClose} wide>
      {showPropertyPicker && (
        <div className="mb-4">
          <Labeled label="Property">
            <Select
              value={propertyId}
              onChange={setPropertyId}
              options={properties.map((p) => ({ value: p.id, label: String(p.fields.name ?? 'Untitled') }))}
            />
          </Labeled>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {def.fields.map((f) => (
          <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <FieldInput def={f} value={values[f.key] ?? ''} onChange={(v) => set(f.key, v)} categories={config.categories} />
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose} variant="ghost">
          Cancel
        </Button>
        <Button onClick={save} variant="primary" disabled={!canSave}>
          {id ? 'Save' : `Create ${def.singular.toLowerCase()}`}
        </Button>
      </div>
    </Modal>
  )
}

function FieldInput({
  def,
  value,
  onChange,
  categories,
}: {
  def: FieldDef
  value: string
  onChange: (v: string) => void
  categories: string[]
}) {
  if (def.type === 'textarea') {
    return (
      <Labeled label={def.label}>
        <TextArea value={value} onChange={onChange} placeholder={def.placeholder ?? ''} />
      </Labeled>
    )
  }
  if (def.type === 'select') {
    return (
      <Labeled label={def.label}>
        <Select value={value || (def.options?.[0]?.value ?? '')} onChange={onChange} options={def.options ?? []} />
      </Labeled>
    )
  }
  if (def.type === 'category') {
    const listId = `cat-${def.key}`
    return (
      <Labeled label={def.label}>
        <input
          list={listId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. HVAC"
          className="w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <datalist id={listId}>
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Labeled>
    )
  }
  if (def.type === 'date') {
    return (
      <Labeled label={def.label}>
        <DateInput value={value} onChange={onChange} />
      </Labeled>
    )
  }
  if (def.type === 'money') {
    return (
      <Labeled label={def.label}>
        <NumberInput value={value} onChange={onChange} placeholder="0.00" min={0} step={0.01} />
      </Labeled>
    )
  }
  if (def.type === 'number') {
    return (
      <Labeled label={def.label}>
        <NumberInput value={value} onChange={onChange} placeholder={def.placeholder ?? '0'} />
      </Labeled>
    )
  }
  return (
    <Labeled label={def.label}>
      <TextInput value={value} onChange={onChange} placeholder={def.placeholder ?? ''} />
    </Labeled>
  )
}
