import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../lib/store'
import { dueForState } from '../lib/recurrence'
import { Icon, type IconName } from './Icon'
import { CommandBar } from './CommandBar'
import { DevTools } from './DevTools'

interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'Gauge', end: true },
  { to: '/properties', label: 'Properties', icon: 'Home' },
  { to: '/systems', label: 'Systems', icon: 'Wrench' },
  { to: '/contacts', label: 'Contacts', icon: 'Phone' },
  { to: '/history', label: 'History', icon: 'History' },
  { to: '/tags', label: 'Tags', icon: 'Tag' },
  { to: '/settings', label: 'Settings', icon: 'Settings' },
]

// The mobile bottom bar shows the four most-used destinations; the rest live behind
// "More" so the bar stays uncrowded and every tap target stays large.
const BOTTOM_PRIMARY = NAV.filter((n) => ['/', '/properties', '/systems', '/history'].includes(n.to))
const MORE_ITEMS = NAV.filter((n) => ['/contacts', '/tags', '/settings'].includes(n.to))

const BRAND = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={18} height={18} aria-hidden>
    <path d="M3 10.7 11.3 3.6a1 1 0 0 1 1.4 0L21 10.7" />
    <path d="M5.5 9.3V20h13V9.3" />
    <path d="m9 14.3 2 2 4-4" />
  </svg>
)

export function Layout() {
  const { connected, state, config, version } = useStore()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  void version
  const overdue = dueForState(state, config).filter((d) => d.status === 'overdue').length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full flex-col md:flex-row" style={{ background: 'var(--bg)' }}>
      {/* Mobile top bar. No safe-area padding: the General Text shell owns the device
          edges (status bar / home indicator), so adding insets here double-counts them. */}
      <header
        className="flex shrink-0 items-center gap-2 border-b px-3 py-2 md:hidden"
        style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          {BRAND}
        </span>
        <span className="text-base font-semibold tracking-tight">Upkeep</span>
        {!connected && (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--soon-soft)', color: 'var(--soon)' }}>
            Offline
          </span>
        )}
        <button
          type="button"
          onClick={() => setCmdOpen(true)}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-md"
          style={{ color: 'var(--fg)' }}
          aria-label="Search or create"
        >
          <Icon name="Search" size={18} />
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r md:flex" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            {BRAND}
          </span>
          <span className="text-lg font-semibold tracking-tight">Upkeep</span>
        </div>

        <button
          type="button"
          onClick={() => setCmdOpen(true)}
          className="mx-3 mb-2 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        >
          <Icon name="Search" size={14} />
          <span>Search or create</span>
          <kbd className="ml-auto rounded px-1.5 py-0.5 text-[10px]" style={{ background: 'var(--hover)' }}>
            ⌘K
          </kbd>
        </button>

        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={!!item.end}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium"
              style={({ isActive }) => ({
                background: isActive ? 'var(--accent-soft)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--fg)',
              })}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
              {item.to === '/' && overdue > 0 && (
                <span className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--overdue-soft)', color: 'var(--overdue)' }}>
                  {overdue}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 border-t px-4 py-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          <span
            title={connected ? 'Synced' : 'Offline'}
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: connected ? '#16a34a' : 'var(--muted)' }}
          />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="flex shrink-0 border-t md:hidden"
        style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
      >
        {BOTTOM_PRIMARY.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={!!item.end}
            className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium"
            style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--muted)' })}
          >
            <Icon name={item.icon} size={21} />
            {item.label}
            {item.to === '/' && overdue > 0 && (
              <span className="absolute right-[22%] top-1 h-2 w-2 rounded-full" style={{ background: 'var(--overdue)' }} aria-label={`${overdue} overdue`} />
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium"
          style={{ color: 'var(--muted)' }}
        >
          <Icon name="ChevronDown" size={21} />
          More
        </button>
      </nav>

      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} onSearch={() => { setMoreOpen(false); setCmdOpen(true) }} connected={connected} />}
      <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />
      {import.meta.env.DEV && <DevTools />}
    </div>
  )
}

function MoreSheet({ onClose, onSearch, connected }: { onClose: () => void; onSearch: () => void; connected: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        className="rounded-t-2xl border-t p-2"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full" style={{ background: 'var(--border)' }} />
        <button type="button" onClick={onSearch} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm" style={{ color: 'var(--fg)' }}>
          <Icon name="Search" size={18} style={{ color: 'var(--muted)' }} /> Search or create
        </button>
        {MORE_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium"
            style={({ isActive }) => ({ background: isActive ? 'var(--accent-soft)' : 'transparent', color: isActive ? 'var(--accent)' : 'var(--fg)' })}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </NavLink>
        ))}
        <div className="flex items-center gap-2 px-3 pb-1 pt-2 text-xs" style={{ color: 'var(--muted)' }}>
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: connected ? '#16a34a' : 'var(--muted)' }}
          />
          <span>{connected ? 'Synced' : 'Offline'}</span>
        </div>
      </div>
    </div>
  )
}
