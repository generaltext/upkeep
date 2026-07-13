// Attachments (manuals, receipts, rating-plate photos) are binary blobs under our
// own data/ folder. They sync to every member and count against storage, so the UI
// nudges toward small files. Blob support is feature-detected: some runtimes (older
// shells, certain local-dev workspaces) may not expose readBlob/writeBlob, so we
// degrade gracefully rather than crash.

import { BLOBS_DIR } from './log'

export function blobsSupported(): boolean {
  return typeof window.gt?.writeBlob === 'function' && typeof window.gt?.readBlob === 'function'
}

function sanitize(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(-80) || 'file'
}

export function blobPathFor(noteId: string, filename: string): string {
  return `${BLOBS_DIR}/${noteId}/${sanitize(filename)}`
}

export interface Attachment {
  blobRef: string
  blobName: string
  blobSize: number
}

/** Write a picked file as a blob; returns the metadata to record on the note. */
export async function putAttachment(noteId: string, file: File): Promise<Attachment> {
  const blobRef = blobPathFor(noteId, file.name)
  const bytes = new Uint8Array(await file.arrayBuffer())
  await window.gt.writeBlob(blobRef, bytes)
  return { blobRef, blobName: file.name, blobSize: file.size }
}

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  txt: 'text/plain',
}

export function mimeFor(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  return MIME[ext] ?? 'application/octet-stream'
}

export function isImage(name: string): boolean {
  return mimeFor(name).startsWith('image/')
}

/** Read a blob into an object URL for display/download. Caller must revoke it. */
export async function attachmentUrl(blobRef: string, name: string): Promise<string> {
  const bytes = await window.gt.readBlob(blobRef)
  const blob = new Blob([bytes as BlobPart], { type: mimeFor(name) })
  return URL.createObjectURL(blob)
}
