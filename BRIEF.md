# RACKED — build & handoff brief

A free, installable phone app for logging weightlifting (weight × reps × sets) with a strength-analytics dashboard and a rest timer. Built as a single static `index.html` (vanilla JS, no build step) backed by Supabase.

**This document is written for Claude Code.** Read it fully, then work the task list in `## Roadmap`. The app already runs end-to-end — your job is to finish it into a polished, installable PWA and (optionally) extend it. Don't rewrite from scratch; respect the constraints in `## Architecture & rules`.

---

## TL;DR — current status

- `index.html` is a **complete, working app**: logging UI + full Stats dashboard + rest timer + Supabase sync + a "Try with sample data" demo mode.
- Supabase backend is set up (see `## Backend`). Schema is in `schema.sql`.
- What's missing for a real install: PWA wiring (manifest link, icons, service worker / offline), deployment, and a few quality-of-life features. All listed in `## Roadmap`.

## How to use this handoff

```
# from the project folder
python3 -m http.server 8000     # serve locally
# open http://localhost:8000  -> tap "Try with sample data" to see everything
```
Then point Claude Code at this file and the task list below.

---

## What the app does

**Log tab**
- Three workout splits as tabs: Chest/Triceps, Back/Biceps, Legs/Shoulders (the user's actual program — see `## Program`).
- Each exercise shows the **last session inline** (e.g. `LAST May 12 · 40×11, 10`) — the core feature, drives progressive overload.
- Tap an exercise → weight/reps steppers (+/−) → "Add set" → sets appear as chips for today; tap ✕ to delete. Weight persists across sets for fast entry.
- "+ Add exercise" lets the user log movements not in the seeded list.

**Stats tab** (all computed live from logged sets)
- Overview cards: sessions this week, weekly tonnage, week streak (current/best), PRs this week.
- Strength progression: per-exercise **estimated 1RM** trend + volume-per-session trend, with % change. Exercise picker dropdown.
- Progress check: **plateau detection** — flags lifts with no new high in their last 3 sessions.
- Consistency: 16-week **calendar heatmap** (colored by session volume) + "what's overdue" (days since each split).
- Muscle balance: **sets per muscle per week** vs the 10–20 target band, push:pull ratio, rep-range distribution (strength/hypertrophy/endurance).
- Records: PR wall (best e1RM + heaviest weight per main lift).
- Body & relative strength: bodyweight trend + squat/bench as a multiple of bodyweight + quick bodyweight logger.

**Rest timer** (fixed bottom bar)
- 2:00 / 2:30 / 3:00 quick starts, big countdown, beep + vibrate at zero. See the iOS caveat in `## Gotchas`.

---

## Architecture & rules (respect these)

1. **Single static file, no build step.** `index.html` contains all HTML/CSS/JS inline. Plain vanilla JS — no React, no npm, no bundler. It must remain deployable by dropping static files on any host. (Refactoring into a few files is fine; introducing a build pipeline is not, unless you also keep a zero-build path.)
2. **Backend = Supabase REST via `fetch`.** No SDK. Calls hit `{URL}/rest/v1/<table>` with headers `apikey: <key>` and `Authorization: Bearer <key>` (same value in both — this is required for the new Supabase key model; the legacy `anon` JWT key works cleanly).
3. **Free forever.** Supabase free tier + free static hosting. Don't add paid services.
4. **Storage shim.** Credentials are saved via a `Store` helper that uses `window.storage` when present (Claude.ai artifact sandbox) and falls back to `localStorage` on a real deploy. On a deployed site only the `localStorage` path runs. You may simplify to plain `localStorage` for the deployed version if you prefer — just don't break it.
5. **Demo mode.** The "Try with sample data" button sets `DEMO=true` and runs entirely in-memory via `buildDemo()`. Keep this working; it's how the app is reviewed without a backend.
6. **Design system is intentional** — see `## Design`. Keep the aesthetic; don't fall back to generic defaults.

---

## File map

| File | Purpose |
|---|---|
| `index.html` | The entire app (working). Entry point. |
| `schema.sql` | Supabase tables + RLS policies + grants. Already run by the user. |
| `manifest.json` | PWA manifest starter (needs icons + a `<link rel="manifest">` in index.html). |
| `BRIEF.md` | This file. |

---

## Data model

**`sets`** — one row per set:
`id (uuid)`, `created_at`, `log_date (date)`, `day (text)`, `exercise (text)`, `weight (numeric, 0 for bodyweight)`, `reps (int)`, `set_number (int)`.

**`bodyweight`** — `id`, `created_at`, `log_date`, `weight`.

Full DDL in `schema.sql`.

### Analytics logic (already implemented — match this if you extend)
- **Estimated 1RM (Epley):** `weight * (1 + reps/30)`. If `weight === 0` (bodyweight), the metric falls back to reps.
- **Volume:** `weight * reps`; for bodyweight movements uses `reps * 5` as a rough proxy.
- **Week bucket:** `Math.floor(dayNum(date) / 7)` where `dayNum` = UTC days since epoch. Consistent 7-day buckets (used for streaks + weekly volume).
- **Streak:** consecutive weeks with ≥1 session, counting back from the current week.
- **Plateau:** for an exercise with ≥4 sessions, flag if the max e1RM of the last 3 sessions ≤ the peak e1RM of all prior sessions.
- **Muscle map / push-pull / rep ranges:** see the `MUSCLE`, `PUSH`, `PULL` constants and the rep buckets (≤5 strength, 6–12 hypertrophy, 13+ endurance) in `index.html`.

---

## Backend (already configured by the user)

- Supabase project created on the **free** tier, **Enable Data API** on, **Automatically expose new tables** on, automatic RLS off (the schema enables RLS per-table itself).
- `schema.sql` has been run (creates `sets` + `bodyweight`, RLS allow-all for `anon`, grants).
- The app stores **Project URL** + **anon key** locally on first connect. Use the **legacy `anon` key** (`eyJ…`).
- To inspect/export data: Supabase dashboard → Table Editor (or `select * from sets order by log_date`).

---

## Design

Athletic / industrial readout aesthetic. Dark, high-contrast, large tap targets for sweaty-hands gym use.

- **Colors:** bg `#0a0a0b`, panels `#141416` / `#1b1b1f`, lines `#2a2a2e`, text `#f4f4f5`, dim `#8a8a93`, faint `#5a5a61`. Accent ("volt") `#c9f73a`, dim accent `#9bc22a`, hot/alert `#ff5a3c`, gold/warn `#ffd23c`.
- **Type:** Oswald (condensed, uppercase) for display/headings; JetBrains Mono for all numbers/readouts; Archivo for body. Loaded from Google Fonts.
- All tokens are CSS variables in `:root`. Reuse them.

---

## Program (baked into `PROGRAM` in index.html)

- **Chest / Triceps:** Barbell Flat Bench, Incline DB Press, Seated Chest Flies, Tricep Pushdown, Overhead Tricep Extension
- **Back / Biceps:** Pull-ups, Lat Pulldown, Rows, Incline DB Curl, Machine Curl, Hammer Curls
- **Legs / Shoulders:** DB Shoulder Press, Barbell Squats, Lateral Cable Raises, Leg Extension, Rear Cable Pulls, Calf Raises, RDL (optional)

---

## Roadmap (work top-down)

### P0 — make it a real installable PWA + ship it
1. **Wire the manifest:** add `<link rel="manifest" href="manifest.json">` to `<head>` in index.html.
2. **Generate app icons** `icon-192.png` and `icon-512.png` (and an `apple-touch-icon.png`, 180×180) — dark bg `#0a0a0b` with a volt `#c9f73a` mark (e.g. a barbell or the word RACKED). Add `<link rel="apple-touch-icon" href="apple-touch-icon.png">`. iOS ignores SVG here, so they must be PNG.
3. **Service worker for offline:** add `sw.js` that caches the app shell (index.html, manifest, icons, Google Fonts) so the app opens with no connection; register it from index.html. Network-first (or stale-while-revalidate) for Supabase calls; cache-first for the shell. Make sure logging still queues/fails gracefully offline (at minimum, show a clear "offline" toast; bonus: queue writes and flush on reconnect).
4. **Deploy** to free static hosting and confirm install-to-home-screen works on iOS Safari (full-screen, icon, theme color). Options: Netlify (drag-drop at app.netlify.com/drop, or `netlify deploy --prod`), Cloudflare Pages, Vercel, or GitHub Pages. Needs HTTPS (all of these provide it).

### P1 — quality of life
5. **History / edit view:** browse and edit past sessions per exercise (currently you can only delete *today's* sets). Add date navigation.
6. **CSV export button** in settings (the user explicitly wanted laptop-accessible data; Table Editor covers it, but an in-app export is nicer).
7. **Optional privacy:** the anon-key model means the data is reachable by anyone with URL+key. Add either (a) a simple passcode gate, or (b) proper Supabase Auth (email magic link) with per-user RLS (`user_id uuid default auth.uid()`, policies keyed to `auth.uid()`). (b) is the real fix.
8. **Exercise management:** persist custom exercises and let the user edit the program / reorder exercises (currently the program is hardcoded; custom ones only persist via their logged rows).

### P2 — nice to have
9. Per-set RPE / notes; superset grouping; warmup-set flag.
10. More analytics: 1RM projections + "next milestone" ETA, goal tracking with progress bars, "on this day" comparison, per-session strain score.
11. **Native rest timer integration:** ship an Apple Shortcut (or document the Clock-app "Stop Playing" end-action) so rest works hands-off / backgrounded — the web timer can't (see Gotchas).
12. Light theme toggle; haptics polish; settings screen.

---

## How to run & test locally

```
python3 -m http.server 8000
# http://localhost:8000  -> "Try with sample data" exercises every screen with ~3 months of synthetic data
```
For PWA/service-worker testing you need `localhost` or HTTPS (both count as secure contexts). Use Chrome DevTools → Application tab to inspect the manifest + service worker, and Lighthouse → PWA audit.

To test real sync: connect with the user's Supabase URL + anon key, log a set, reload — it should persist and show as the last session.

---

## Gotchas / known limitations

- **iOS web-app timers suspend in the background.** When the screen locks or the user switches to their music app, the in-app rest timer's JS pauses, so the beep won't reliably fire. A PWA also can't touch the Dynamic Island or control other apps' audio. The reliable hands-off solution is the **native Clock app timer with "When Timer Ends → Stop Playing"** (shows in the Dynamic Island, stops music at zero), or an Apple Shortcut. Keep the in-app timer as a foreground convenience; don't over-invest in making it background-reliable on iOS.
- **anon key is public** in client code; with RLS allow-all, anyone with URL+key can read/write. Acceptable for a personal log; see P1 #7 for the real fix.
- **Supabase free projects pause** after ~1 week of no activity; the first request after a pause may lag a few seconds while it wakes. Normal use keeps it awake.
- **Supabase key model changed.** The app sends the same key value in both `apikey` and `Authorization: Bearer` headers; the legacy `anon` JWT key (`eyJ…`) is the safe choice.
- **Bodyweight movements** (pull-ups, `weight=0`) use reps as the e1RM/volume proxy. If the user wants accuracy, add an optional "added weight" and/or use bodyweight in the volume calc.
- **`window.storage` shim** exists only for the Claude.ai artifact sandbox; on a deployed site it's `undefined` and the code falls back to `localStorage`. Safe to simplify to plain `localStorage` for production.

---

## Acceptance criteria

- [ ] Connecting with a valid Supabase URL + anon key succeeds; an invalid one shows a clear error.
- [ ] Logging a set writes to Supabase and survives a reload; it appears as the exercise's "last session" next time.
- [ ] Deleting a set removes it from Supabase.
- [ ] Stats render correctly from real data (no demo) and update after new logs.
- [ ] Installs to the iOS home screen: custom icon, full-screen (no Safari chrome), correct theme color.
- [ ] Opens offline (after service worker) with the cached shell; gives a clear message if a sync action needs network.
- [ ] Lighthouse PWA audit passes the installability checks.
