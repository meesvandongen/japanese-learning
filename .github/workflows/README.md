# CI workflows

## `pr-apk.yml` — Android release APK on every PR

Triggered on `pull_request` open / synchronize / reopen. Builds a release
APK with Gradle directly (no EAS, no Expo servers) and attaches it to the
workflow run as a GitHub Actions artifact. A sticky comment on the PR
links to the download.

### What it does

1. Sets up Node 20, JDK 17 (Temurin), Android SDK
   (platform-tools + platforms;android-35 + build-tools;35.0.0).
2. Restores Gradle caches keyed on `*.gradle*` + wrapper.properties +
   `apps/mobile/package.json`.
3. `npm ci --legacy-peer-deps` — root postinstall copies kuromoji dict
   files into `apps/mobile/{public,assets}/dict/` and
   `packages/core/assets/dict/` so the Metro bundler can resolve the
   `require()`s in `useAudioFeedback.native.ts` and `loadDict.native.ts`.
4. `node scripts/generate-feedback-wavs.mjs` — emits the correct/
   incorrect/silence WAV files.
5. `node scripts/generate-vocab-db.mjs` — emits `vocab.db`.
6. `npx expo prebuild --platform android --clean --no-install` —
   generates `apps/mobile/android/` with every native module autolinked
   (expo-sqlite, react-native-mmkv + react-native-nitro-modules,
   react-native-reanimated + react-native-worklets,
   expo-speech-recognition, …).
7. `./gradlew :app:assembleRelease` in `apps/mobile/android/` — emits
   `app-release.apk` (~117 MB).
8. Uploads the APK as `japanese-learning-pr<N>-<sha>` (14-day retention).
9. Sticky-comments on the PR linking to the artifact.

### Gotchas the workflow already handles

- **`expo prebuild` needs PNG icons that don't exist in the repo.** The
  `app.json` was trimmed: `icon`, `splash`, `adaptiveIcon`, and `favicon`
  references were removed so prebuild uses Expo's defaults instead of
  failing on missing files.
- **Native peer deps that aren't pulled in transitively.** Added
  explicitly to `apps/mobile/package.json`:
  - `react-native-nitro-modules` (peer of react-native-mmkv@^4)
  - `react-native-worklets` (peer of react-native-reanimated@^4)
  - `expo-font` (peer of expo-symbols, indirect through Tamagui icons)
- **React Native 0.85.2 codegen crashes** on
  `VirtualViewExperimentalNativeComponent` ("Unable to determine event
  arguments for 'onModeChange'"). Pinned to `0.83.8` (the version
  Expo SDK 55 ships).
- **react-native-track-player 4.1.x has a Kotlin null-safety bug**
  against RN 0.83+. Walk mode's native session was simplified to drop
  RNTP — the audio session is still configured via `setAudioModeAsync`,
  but lock-screen transport controls + persistent foreground service
  are deferred. Re-enable when RNTP 5.x stabilises.
- **Gradle 9 + JDK 21 fails** because the React Native gradle plugin
  pins Kotlin to JDK 17 and Gradle's toolchain auto-download is blocked
  on the runner. The workflow installs JDK 17 explicitly and sets
  `ORG_GRADLE_PROJECT_javaToolchainAutoDetect=false`.
- **JS bundle requires generated assets.** The `correct.wav`,
  `incorrect.wav`, kuromoji `*.dat.gz`, and `vocab.db` files all need
  to land before Metro runs, or the bundler fails on `require()`s that
  don't resolve. The workflow runs the generators (and the postinstall)
  before `expo prebuild`.

### Signing

`expo prebuild` wires the `release` variant to the debug keystore by
default. That's fine for PR previews — every reviewer's device already
trusts the debug keystore so the APK installs cleanly. The tradeoff is
that PR builds can't coexist with a production install (different
signature, Android refuses to overlay).

For production APKs, add a real signing config under
`apps/mobile/android/app/build.gradle` and pass the keystore bits as
GitHub secrets.

### Caching

Gradle caches (`~/.gradle/caches`, `~/.gradle/wrapper`,
`apps/mobile/android/.gradle`) are keyed on all `*.gradle*` files +
`gradle-wrapper.properties` + `apps/mobile/package.json`. First build is
~12-15 min; subsequent runs on the same key finish in ~4-5 min.

### Forked PRs

The workflow `if:` skips PRs from forks. Auto-running `expo prebuild` +
arbitrary `node_modules` install scripts on untrusted code is too risky
to do unconditionally. Maintainers can manually add a
`workflow_dispatch` trigger if they want to opt-in fork builds.

### Installing the APK

```bash
# From the downloaded zip:
unzip japanese-learning-prNN-abcdef.zip
adb install japanese-learning-prNN-abcdef.apk

# Or drop the .apk into any file manager on the device and tap it
# (needs "Install from unknown sources" enabled for that source).
```

### One-time setup

None required. The workflow runs entirely on the GitHub-hosted runner
with no secrets.
