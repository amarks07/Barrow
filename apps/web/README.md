# Barrow

A calendar-based workout tracker: templates, exercise history, progressive-overload
suggestions, and a profile page — now a real Next.js app instead of a chat artifact.

## What's actually working right now

Everything you've been using in chat: calendar, workout logging, exercise
library, templates, history charts, unit conversion, the profile page. It now
**saves locally on the device** via `localStorage` — closing the tab or the
app and coming back later keeps your data, since there's no backend yet to
lose it to. It does **not** sync across devices or survive clearing browser
data/uninstalling the app — that requires the backend described below.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Vercel auto-detects Next.js — no config needed. Deploy.

That's it for the "make it a Vercel app" part — it's a standard Next.js App
Router project, nothing exotic.

## What's NOT done yet (and why)

You said you want a backend for saved user data and shareable profiles, and
eventual App Store / Play Store distribution. Both are real projects with
decisions only you can make, so instead of guessing, here's what's scaffolded
and what's next:

### Backend / persistence
- `app/api/profile/route.js` and `app/api/workouts/route.js` are **placeholder**
  API routes — in-memory, not persistent, not per-user, and **not yet called
  by the client**. They exist to show the intended shape of the endpoints.
- To make this real you need to:
  1. **Pick a database.** Common Vercel-friendly options: Vercel Postgres,
     Supabase, Neon, PlanetScale.
  2. **Pick an auth provider** (needed before "shareable profiles" makes
     sense — you need real user accounts first). Common choices: NextAuth.js,
     Clerk, Supabase Auth.
  3. Replace the in-memory objects in the API routes with real queries, keyed
     by the authenticated user's id instead of `"demo-user"`.
  4. Update `BarrowApp.jsx` to fetch/save through those routes instead of
     keeping `profile`, `exercises`, `templates`, and `workouts` in local
     `useState` — this is the biggest remaining piece of work, since right
     now the whole app assumes synchronous local state.
- "Shared profiles" additionally needs a decision about what "shared" means
  (public read-only link? invite-based? followers?) before it can be built.

### App Store / Play Store
A Next.js/Vercel site is a website, not a native app — getting it into either
store needs a wrapper. Realistic paths:
- **Capacitor** (recommended): wraps this same web app in a thin native
  shell, ships to both stores from one codebase. Needs Xcode (Mac) for iOS
  and Android Studio for the Play Store build, plus paid developer accounts
  ($99/yr Apple, $25 one-time Google).
- **PWA + TWA** (Play Store only, no Capacitor needed): Android accepts
  installable PWAs via Trusted Web Activity. iOS does not have an equivalent
  path — Apple requires an actual app binary.
- `public/manifest.json` is already in place as a first step toward PWA
  installability, though you'll want real icon files (`icon-192.png`,
  `icon-512.png`) in `public/` — placeholders aren't included here since I
  can't generate real image assets.

None of the app-store work can happen inside this chat — it needs your
developer accounts and native build tooling. Happy to help plan the Capacitor
setup in detail when you're ready for that step.
