# Japanese Learning — Expo

Single Expo codebase targeting iOS, Android, **and** the web (via
`expo export --platform web`, which runs Metro in web-bundler mode and
emits a static site to `./dist`).

All UI is shared via `@japanese-learning/core` (Tamagui primitives). Only
the app shell (routes, providers) lives here.

## Install

```bash
# From the repo root — npm workspaces resolve everything in one pass.
npm install
```

The postinstall script copies kuromoji dict files into `./public/dict/`
(for web) and `./assets/dict/` (for the native bundle). The SQLite vocab
DB is built by `node scripts/generate-vocab-db.mjs` at the repo root and
lands in both `./public/vocab.db` and `./assets/vocab.db`.

## Run

```bash
# Dev
npx expo start             # QR code + dev menu (all platforms)
npx expo start --web       # web only, http://localhost:8081

# Build
npx expo run:ios           # compile + install a dev build on a simulator / device
npx expo run:android       # same for Android

# One-time native project generation (after app.json changes)
npx expo prebuild --clean
```

## Deploy (web, Cloudflare)

```bash
npm run build:web          # → dist/
npm run deploy             # wrangler deploy uses wrangler.jsonc → dist/
```

## Structure

- `app/` — Expo Router routes. File-based routing; each `.tsx` file is a
  route. `_layout.tsx` mounts `TamaguiProvider`, `QueryClientProvider`,
  `GestureHandlerRootView`, `SafeAreaProvider`, and registers the web SW.
- `assets/` — native bundled assets (font, SQLite DB, kuromoji dict).
- `public/` — web-only static files (copied into `dist/` by Expo's web
  exporter). `sw.js`, `_headers`, `/dict/*`, `/vocab.db`.
- `tamagui.config.ts` — design tokens. Also re-exported by the (removed)
  web app's config for backwards compat.
- `metro.config.js` — monorepo-aware Metro. Watches root `node_modules`
  + `packages/core`. Dev server serves `/dict/*.dat.gz` as raw binary so
  kuromoji can decompress them.
- `babel.config.js` — `babel-preset-expo` + `@tamagui/babel-plugin` +
  `react-native-reanimated/plugin`.
- `app.json` — iOS mic + speech permissions, `UIBackgroundModes: [audio]`,
  Android foreground-service permissions.
- `tests/` — Playwright smoke tests for the web build (run via
  `npm run test:e2e`; boots via `wrangler dev` against `dist/`).

## Walk mode

Foreground-only currently. Walk mode (iOS AVAudioSession `.playAndRecord`
+ RNTP lock-screen queue, Android foreground service with
`foregroundServiceType="microphone|mediaPlayback"`) is scoped as a
follow-up — see the matching phase in `docs/react-native-migration-plan.md`.
