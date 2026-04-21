# React Native Migration Plan

Porting the Japanese Learning app from Vite + React DOM to Expo + React
Native + React Native Web, with Tamagui as the UI layer.

## Goals

1. Single codebase that produces an iOS app, Android app, and a web build.
2. Single source of truth for vocab data (SQLite, no JSON fallback).
3. Background / lock-screen study mode with live STT on both iOS and Android.
4. Runtime kuromoji tokenization preserved (used to normalize STT utterances,
   not just to pre-tokenize example sentences).

## Stack Decision

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Expo SDK 54+ (React Native 0.76+) | Managed native modules for speech, audio, keep-awake, SQLite, FileSystem, TaskManager |
| Router | Expo Router | File-based, mental model mirrors TanStack Router |
| Web output | React Native Web via Metro | Same component tree; Cloudflare static hosting still works |
| UI | Tamagui | Best perf + web parity; compiler strips unused styles |
| Data | expo-sqlite (native) + @sqlite.org/sqlite-wasm w/ OPFS (web) | Single schema, indexed, FTS5 |
| Local KV | MMKV (native) + localStorage (web) via zustand storage adapter | For ephemeral UI prefs only |
| STT | expo-speech-recognition primary, Web Speech on web | Shared interface, `.native.ts` / `.web.ts` fork |
| TTS + media session | react-native-track-player + expo-speech (native), speechSynthesis (web) | RNTP gives lock-screen controls & headphone remote |
| Wake/keep-awake | expo-keep-awake (native), navigator.wakeLock (web) | |
| Tokenizer | @patdx/kuromoji (runtime, both platforms) | Modern fork accepting ArrayBuffer — no UMD hack |

## Current Surface Audit

Confirmed against the codebase:

| Concern | Current | File |
|---|---|---|
| Router | TanStack Router | `src/router.tsx` |
| Persistence | Zustand + localStorage | `src/store/appStore.ts:37-59`, `src/store/settingsStore.ts` |
| Fetch | `fetch('/vocab/...')` | `src/hooks/useVocabulary.ts:6,12` |
| Tokenizer | kuromoji UMD + `/dict` dat.gz | `index.html:18`, `src/hooks/useKuromoji.ts:9-20` |
| STT | Web Speech API (Chrome/Edge only) | `src/hooks/useSpeechRecognition.ts:68` |
| TTS | speechSynthesis | `src/hooks/useSpeechSynthesis.ts` |
| Audio feedback | WebAudio procedural tones | `src/hooks/useAudioFeedback.ts` |
| Wake lock | navigator.wakeLock | `src/hooks/useWakeLock.ts` |
| SW | Minimal install/activate stub | `public/sw.js` |
| Styles | 1 225-line flat CSS | `src/index.css` |
| Postinstall | Copies kuromoji dict + bundle into `public/` | `package.json:6` |

Vocab: 5 JSON files totaling ~1.24 MB (N1=447 KB heaviest).

## Shared-vs-Forked Surface

**Shared, ported as-is** (pure TS, no DOM/Node APIs):
- `src/srs/*` — scheduler + SM-2
- `src/utils/normalize.ts`, `src/utils/phonetic.ts`, `src/utils/reportUrl.ts`
- `src/types/*`
- `wanakana` usage (pure JS)
- Zustand store logic — swap only the persist storage adapter

**Platform-forked** (thin `.native.ts` / `.web.ts` shims behind stable hooks):
1. `loadDict.ts` — expo-file-system asset vs. fetch+ServiceWorker cache
2. `loadDatabase.ts` — expo-sqlite bundled asset vs. sqlite-wasm + OPFS
3. `useSpeechRecognition.ts` — expo-speech-recognition vs. Web Speech API
4. `useSpeechSynthesis.ts` — expo-speech + RNTP vs. speechSynthesis
5. `useWakeLock.ts` — expo-keep-awake vs. navigator.wakeLock
6. `useAudioFeedback.ts` — expo-audio (prebuilt beep wav) vs. WebAudio

**Rewritten**: every component in `src/components/` and `src/pages/` — JSX elements
(`div`, `button`, `nav`) become Tamagui primitives (`Stack`, `Button`, `XStack`).
Logic stays intact; structure and styling get ported.

## Data Layer (single source of truth)

Current: 5 JSON files, in-memory after fetch, card state in Zustand-persisted
localStorage. Two write surfaces. Replace with one SQLite database shared across
platforms.

### Schema

```sql
CREATE TABLE words (
  id INTEGER PRIMARY KEY,
  language_id TEXT NOT NULL,
  level_id TEXT NOT NULL,
  japanese TEXT NOT NULL,
  kana TEXT NOT NULL,
  english TEXT NOT NULL,           -- JSON array
  hint TEXT,
  alt TEXT                          -- JSON array
);
CREATE INDEX idx_words_lang_level ON words(language_id, level_id);
CREATE UNIQUE INDEX idx_words_kana ON words(language_id, kana);

CREATE VIRTUAL TABLE words_fts USING fts5(english, kana, japanese,
  content='words', content_rowid='id');

CREATE TABLE card_state (
  language_id TEXT NOT NULL,
  kana TEXT NOT NULL,
  ease REAL NOT NULL,
  interval INTEGER NOT NULL,
  repetitions INTEGER NOT NULL,
  due_date INTEGER,
  PRIMARY KEY (language_id, kana)
);

CREATE TABLE kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);  -- streak, selected language/level, manifest version
```

### Build pipeline

`scripts/generate-vocab.mjs` already reads `scripts/sources/<lang>/<level>.json`
and emits `public/vocab/*.json`. Swap the emit step:

1. Seed an empty vocab database.
2. `INSERT INTO words` for each source entry.
3. Populate `words_fts` via `INSERT INTO words_fts(words_fts) VALUES('rebuild')`.
4. Run `VACUUM` and write the `.db` file to `assets/vocab.db` (native bundle)
   and `public/vocab.db` (web fetch target).

### Runtime access

- **Native**: `expo-sqlite.openDatabaseAsync('vocab.db', { useExistingDatabase: true })`.
  Copy the bundled asset into the app's data dir on first launch.
- **Web**: load `sqlite3.wasm` once, open the DB via OPFS-backed VFS, fetch
  `/vocab.db` and persist to OPFS. Subsequent launches hit OPFS — zero network.

Both paths resolve to the same `DB` interface (`prepare`, `run`, `all`). Hook:

```ts
// src/db/index.ts — shared
export async function getWords(lang: string, level: string): Promise<Word[]>
export async function searchEnglish(query: string): Promise<Word[]>
export async function getCardState(lang: string, kana: string): Promise<CardState | null>
export async function putCardState(lang: string, kana: string, state: CardState): Promise<void>
```

Card state moves into SQLite — eliminates the Zustand `persist` middleware for
card data. Zustand keeps UI-only state (open menus, transient flags).

## Kuromoji at Runtime

Tokenizer is needed for STT normalization (inflection → base form, reading
extraction), so pre-tokenization is not viable. Keep it on both platforms,
abstracted behind one load function.

```ts
// src/tokenizer/loadDict.native.ts
import * as FileSystem from 'expo-file-system'
import { Asset } from 'expo-asset'

export async function loadDictFiles(): Promise<Map<string, ArrayBuffer>> {
  const files = ['base.dat.gz', 'cc.dat.gz', 'check.dat.gz', /* ... */]
  const map = new Map<string, ArrayBuffer>()
  for (const name of files) {
    const asset = Asset.fromModule(require(`../../assets/dict/${name}`))
    await asset.downloadAsync()
    const buf = await FileSystem.readAsStringAsync(asset.localUri!, { encoding: 'base64' })
    map.set(name, base64ToArrayBuffer(buf))
  }
  return map
}
```

```ts
// src/tokenizer/loadDict.web.ts
export async function loadDictFiles(): Promise<Map<string, ArrayBuffer>> {
  const files = ['base.dat.gz', /* ... */]
  const map = new Map<string, ArrayBuffer>()
  for (const name of files) {
    const res = await fetch(`/dict/${name}`)
    map.set(name, await res.arrayBuffer())
  }
  return map
}
```

Shared builder using `@patdx/kuromoji` (takes ArrayBuffers directly — no
`<script>` tag, no `dicPath` fetch). Service worker on web gets a
`staleWhileRevalidate` rule for `/dict/*` so the ~12 MB is downloaded once and
persists.

Deletions: `public/kuromoji.js`, `public/dict/` at runtime (web still serves
them statically, but no UMD shim in HTML), the kuromoji UMD `<script>` tag in
`index.html`, the `postinstall` kuromoji copy step.

## Speech Recognition

```ts
// src/hooks/useSpeechRecognition.ts — type-only, both platforms implement this
export function useSpeechRecognition(opts: {
  lang: string
  onResult: (transcripts: string[]) => void
  onError: (msg: string) => void
  contextualStrings?: string[]   // native only, bias toward expected vocab
}): { isListening: boolean; start: () => void; stop: () => void }
```

### Native (`.native.ts`)

`expo-speech-recognition`:
- `continuous: true`
- `requiresOnDeviceRecognition: true` (iOS 13+, Android 13+)
- `contextualStrings: [card.kana, card.japanese, ...card.alt]` — single-word
  flashcard prompts benefit hugely from bias
- `addsPunctuation: false`

### Web (`.web.ts`)

Port current `useSpeechRecognition.ts` verbatim; the chat's existing notes at
lines 39-51 explaining why the Web Speech API misbehaves all still apply.

## Background / Lock-Screen Study ("Walk Mode")

**Insight from research (cited in the chat):** iOS does allow the mic to keep
running from the lock screen, provided the session was initiated from the
foreground. The restriction is on *starting* a mic capture while backgrounded,
not on *continuing* one.

### iOS requirements

- `Info.plist`: `UIBackgroundModes = ['audio']`
- `NSMicrophoneUsageDescription` + `NSSpeechRecognitionUsageDescription`
- `AVAudioSession` category `.playAndRecord`, mode `.measurement` or `.spokenAudio`
- Session must stay active: keep recording and/or play audio continuously (RNTP
  cues work for this)
- `expo-speech-recognition` with `requiresOnDeviceRecognition: true` to avoid
  network dependency
- App Store review notes must state the language-learning use case clearly

### Android requirements

- Foreground service with `foregroundServiceType="microphone|mediaPlayback"`
- `FOREGROUND_SERVICE_MICROPHONE` permission (API 34+)
- Persistent notification while active
- `expo-task-manager` for the service lifecycle, or a custom config plugin

### UX design

1. User enters walk mode from foreground. Permission + explanation modal.
2. App activates audio session, starts RNTP, starts continuous STT.
3. RNTP now-playing metadata shows current prompt; lock-screen controls map to:
   - Play/pause → pause/resume queue
   - Next → mark Easy
   - Previous → mark Again
4. Loop: TTS prompt → wait for utterance → tokenize + compare → audio feedback
   → advance.
5. Exit: user unlocks and hits stop, or audio focus is lost (phone call),
   session stops gracefully and resumes via lock-screen button.

## Store Changes

```ts
// src/store/appStore.ts
import { createJSONStorage, persist } from 'zustand/middleware'
import { storage } from './storage'   // .native = MMKV, .web = localStorage

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({ /* unchanged */ }),
    { name: 'jp-flashcards-srs-v1', storage: createJSONStorage(() => storage) }
  )
)
```

Card state is moved out of this store into SQLite. `cards: Record<string, CardState>`
becomes an async query plus a `useCardState(kana)` hook. Streak and
language/level selection stay in the store.

## Styling

Tamagui replaces `src/index.css` entirely.

1. Extract tokens from the CSS (colors, spacing, radii, font sizes) into
   `tamagui.config.ts`.
2. Rewrite each component using Tamagui primitives. Component names stay the
   same, JSX structure mostly unchanged.
3. Delete `index.css` when the last component is ported.
4. Run Tamagui's optimizing compiler; web bundle will be smaller than the
   current CSS + React DOM output.

## Service Worker & Web Build

- Replace the 3-line `public/sw.js` stub with a Workbox-generated SW registered
  by the Metro web output.
- Cache rules: `staleWhileRevalidate` for `/dict/*` and `/vocab.db`;
  `cacheFirst` for static assets.
- Keep Cloudflare static hosting — Metro emits plain files.

## Phased Migration

Each phase is shippable on the current web app.

### Phase 0 — Hook boundary tightening (current repo, web only)
- Audit components to confirm they only use speech/audio/wake/tokenizer via
  hooks, never raw APIs. Currently true but re-verify after
  `FlashcardMode1.tsx` changes.
- Extract `useSpeechRecognition`, `useSpeechSynthesis`, `useAudioFeedback`,
  `useWakeLock`, `useKuromoji` to clean, platform-agnostic interfaces (they
  already are — mostly a naming pass).
- Ship.

### Phase 1 — SQLite vocab (current repo, web only)
- Add sqlite-wasm + OPFS to the web app.
- Rewrite `scripts/generate-vocab.mjs` to emit `vocab.db`.
- Replace `useVocabulary` with `getWords` from `src/db/`.
- Move card state into SQLite.
- Delete JSON vocab files and the `fetch('/vocab/*.json')` path.
- Ship.

### Phase 2 — Kuromoji ArrayBuffer loader (current repo, web only)
- Swap `window.kuromoji` UMD for `@patdx/kuromoji` imported as ESM.
- Introduce `loadDictFiles()` behind `.web.ts`. Remove UMD `<script>` tag and
  `postinstall` dict copy.
- Ship.

### Phase 3 — Expo scaffold in monorepo
- Add `apps/mobile` (Expo) and `apps/web` (existing Vite → Metro-web later) as
  pnpm workspaces alongside current `src/`.
- Move shared code (`srs/`, `utils/`, `types/`, `store/`, `db/`, `tokenizer/`) into
  `packages/core`.
- Apps consume `packages/core` via workspace protocol.

### Phase 4 — Tamagui port of components
- Set up `tamagui.config.ts` with extracted tokens.
- Port components one by one; keep web app running throughout.
- Replace `tanstack-router` with `expo-router` once `RootLayout` is ported.

### Phase 5 — Native platform shims
- Add `.native.ts` implementations for each platform-forked hook.
- Ship an alpha TestFlight / internal-track build.

### Phase 6 — Walk mode
- iOS background audio + continuous STT.
- Android foreground service.
- RNTP lock-screen controls.

### Phase 7 — Web migration to Metro
- Replace Vite build with Metro's web output.
- Delete `vite.config.ts`, `public/kuromoji.js` (if still present), keep
  `wrangler.jsonc` for deploy.
- Workbox SW.

## Risks

- **Tamagui visual parity** with the current CSS — budget real QA time.
- **iOS App Store review** for `UIBackgroundModes: ['audio']` — use-case must be
  credible. Precedents exist (Otter, AudioPen, language tutors).
- **Android foreground service** permission flow is noisy — onboarding needs a
  clear explainer.
- **sqlite-wasm on web** increases initial payload by ~700 KB wasm; one-time
  download, but measurable first-load cost. Acceptable given the data-size win.
- **expo-speech-recognition** on older Android (<13) falls back to Google
  Services online recognition — still works, but we lose the offline guarantee
  for that tier.

## Out of Scope For This Plan

- Switching SRS algorithm (still SM-2).
- Adding cloud sync / accounts.
- New vocab sources or languages.
- Notifications, widgets, App Intents — list as phase 8+ follow-ups.
