import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { newId } from '../lib/ids'
import { notesForTarget, type NoteRecord } from '../lib/reducer'
import { attachmentUrl, blobsSupported, isImage, putAttachment } from '../lib/blobs'
import { humanBytes } from '../lib/format'
import { ActorStamp, Button, IconButton } from './common'
import { Icon } from './Icon'

export function NoteThread({ targetId }: { targetId: string }) {
  const { state, dispatch } = useStore()
  const notes = notesForTarget(state, targetId)
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function post() {
    const text = body.trim()
    if (!text && !file) return
    setBusy(true)
    try {
      const noteId = newId('note')
      const data: Record<string, unknown> = { target: targetId, body: text }
      if (file && blobsSupported()) {
        const att = await putAttachment(noteId, file)
        data.blobRef = att.blobRef
        data.blobName = att.blobName
        data.blobSize = att.blobSize
      }
      await dispatch({ type: 'note.create', subject: noteId, data })
      setBody('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note — filter size, a quirk, a reminder…"
          rows={2}
          className="w-full resize-y bg-transparent text-sm outline-none"
          style={{ color: 'var(--fg)' }}
        />
        <div className="mt-2 flex items-center gap-2">
          {blobsSupported() && (
            <>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                accept="image/*,application/pdf,.txt"
              />
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Icon name="Paperclip" size={13} /> Attach
              </Button>
            </>
          )}
          {file && (
            <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
              <Icon name="FileText" size={12} />
              {file.name} · {humanBytes(file.size)}
              <button type="button" onClick={() => setFile(null)} aria-label="Remove file">
                <Icon name="X" size={12} />
              </button>
            </span>
          )}
          <div className="ml-auto">
            <Button size="sm" variant="primary" onClick={post} disabled={busy || (!body.trim() && !file)}>
              {busy ? 'Saving…' : 'Add note'}
            </Button>
          </div>
        </div>
        {file && file.size > 4_000_000 && (
          <p className="mt-1 text-[11px]" style={{ color: 'var(--soon)' }}>
            Heads up: attachments sync to everyone and count against storage. Keep them small where you can.
          </p>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="px-1 text-sm" style={{ color: 'var(--muted)' }}>
          No notes yet.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <NoteItem key={n.id} note={n} onArchive={() => void dispatch({ type: 'note.archive', subject: n.id })} />
          ))}
        </div>
      )}
    </div>
  )
}

function NoteItem({ note, onArchive }: { note: NoteRecord; onArchive: () => void }) {
  return (
    <div className="group rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
      <div className="flex items-start justify-between gap-2">
        {note.body ? <p className="whitespace-pre-wrap text-sm">{note.body}</p> : <span />}
        <div className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <IconButton icon="Archive" size={13} onClick={onArchive} title="Archive note" />
        </div>
      </div>
      {note.blobRef && note.blobName && <Attachment blobRef={note.blobRef} name={note.blobName} size={note.blobSize} />}
      <div className="mt-2">
        <ActorStamp actor={note.createdBy} ts={note.createdAt} />
      </div>
    </div>
  )
}

function Attachment({ blobRef, name, size }: { blobRef: string; name: string; size: number | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let revoke: string | null = null
    let alive = true
    attachmentUrl(blobRef, name)
      .then((u) => {
        if (alive) {
          revoke = u
          setUrl(u)
        } else {
          URL.revokeObjectURL(u)
        }
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [blobRef, name])

  const sub = size != null ? ` · ${humanBytes(size)}` : ''

  if (failed) {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
        <Icon name="FileText" size={13} /> {name}
        {sub} (unavailable)
      </div>
    )
  }

  if (url && isImage(name)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-2 block">
        <img src={url} alt={name} className="max-h-56 rounded-md border" style={{ borderColor: 'var(--border)' }} />
      </a>
    )
  }

  return (
    <a
      href={url ?? undefined}
      download={name}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
      style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
    >
      <Icon name="FileText" size={13} /> {name}
      {sub}
      <Icon name="Download" size={12} />
    </a>
  )
}
