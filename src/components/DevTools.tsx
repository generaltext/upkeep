import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { seedDemo } from '../lib/seed'
import { Icon } from './Icon'

// Dev-only affordance (gated at the mount site on `import.meta.env.DEV`, so it is
// tree-shaken out of the production build and never appears in a real install or
// the gallery demo). In `pnpm dev` the local workspace starts empty; this fills it
// with the same sample home log the gallery "Try it live" demo uses.
//
// The runtime injects its own dev panel (reset / mirror) at [data-gt-dev-panel],
// bottom-right, which would occlude us. So we measure that panel and sit just to
// its left, falling back to the bottom-right corner if it isn't present.
export function DevTools() {
  const { state, dispatch, version } = useStore()
  void version
  const [busy, setBusy] = useState(false)
  const [pos, setPos] = useState<{ right: number; bottom: number }>({ right: 12, bottom: 12 })

  useEffect(() => {
    function place() {
      const panel = document.querySelector('[data-gt-dev-panel]') as HTMLElement | null
      if (panel) {
        const r = panel.getBoundingClientRect()
        setPos({
          right: Math.max(12, Math.round(window.innerWidth - r.left) + 8), // 8px gap left of the panel
          bottom: Math.max(12, Math.round(window.innerHeight - r.bottom)), // align bottoms
        })
      } else {
        setPos({ right: 12, bottom: 12 })
      }
    }
    place()
    // The panel is runtime-injected and can mount/resize after us; re-place a few
    // times, on resize, and whenever it changes size (collapse/expand).
    const timers = [setTimeout(place, 300), setTimeout(place, 1200)]
    window.addEventListener('resize', place)
    let ro: ResizeObserver | undefined
    const panel = document.querySelector('[data-gt-dev-panel]')
    if (panel && 'ResizeObserver' in window) {
      ro = new ResizeObserver(place)
      ro.observe(panel)
    }
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', place)
      ro?.disconnect()
    }
  }, [])

  const hasData = state.events.length > 0

  async function fill() {
    if (hasData && !window.confirm('This workspace already has data. Add the demo data on top anyway?')) return
    setBusy(true)
    try {
      await seedDemo((drafts) => dispatch(drafts))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={fill}
      disabled={busy}
      title={hasData ? 'Append the sample home log to this workspace' : 'Fill this empty dev workspace with the sample home log'}
      className="fixed z-[60] inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-md disabled:opacity-60"
      style={{ right: pos.right, bottom: pos.bottom, background: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--fg)' }}
    >
      <Icon name="Sparkles" size={13} style={{ color: 'var(--accent)' }} />
      {busy ? 'Seeding…' : 'Seed demo data'}
      <span className="rounded px-1 py-0.5 text-[9px] uppercase tracking-wide" style={{ background: 'var(--hover)', color: 'var(--muted)' }}>
        dev
      </span>
    </button>
  )
}
