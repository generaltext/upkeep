# Upkeep

The maintenance log that outlives the equipment, built as a
[General Text](https://www.generaltext.org) app. Record the systems in a property
(make, model, serial, filter sizes), set the tasks that recur, and log a dated line
each time something is serviced. Upkeep folds those lines into a clean equipment
reference and a **what's-due dashboard** (overdue · due soon · upcoming) — and keeps a
portable service history you own forever.

Works for a house, a rental, a car, a generator: a property has a `kind`, and
everything else hangs off it. No backend, offline-first, syncs across your devices and
household; the whole dataset is plaintext files you can hand to the next owner.

Built against the app guide: https://www.generaltext.org/llms.txt
(local source: `projects/generaltext/content/docs/building-apps.md`). Design plan:
`planning/apps/upkeep/init.md` in the gt-meta repo.

## Develop

```bash
pnpm install
pnpm dev        # vite dev server; window.gt is injected in dev
pnpm test       # vitest — the event/reducer/recurrence/log spine
pnpm typecheck
pnpm build      # tsc --noEmit && vite build → dist/ (gt.json at root, relative assets)
```

In dev, a tiny Vite plugin injects the public General Text runtime, so the app runs
standalone against a **local in-browser workspace** (IndexedDB + cross-tab sync). Open
two tabs to watch edits merge. No account, no server. A dev-only **"Seed demo data"**
button (bottom-right, next to the runtime's dev panel) fills the empty workspace with a
sample home log; it's gated on `import.meta.env.DEV` and never ships in a build.

To test inside real General Text: `vite preview` and install by URL
(Settings → Apps → Install by URL).

## Architecture: event-sourced

The source of truth is an **append-only event log**; the UI is a **materialized
projection** rebuilt by folding it. An append-only JSONL log is the structure that
merges cleanest under General Text's character-level CRDT, and a maintenance log is an
event stream by nature — "on this date, this was done to this thing" *is* an event.

- **`lib/events.ts`** — the event envelope (`{ id, ts, actor, type, subject, data }`),
  one JSON line per change, `<entity>.<verb>`.
- **`lib/log.ts`** — monthly JSONL shards (`v0/events/YYYY-MM.jsonl`), safe appends,
  and incremental tail folding.
- **`lib/reducer.ts`** — folds events → records (properties, systems, schedules,
  service records, contacts, notes). Idempotent (dedupe by event id) so optimistic
  writes and re-folds are safe; fields resolve last-writer-wins.
- **`lib/recurrence.ts`** — the heart: derives each schedule's next-due date from the
  log (last fulfilling service, or the anchor, plus the interval), applies snoozes, and
  buckets everything into overdue / due-soon / upcoming. Nothing is stored; the
  dashboard is a pure projection.
- **`lib/dates.ts`** — date-only (`YYYY-MM-DD`) interval arithmetic, kept timezone-free
  so a due date never slips a day; service dates are calendar facts, separate from the
  event `ts` used for ordering.
- **`lib/cache.ts`** — a disposable IndexedDB materialization cache (hydrate instantly,
  re-parse only the new tail). The log is always the truth.
- **`lib/store.tsx`** — boots the runtime, subscribes shards, dispatches events (safe
  append based on freshest content), exposes `useStore()`.
- **`lib/model.ts`** — the entity/field registry (property, system, contact) and config
  (categories, tag palette, reminder lead). Adding a field is one line.
- **`lib/blobs.ts`** — attachments (manuals, receipts, rating-plate photos) via
  `gt.writeBlob`/`readBlob`, feature-detected so it degrades gracefully.
- **`lib/ics.ts`** — the no-backend answer to reminders: export an iCalendar feed
  (one recurring `VEVENT` per schedule) and subscribe to it in a calendar app.

The layout is responsive (sidebar on desktop; top bar + bottom tab nav on mobile), with
touch-friendly targets and bottom-sheet modals.

## Files written (all under this app's `data/`)

- `v0/events/YYYY-MM.jsonl` — the append-only log (source of truth).
- `v0/config.json` — asset categories, tag colors, default reminder lead.
- `v0/blobs/…` — attached manuals, receipts, and photos.
- `v0/upkeep.ics` — the generated calendar feed (when you export one).

Never edit a shard line in place; corrections are new events (`service.update`,
`service.void`, archive tombstones). That's what keeps merges clean and the cache
correct.

## License

MIT — see [LICENSE](./LICENSE).
