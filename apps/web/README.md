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

`public/downloads/barrow.apk` isn't checked in until a real build exists — see
`../mobile/README.md` for the EAS build steps. Once you have a built `.apk`, copy it to
`apps/web/public/downloads/barrow.apk` and redeploy; the download button on this page links
straight to that path.

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. In the project's settings, set **Root Directory** to `apps/web`. Vercel detects the npm
   workspace automatically and installs/builds from the repo root.
