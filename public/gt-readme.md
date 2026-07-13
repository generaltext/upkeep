# Upkeep

The maintenance log for your home (and anything else you keep up: a car, a
generator, an espresso machine). Record the systems you own — their make, model,
serial, and filter sizes — and log a dated line every time something gets serviced.
Upkeep folds those lines into two things you actually want: a clean equipment
reference, and a **what's-due dashboard** that tells you at a glance what's overdue
and what's coming up.

- **Recurring maintenance.** Set a schedule ("replace the HVAC filter every 3
  months") and Upkeep tracks the next-due date for you. Logging a service advances
  the clock automatically.
- **Every record is yours, forever.** Everything is stored as plain JSON-lines files
  in your own workspace. Grep it, diff it, hand it to your AI, or hand the whole
  folder to the next owner at sale. Nothing lives on someone else's server.
- **Shared and offline.** Keep one log with a partner; it syncs across your devices
  and works with the internet off. Every service line is stamped with who logged it.
- **Attach manuals and receipts.** Snap the rating-plate photo, attach the receipt
  or the manual PDF, right on the asset.
- **Calendar hand-off.** Export an `.ics` feed and subscribe to it in your calendar,
  so reminders fire where you already look.

## What it writes

- `v0/events/YYYY-MM.jsonl` — an append-only log of every change (the source of
  truth: properties, assets, schedules, service records, vendors, notes, tags).
- `v0/config.json` — asset categories, tag colors, and the default reminder lead time.
- `v0/blobs/…` — attached manuals, receipts, and photos.
- `v0/upkeep.ics` — the generated calendar feed (when you export one).

Not for cars specifically? A car is just a property of kind "vehicle" — its assets
are the engine, tires, registration, with dated service records like everything else.
Date-based schedules only for now (mileage-based is not yet supported).
