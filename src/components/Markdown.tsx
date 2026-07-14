import { useMemo, type ReactNode } from 'react'

// A small, self-contained Markdown renderer. It builds React elements directly (never
// dangerouslySetInnerHTML), so untrusted note text can't inject markup or script — and
// it needs no parser/sanitizer dependency, which suits the no-network app sandbox. It
// covers the everyday set: headings, bold/italic, inline + fenced code, links (scheme-
// guarded), blockquotes, bullet/numbered lists (nested), and GFM task lists.

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'hr' }
  | { kind: 'quote'; children: Block[] }
  | { kind: 'list'; ordered: boolean; items: Block[][] }

const FENCE_RE = /^ {0,3}```/
const HEADING_RE = /^(#{1,6})\s+(.*)$/
const HR_RE = /^ {0,3}([-*_])( *\1){2,} *$/
const QUOTE_RE = /^ {0,3}>/
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/

function indentOf(line: string): number {
  return /^ */.exec(line)![0].length
}

function isBlockStart(line: string): boolean {
  return FENCE_RE.test(line) || HEADING_RE.test(line) || HR_RE.test(line) || QUOTE_RE.test(line) || LIST_RE.test(line)
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    if (line.trim() === '') {
      i++
      continue
    }

    if (FENCE_RE.test(line)) {
      const body: string[] = []
      i++
      while (i < lines.length && !FENCE_RE.test(lines[i]!)) body.push(lines[i++]!)
      i++ // closing fence
      blocks.push({ kind: 'code', text: body.join('\n') })
      continue
    }

    const h = HEADING_RE.exec(line)
    if (h) {
      blocks.push({ kind: 'heading', level: h[1]!.length, text: h[2]! })
      i++
      continue
    }

    if (HR_RE.test(line)) {
      blocks.push({ kind: 'hr' })
      i++
      continue
    }

    if (QUOTE_RE.test(line)) {
      const inner: string[] = []
      while (i < lines.length && QUOTE_RE.test(lines[i]!)) inner.push(lines[i++]!.replace(/^ {0,3}> ?/, ''))
      blocks.push({ kind: 'quote', children: parseBlocks(inner) })
      continue
    }

    if (LIST_RE.test(line)) {
      const { node, next } = parseList(lines, i)
      blocks.push(node)
      i = next
      continue
    }

    const para: string[] = []
    while (i < lines.length && lines[i]!.trim() !== '' && !isBlockStart(lines[i]!)) para.push(lines[i++]!.trim())
    blocks.push({ kind: 'p', text: para.join('\n') })
  }
  return blocks
}

function parseList(lines: string[], start: number): { node: Block; next: number } {
  const first = LIST_RE.exec(lines[start]!)!
  const baseIndent = first[1]!.length
  const ordered = /\d/.test(first[2]!)
  const childIndent = baseIndent + 2
  const items: Block[][] = []
  let i = start

  while (i < lines.length) {
    const m = LIST_RE.exec(lines[i]!)
    if (m && m[1]!.length === baseIndent) {
      const itemLines = [m[3]!]
      i++
      while (i < lines.length) {
        if (lines[i]!.trim() === '') {
          let j = i + 1
          while (j < lines.length && lines[j]!.trim() === '') j++
          if (j < lines.length && indentOf(lines[j]!) >= childIndent) {
            itemLines.push('')
            i = j
            continue
          }
          break
        }
        const li = LIST_RE.exec(lines[i]!)
        if (li && li[1]!.length === baseIndent) break // next sibling
        if (indentOf(lines[i]!) >= baseIndent + 1) {
          itemLines.push(lines[i]!.slice(Math.min(childIndent, indentOf(lines[i]!))))
          i++
          continue
        }
        break
      }
      items.push(parseBlocks(itemLines))
      continue
    }
    break
  }
  return { node: { kind: 'list', ordered, items }, next: i }
}

// ── inline ─────────────────────────────────────────────────────────────────────

const INLINE = [
  { type: 'code', re: /`([^`]+)`/ },
  { type: 'strong', re: /\*\*([^*]+?)\*\*|__([^_]+?)__/ },
  { type: 'em', re: /\*([^*]+?)\*|_([^_]+?)_/ },
  { type: 'link', re: /\[([^\]]*)\]\(([^)\s]+)\)/ },
] as const

function safeHref(url: string): string | undefined {
  return /^(https?:|mailto:)/i.test(url) ? url : undefined
}

function renderInline(text: string, key: string): ReactNode[] {
  if (!text) return []
  let best: { type: string; m: RegExpExecArray } | null = null
  for (const p of INLINE) {
    const m = p.re.exec(text)
    if (m && (best === null || m.index < best.m.index)) best = { type: p.type, m }
  }
  if (!best) return [text]

  const { m } = best
  const out: ReactNode[] = []
  if (m.index > 0) out.push(text.slice(0, m.index))
  const k = `${key}-${m.index}`

  if (best.type === 'code') {
    out.push(
      <code key={k} className="rounded bg-[var(--hover)] px-1 py-0.5 font-mono text-[0.85em]">
        {m[1]}
      </code>,
    )
  } else if (best.type === 'strong') {
    out.push(<strong key={k}>{renderInline(m[1] ?? m[2] ?? '', k)}</strong>)
  } else if (best.type === 'em') {
    out.push(<em key={k}>{renderInline(m[1] ?? m[2] ?? '', k)}</em>)
  } else {
    const href = safeHref(m[2] ?? '')
    out.push(
      href ? (
        <a key={k} href={href} target="_blank" rel="noreferrer noopener" className="underline" style={{ color: 'var(--accent)' }}>
          {renderInline(m[1] ?? '', k)}
        </a>
      ) : (
        <span key={k}>{m[1] ?? ''}</span>
      ),
    )
  }

  out.push(...renderInline(text.slice(m.index + m[0].length), `${k}r`))
  return out
}

/** Soft line breaks inside a paragraph render as <br> (friendlier for a notes field). */
function renderMultiline(text: string, key: string): ReactNode[] {
  const parts = text.split('\n')
  const out: ReactNode[] = []
  parts.forEach((line, idx) => {
    if (idx > 0) out.push(<br key={`${key}-br${idx}`} />)
    out.push(...renderInline(line, `${key}-${idx}`))
  })
  return out
}

const TASK_RE = /^\[([ xX])\]\s+(.*)$/

function renderBlocks(blocks: Block[], key: string): ReactNode {
  return blocks.map((b, idx) => renderBlock(b, `${key}-${idx}`))
}

function renderBlock(b: Block, key: string): ReactNode {
  switch (b.kind) {
    case 'heading': {
      const cls =
        b.level <= 1
          ? 'text-base font-semibold'
          : b.level === 2
            ? 'text-sm font-semibold'
            : 'text-xs font-semibold uppercase tracking-wide'
      const Tag = (b.level <= 1 ? 'h3' : b.level === 2 ? 'h4' : 'h5') as 'h3' | 'h4' | 'h5'
      return (
        <Tag key={key} className={cls}>
          {renderInline(b.text, key)}
        </Tag>
      )
    }
    case 'code':
      return (
        <pre key={key} className="overflow-x-auto rounded-md p-2 font-mono text-xs" style={{ background: 'var(--hover)' }}>
          <code>{b.text}</code>
        </pre>
      )
    case 'hr':
      return <hr key={key} style={{ borderColor: 'var(--border)' }} />
    case 'quote':
      return (
        <blockquote key={key} className="border-l-2 pl-3" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          {renderBlocks(b.children, key)}
        </blockquote>
      )
    case 'list': {
      const Tag = (b.ordered ? 'ol' : 'ul') as 'ol' | 'ul'
      return (
        <Tag key={key} className={`space-y-1 pl-5 ${b.ordered ? 'list-decimal' : 'list-disc'}`}>
          {b.items.map((item, idx) => renderItem(item, `${key}-i${idx}`))}
        </Tag>
      )
    }
    default: {
      // A lone paragraph inside a list item renders inline (tight list, no extra gaps).
      return (
        <p key={key} className="break-words">
          {renderMultiline(b.text, key)}
        </p>
      )
    }
  }
}

function renderItem(item: Block[], key: string): ReactNode {
  // Task list: "- [ ] text" / "- [x] text"
  const first = item[0]
  if (first?.kind === 'p') {
    const task = TASK_RE.exec(first.text)
    if (task) {
      const checked = task[1] !== ' '
      const rest: Block[] = [{ kind: 'p', text: task[2] ?? '' }, ...item.slice(1)]
      return (
        <li key={key} className="flex list-none items-start gap-2" style={{ marginLeft: '-1.25rem' }}>
          <input type="checkbox" checked={checked} readOnly className="mt-1" />
          <div className="min-w-0 flex-1">{renderItemBody(rest, key)}</div>
        </li>
      )
    }
  }
  return <li key={key}>{renderItemBody(item, key)}</li>
}

// Render an item's blocks, unwrapping a single paragraph so list rows stay tight.
function renderItemBody(item: Block[], key: string): ReactNode {
  if (item.length === 1 && item[0]!.kind === 'p') return renderMultiline((item[0] as { text: string }).text, key)
  return renderBlocks(item, key)
}

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const blocks = useMemo(() => parseBlocks(source.replace(/\r\n?/g, '\n').split('\n')), [source])
  return <div className={`space-y-2 text-sm leading-relaxed break-words ${className}`}>{renderBlocks(blocks, 'md')}</div>
}
