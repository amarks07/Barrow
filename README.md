# Barrow

A calendar-based workout tracker — supersets, templates, progressive-overload
recommendations, and history charts.

npm workspaces monorepo:

- `apps/mobile` — the app itself, React Native (Expo). See `apps/mobile/README.md` to run it
  or build a release APK.
- `apps/web` — a Next.js landing page for downloading the Android build directly, no Play
  Store. See `apps/web/README.md`.
- `packages/core` — business logic shared by the app (calendar/date math, supersets,
  templates, workout CRUD, recommendations) — no UI, no platform APIs.
- `supabase/schema.sql` — schema for the optional cloud-backup backend.
