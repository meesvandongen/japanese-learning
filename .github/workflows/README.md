# CI workflows

## `pr-apk.yml` — Android release APK on every PR

Triggered on `pull_request` open / synchronize / reopen / close. Builds
a release APK with Gradle directly (no EAS, no Expo servers) and
publishes it to a per-PR GitHub Pre-release. The PR comment links
straight to the `.apk` file — single-click download, no zip step.

### Why a release instead of an artifact?

GitHub Actions artifacts are always zipped, which means a reviewer has
to download a zip and extract it before installing. A pre-release
asset is a single file at a permanent URL — one tap on a phone
downloads the APK directly into the OS's installer flow.

The downside: each PR creates a release. The cleanup job deletes the
release + tag automatically when the PR is closed or merged.

### What the build job does

1. Sets up Node 20, JDK 17 (Temurin), Android SDK
   (platform-tools + platforms;android-35 + build-tools;35.0.0).
2. Restores Gradle caches keyed on `*.gradle*` + wrapper.properties +
   `apps/mobile/package.json`.
3. `npm ci --legacy-peer-deps` — root postinstall copies kuromoji dict
   files into `apps/mobile/{public,assets}/dict/` and
   `packages/core/assets/dict/`.
4. `node scripts/generate-feedback-wavs.mjs` — emits the correct/
   incorrect/silence WAV files into `packages/core/assets/`.
5. `node scripts/generate-vocab-db.mjs` — emits `vocab.db` into
   `apps/mobile/{public,assets}/` AND `packages/core/assets/`.
   The last is what the native loader's `require()` resolves to.
6. `npx expo prebuild --platform android --clean --no-install` —
   generates `apps/mobile/android/`.
7. `./gradlew :app:assembleRelease` — emits `app-release.apk` (~117 MB).
8. Renames to `japanese-learning-pr<N>-<sha7>.apk`.
9. Creates / updates pre-release `pr-<N>` and uploads the APK as a
   release asset.
10. Sticky-comments on the PR with a direct download link.

### What the cleanup job does

Triggers on `pull_request.closed`. Runs `gh release delete pr-<N>
--cleanup-tag` so closed PRs don't leave orphan releases behind.

### Vocab data is bundled (no internet required)

The APK ships `vocab.db` (~1.2 MB) as a bundled asset. On first
launch, `openDatabase.native.ts` materialises the asset via
`Asset.fromModule()` + `expo-file-system` `File.copy()` into the
SQLite directory. Subsequent launches read directly from there. No
network call at any point.

The kuromoji dict files (~12 MB) are bundled the same way under
`assets/dict/` and loaded into ArrayBuffers on demand by
`loadDict.native.ts`.

### Gotchas the workflow already handles

- **`expo prebuild` needs PNG icons that don't exist in the repo.** The
  `app.json` was trimmed: `icon`, `splash`, `adaptiveIcon`, and `favicon`
  references were removed so prebuild uses Expo's defaults.
- **Native peer deps that aren't pulled in transitively** are added
  explicitly in `apps/mobile/package.json`:
  - `react-native-nitro-modules` (peer of react-native-mmkv@^4)
  - `react-native-worklets` (peer of react-native-reanimated@^4)
  - `expo-font` (peer of expo-symbols, indirect through Tamagui icons)
- **React Native 0.85.2 codegen crashes** on
  `VirtualViewExperimentalNativeComponent`. Pinned to `0.83.8` (the
  version Expo SDK 55 ships).
- **react-native-track-player 4.1.x has a Kotlin null-safety bug**
  against current React Native. Walk mode's native session was
  simplified to drop RNTP — re-enable when 5.x stabilises.
- **Gradle 9 + JDK 21 fails** because the React Native gradle plugin
  pins Kotlin to JDK 17. The workflow installs JDK 17 explicitly and
  sets `ORG_GRADLE_PROJECT_javaToolchainAutoDetect=false` so Gradle
  doesn't try to download a JDK at build time.
- **Bundle-time `require()`s need their assets on disk first.** The
  workflow runs the WAV + vocab.db generators before `expo prebuild`
  so Metro can resolve every `require()` in `packages/core/`.

### Signing

`expo prebuild` wires the `release` variant to the debug keystore by
default — fine for previews. Production signing is a follow-up.

### Caching

Gradle caches (`~/.gradle/caches`, `~/.gradle/wrapper`,
`apps/mobile/android/.gradle`) keyed on all `*.gradle*` + wrapper.properties
+ `apps/mobile/package.json`. First build ~12-15 min; cached ~4-5 min.

### Forked PRs

The build job's `if:` skips PRs from forks. Maintainers can manually
re-run after reviewing if they want to opt-in.

### Installing the APK

1. Open the PR comment on a phone, tap **Download .apk**.
2. The browser prompts to install the file.

For desktops:

```bash
adb install japanese-learning-prNN-abcdef.apk
```

### One-time setup

None. The workflow uses the default `GITHUB_TOKEN` for both the release
upload and the comment.
