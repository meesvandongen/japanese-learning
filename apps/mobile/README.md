# Japanese Learning — Mobile (Expo)

Expo app built from the shared `@japanese-learning/core` package.

## First-time setup

```bash
# From the repo root
npm install

# Generate the SQLite vocab DB (emits apps/web/public/vocab.db AND
# apps/mobile/assets/vocab.db so both platforms see the same data)
node scripts/generate-vocab-db.mjs

# Kuromoji dict files need to land under apps/mobile/assets/dict/ so Metro
# can bundle them. The web postinstall copies them to apps/web/public/dict;
# duplicate that step for mobile:
mkdir -p apps/mobile/assets/dict
cp node_modules/kuromoji/dict/*.dat.gz apps/mobile/assets/dict/
```

Also drop an Inter font file at `apps/mobile/assets/fonts/Inter.ttf` — the
Tamagui default theme references it from `app/_layout.tsx`.

## Run

```bash
cd apps/mobile
npx expo prebuild --clean   # one-time, generates native projects
npx expo run:ios            # or run:android
```

## Structure

- `app/`      — Expo Router routes (`_layout.tsx`, `index.tsx`, `onboarding.tsx`, `settings.tsx`, `profile.tsx`)
- `src/screens/` — React screens consumed by routes (StudyScreen, FlashcardSpeak, FlashcardTranslate)
- `tamagui.config.ts` — design tokens (extracted from `apps/web/src/index.css`)
- `metro.config.js` — monorepo-aware Metro config; adds root `node_modules` and `packages/core`
- `babel.config.js` — `expo`, `@tamagui/babel-plugin`, `react-native-reanimated/plugin`
- `app.json` — mic/speech permissions, `UIBackgroundModes: ['audio']`, foreground-service declarations

## Shared code

All non-platform logic (SRS, utils, store, hooks with `.native.ts` forks,
`db/`, `tokenizer/`) lives in `packages/core/src`. Metro's platform-extension
resolver picks `.native.ts` on device builds; Vite picks `.web.ts` for the
web app.

## Walk mode (Phase 6)

Not wired up yet. iOS needs `AVAudioSession` configured as `.playAndRecord`
with `.spokenAudio` mode and `react-native-track-player` running a silent
queue to keep the audio session active from the lock screen. Android needs
a foreground service with `foregroundServiceType="microphone|mediaPlayback"`.
See `docs/react-native-migration-plan.md` §Background / Lock-Screen Study.
