# FRONTIER

A sci-fi expedition fitness RPG. Real movement, strength training, meditation and gentle breathwork earn XP, complete missions and reveal waypoints on a sector map. It's local-first: you don't need an account, a backend, an API key, or any analytics.

## Run it

```bash
npm ci            # install (Node 20+; lockfile was generated with npm 11)
npm run dev       # dev server at http://localhost:5173
npm test          # domain unit tests (Vitest)
npm run build     # typecheck + production build to dist/
npm run e2e       # after build: drives Chromium through the core loop (Playwright)
npm run preview   # serve the production build
```

`npm run e2e` takes screenshots and writes them to `e2e-artifacts/`. It exits non-zero if any check fails or the browser logs a console error.

## What's in the MVP

- **Onboarding:** six short steps, each optional except picking at least one activity. You choose activities and favourites, equipment, available days, session length, starting point, weekly targets, movements to avoid, and motion/text/contrast settings.
- **Mission Control:** a planetary hero image whose outpost gains modules as you unlock them. It shows a briefing line built from your actual history, plus three optional missions (Recommended, Quick win, Something fun), each with a swap button. There are also quick-start shortcuts, today's status, a weekly strip, and opt-in "step up" offers.
- **Missions:** Quick Ops, Daily Missions, Weekly Directives (built from your own weekly targets) and long-running Expedition Objectives.
- **Activity capture:**
  - Timed sessions with pause and resume. Elapsed time is computed from timestamps, so a sleeping tab or a reload doesn't change it.
  - A quick log for backfilling past sessions, with a duplicate-submit guard.
  - A review screen where you can rate how the session felt: Easy, About right, Too hard or Uncomfortable.
  - Optional details for each activity type.
- **Strength:** an exercise library that respects your restrictions and equipment, plus custom exercises. You log sets, reps and load (kg or lb), reorder exercises, see what you did last time, and can save a session as a reusable workout.
- **Meditation:** a countdown of 1, 3, 5, 10 or 15 minutes. **Breathwork:** four gentle presets with no breath holds, an animated orb, and a "Stop — I feel dizzy" button that ends the session immediately.
- **Progression:**
  - XP: 15 per session, +1 per 5 minutes (capped at +10), and up to +10 from missions per session.
  - Levels follow the curve `100 + 20 × (level − 1)`.
  - Base XP drops after the 3rd session in a day; the sessions are still logged.
  - Five attribute ranks, 12 waypoints across 4 sectors (several with alternate unlock routes), 10 achievements and 13 archive items, including equippable titles.
- **Expedition Map:** a vertical route through the four sectors. Nodes show discovered, in-range and locked states using shape and text as well as colour. Each node has a detail panel with unlock progress, a story fragment and its rewards.
- **Activity Log:** filter by activity and date range. Session details can be edited or deleted, and progress recalculates.
- **Progress & Archive:**
  - Totals, attributes, an 8-week consistency chart, totals by activity, and strength bests.
  - A weekly debrief ("what went well", "what felt hard", small adjustments) that you can rate and save.
  - Achievements and archive items.
- **Settings:** everything from onboarding can be changed here, as well as renaming activities and reviewing paused (flagged) activities. You can enable or disable library exercises, export JSON, import (validated, with a merge-or-replace choice) and reset (you have to type "delete" to confirm).

## Design decisions

- **Progress is derived, not stored.** XP, quest completion, unlocks and achievements are recomputed from the session log every time (`src/domain/progression.ts`). Each reward has an idempotency key, so editing a session, re-importing a file or refreshing a page can't award it twice. The only things persisted are the profile, sessions, the missions you were offered (daily and weekly boards), the reveals you've already seen, and your reviews.
- **Inactivity never takes anything away.** Time passing doesn't affect progress. Deleting a session *does* recalculate progress, because the record should match what you actually logged.
- **Waypoints unlock in order.** Each one has one or more rules ("any of"), so no activity type is required.
- **Adaptation rules** (`src/domain/generator.ts`):
  - Suggestions only use enabled, unflagged activities that don't conflict with movements you've chosen to avoid.
  - Rest days offer only gentle optional activities.
  - After a gap of 4 or more days you get an easy comeback mission, never catch-up work.
  - "Too hard" shortens the next comparable suggestion.
  - "Uncomfortable" pauses that activity or exercise until you clear it in Settings.
  - Increases are only offered, and are applied only when you accept.
- **Strength missions count a completed session, not its volume.** Load and volume are never auto-increased.
- **Rules for XP:** sessions shorter than 1 minute are logged but earn no XP.
- **Weekly contract counting:** for any week, the Field Presence target counts against what was offered that week.
- **Persistence:** `localStorage` sits behind a repository interface (`src/storage/`). The schema is versioned, and unreadable data is backed up rather than overwritten.
- **Routing:** a small hash router, so static hosting needs no configuration.

## Layout

```
src/domain/    pure, tested rules: XP, timer math, quests, generator, progression, debrief
src/storage/   schema validation, migration, import/export merge, localStorage repository
src/content/   editable copy: missions, sectors & nodes, rewards, exercises, breathing presets
src/components/ UI primitives and original SVG art (PlanetHero, glyphs, node shapes)
src/features/  screens: onboarding, mission control, missions, expedition, activity, log, progress, settings
src/state/     store (React context), hash router
scripts/e2e.mjs browser walkthrough of the acceptance checklist
```

## Safety & limits

FRONTIER is for motivation and logging. It isn't medical advice and doesn't diagnose anything. XP and levels aren't calories, fitness scores or health measures. Calories, body weight, heart rate, VO2 max and breath-hold metrics are deliberately left out.

## Deferred (P1/P2 in the spec)

- More sectors and art.
- A customisable outpost and cosmetic inventory.
- Richer workout templates.
- Soundscapes.
- PWA/offline install.
- Optional AI-written mission flavour text.
- Health-platform and wearable imports.
- Cloud sync and accounts.
- Social and co-op features.
