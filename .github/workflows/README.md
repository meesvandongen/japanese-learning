# CI workflows

## `pr-preview.yml` — Expo preview on every PR

Triggered on `pull_request` open / synchronize / reopen. Publishes an
`eas update` to a per-PR branch (`pr-<NUMBER>`) and posts a PR comment
with a QR code. Scan it with Expo Go (SDK 55+) or any installed dev
client built from `eas build --profile development`.

### Required GitHub repository secret

| Secret        | How to obtain                                                                 |
|---------------|-------------------------------------------------------------------------------|
| `EXPO_TOKEN`  | expo.dev → Account settings → Access Tokens → "Create token". Grant it the `Publish updates` permission on the `japanese-learning` project. Paste it into GitHub → Settings → Secrets and variables → Actions. |

### One-time project setup

The first time you run this, `eas update` needs an EAS project registered:

```bash
cd apps/mobile
npx eas login
npx eas init          # creates the project, writes extra.eas.projectId
```

That command also fills in the `updates.url` in `app.json` (the
`u.expo.dev/<PROJECT_ID>` URL) — commit the resulting diff. Until this
is done, the workflow will fail with "No EAS project configured".

### When `eas update` is NOT enough

`eas update` only rebundles JS + assets. If a PR changes any of the
following, a full `eas build` is required (the preview comment won't
reflect the change):

- `app.json` `plugins`, `ios.*`, `android.*`, `permissions`, or
  `infoPlist` keys
- Adding / removing an `expo-*` or other native module
- Bumping the Expo SDK (`expo` major version)
- Changing `runtimeVersion`

For those, run a full build locally or via a manual trigger:

```bash
cd apps/mobile
npx eas build --profile preview --platform all
```

The `preview` profile in `eas.json` produces:

- iOS — simulator `.app` (drag-drop into an open simulator)
- Android — `.apk` (sideload onto any device)

Both are distributed internally via the "Internal distribution" link in
the EAS build output, no App Store / Play review needed.
