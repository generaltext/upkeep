import type { CSSProperties, ReactNode } from 'react'
import { useEffect } from 'react'
import type { Actor } from '../lib/events'
import { initials, relativeTime } from '../lib/format'
import type { DueStatus } from '../lib/recurrence'
import { Icon, type IconName } from './Icon'

const AVATAR_COLORS = ['#0d9488', '#2563eb', '#16a34a', '#7c3aed', '#e11d48', '#d97706', '#0891b2']

function colorFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]!
}

export function Avatar({ actor, size = 22 }: { actor: Actor | null; size?: number }) {
  const name = actor?.name ?? '?'
  const bg = colorFor(actor?.id ?? name)
  return (
    <span
      title={name}
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${bg} 18%, transparent)`,
        color: bg,
        fontSize: size * 0.42,
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
    >
      {initials(name)}
    </span>
  )
}

export function ActorStamp({ actor, ts, prefix = 'by' }: { actor: Actor | null; ts: string; prefix?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
      <Avatar actor={actor} size={16} />
      <span>
        {prefix} {actor?.name ?? 'unknown'} · {relativeTime(ts)}
      </span>
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: IconName
  title: string
  hint?: string | undefined
  action?: ReactNode | undefined
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: 'var(--hover)', color: 'var(--muted)' }}
      >
        <Icon name={icon} size={22} />
      </div>
      <div className="text-base font-medium">{title}</div>
      {hint && (
        <div className="max-w-sm text-sm" style={{ color: 'var(--muted)' }}>
          {hint}
        </div>
      )}
      {action}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'default',
  type = 'button',
  title,
  disabled,
  size = 'md',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  title?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  const base = `inline-flex items-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 ${pad}`
  const cls: Record<string, string> = { default: 'border', primary: '', ghost: '', danger: 'border' }
  const inline: CSSProperties =
    variant === 'primary'
      ? { background: 'var(--accent)', color: '#fff' }
      : variant === 'default'
        ? { borderColor: 'var(--border)', background: 'var(--panel)' }
        : variant === 'danger'
          ? { borderColor: 'color-mix(in srgb, var(--overdue) 40%, transparent)', color: 'var(--overdue)' }
          : {}
  return (
    <button type={type} onClick={onClick} title={title} disabled={disabled} className={`${base} ${cls[variant]}`} style={inline}>
      {children}
    </button>
  )
}

export function IconButton({
  icon,
  onClick,
  title,
  size = 15,
}: {
  icon: IconName
  onClick?: () => void
  title?: string
  size?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md"
      style={{ color: 'var(--muted)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  back,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: IconName
  actions?: ReactNode
  back?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      {back}
      {icon && (
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          <Icon name={icon} size={18} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <div className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>
            {subtitle}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border p-4 ${className}`}
      style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
    >
      {children}
    </div>
  )
}

export const STATUS_META: Record<DueStatus, { label: string; fg: string; soft: string; icon: IconName }> = {
  overdue: { label: 'Overdue', fg: 'var(--overdue)', soft: 'var(--overdue-soft)', icon: 'CircleAlert' },
  soon: { label: 'Due soon', fg: 'var(--soon)', soft: 'var(--soon-soft)', icon: 'Clock' },
  upcoming: { label: 'Upcoming', fg: 'var(--ok)', soft: 'var(--ok-soft)', icon: 'CircleCheck' },
}

export function StatusPill({ status, children }: { status: DueStatus; children?: ReactNode }) {
  const m = STATUS_META[status]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: m.soft, color: m.fg }}
    >
      <Icon name={m.icon} size={12} />
      {children ?? m.label}
    </span>
  )
}

export function Modal({ title, onClose, children, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-auto p-0 sm:items-start sm:p-4 sm:pt-[8vh]"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[92dvh] w-full flex-col rounded-t-2xl border shadow-2xl sm:rounded-xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold">{title}</h2>
          <IconButton icon="X" onClick={onClose} title="Close" />
        </div>
        <div className="overflow-y-auto p-4 sm:p-5" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
