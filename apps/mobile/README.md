# Barrow (mobile)

The React Native rewrite of Barrow, built with Expo. This is the only place the app is
actually used now — `../web` is just a landing page for downloading this app's Android build.

## Run it locally

From the repo root (this is an npm workspace):

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` for an Android emulator.

## One-time setup

### Cloud backup (optional)

The app runs fully offline without this. To enable cloud backup/sign-in, create
`apps/mobile/.env.local` with:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

using the same Supabase project referenced by `../../supabase/schema.sql`. You also need to
add this app's password-reset deep link to the Supabase project's **Authentication → URL
Configuration → Redirect URLs**: `barrow://reset-password` (see `src/hooks/useCloudSync.js`).

### EAS (for building the installable APK)

Building a real `.apk` (rather than running through Expo Go) uses [EAS
Build](https://docs.expo.dev/build/introduction/), which requires a free Expo account —
create one at [expo.dev](https://expo.dev) if you don't have one. Then, from `apps/mobile`:

```bash
npx eas login
npx eas build:configure
```

`build:configure` links this project to your Expo account (writes `extra.eas.projectId` into
`app.json`) — it's a one-time step.

## Building and shipping a release

```bash
npx eas build --platform android --profile preview
```

This runs on Expo's build servers and produces a downloadable `.apk` (see `eas.json` — the
`preview` profile is set to `buildType: "apk"`, not an `.aab`, since there's no Play Store
involved). Once it finishes:

1. Download the `.apk` from the link EAS prints (or `npx eas build:list`).
2. Copy it to `apps/web/public/downloads/barrow.apk`.
3. Commit and redeploy `apps/web` (or push, if it's connected to Vercel for auto-deploy).

Android will show an "unknown sources" / Play Protect warning on install — expected for
direct APK distribution outside the Play Store, and called out on the download page itself.

## Feature parity

Business logic (calendar/date math, supersets, templates, workout CRUD, progressive-overload
recommendations) lives in `../../packages/core` and is shared byte-for-byte with the retired
web app — see that package's `src/` for the source of truth. Only presentation and
platform-specific concerns (storage, cloud-sync deep linking, gestures) are RN-specific, under
`src/`.
