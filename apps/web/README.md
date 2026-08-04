# Barrow — download page

This is no longer the app itself — Barrow is now a React Native app (`../mobile`). This
Next.js app is just the landing page that lets someone grab the Android build directly from
their phone's browser, without the Play Store.

## Run it locally

From the repo root (this is an npm workspace):

```bash
npm install
npm run dev --workspace=apps/web
```

Open http://localhost:3000.

## Getting the APK onto this page

The download button links to `https://github.com/amarks07/Barrow/releases/latest/download/barrow.apk`
— a stable URL that always resolves to the most recent GitHub Release's `barrow.apk` asset.
Nothing here needs to change when a new build ships. See `../mobile/README.md` for how that
release gets created (the `Build Android APK` GitHub Action).

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. In the project's settings, set **Root Directory** to `apps/web`. Vercel detects the npm
   workspace automatically and installs/builds from the repo root.
