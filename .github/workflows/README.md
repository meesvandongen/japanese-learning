# CI workflows

## `pr-apk.yml` — Android release APK on every PR

Triggered on `pull_request` open / synchronize / reopen. Builds a release
APK with Gradle directly (no EAS, no Expo servers) and attaches it to the
workflow run as a GitHub Actions artifact. A sticky comment on the PR
links to the download.

### What it does

1. Sets up Node 20, JDK 17, Android SDK (platforms:android-35, build-tools:35.0.0).
2. Runs `npm ci --legacy-peer-deps` at the workspace root.
3. Regenerates `vocab.db` from sources so the APK matches the PR's head.
4. `npx expo prebuild --platform android --clean --no-install` — generates
   `apps/mobile/android/` from the managed `app.json` config. Autolinks
   every native module (expo-sqlite, react-native-mmkv,
   react-native-track-player, expo-speech-recognition…).
5. `./gradlew :app:assembleRelease` in `apps/mobile/android/`.
6. Uploads the resulting APK as `japanese-learning-pr<N>-<sha>` with
   14-day retention.
7. Sticky-comments on the PR (`marocchino/sticky-pull-request-comment`)
   with a link to the artifact download.

### Signing

`expo prebuild` wires the `release` variant to use the debug keystore by
default. That's fine for PR previews — every reviewer's device already
trusts the debug keystore so the APK installs without fuss. The tradeoff
is that PR builds can't coexist with a production install (different
signature, Android refuses to overlay).

For production APKs (or if two PR builds need to install side-by-side
with production), add a real signing config under
`apps/mobile/android/app/build.gradle` and pass the keystore bits as
GitHub secrets.

### Caching

Gradle caches (`~/.gradle/caches`, `~/.gradle/wrapper`, and the project's
`.gradle/`) are keyed on all `*.gradle*` files + `gradle-wrapper.properties`
+ `apps/mobile/package.json`. First build is ~12 min; subsequent runs on
the same key finish in ~4-5 min.

### Forked PRs

The workflow `if:` skips forked PRs. Running `expo prebuild` from an
untrusted fork would execute arbitrary native code from the PR's
`node_modules`, which is too risky to auto-execute. Fork PRs still open
and review normally — they just don't get an automatic APK. Manual
trigger via `workflow_dispatch` can be added later if this becomes a
pain point.

### Installing the APK

```bash
# Locally, from the downloaded zip:
unzip japanese-learning-prNN-abcdef.zip
adb install japanese-learning-prNN-abcdef1.apk

# Or drop the .apk into any file manager on the device and tap it
# (needs "Install from unknown sources" enabled for that file source).
```

### One-time setup

None. The workflow has no required secrets — it runs entirely on the
runner.
