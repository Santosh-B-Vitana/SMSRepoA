# Vitana SMS Mobile — Developer Guide

## Prerequisites

- **Node.js** 20+
- **pnpm** 11+ (`npm install -g pnpm`)
- **EAS CLI** (`npm install -g eas-cli`)
- **Expo account** — log in with `eas login`
- **iOS device** registered on the Apple Developer account (VITANA PRIVATE LIMITED, Team ID: KXD58APZCK)

---

## First-Time Setup

```bash
# 1. Clone and install dependencies from the repo root (not /mobile)
cd /path/to/SMSRepoA
pnpm install

# 2. Copy and fill the environment file
cd mobile
cp .env.example .env
# Edit .env: set EXPO_PUBLIC_API_BASE_URL to your backend IP
# e.g. EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:5092/api
```

---

## Running the App (Day-to-Day)

### Step 1 — Start Metro bundler

```bash
cd mobile
npx expo start --dev-client
```

Metro will print a URL like `exp://192.168.1.100:8081`. Keep this terminal open.

### Step 2 — Connect your device

Open the **Vitana SMS** dev client app on your iPhone.

- If it auto-detects the server → tap it
- If not → tap **Enter URL manually** and type the URL shown in Metro (e.g. `exp://192.168.1.100:8081`)

> Both your Mac and iPhone must be on the **same Wi-Fi network.**

### Step 3 — Hot reload

Once connected, any JavaScript change you save reloads automatically.
Shake the device to open the dev menu (reload, inspect, etc.).

---

## Installing the Dev Client App on a New Device

The dev client (the native shell) only needs to be installed once, or whenever native dependencies change.

### Install from the latest EAS build

**On the iPhone**, open Safari and go to:

```
https://expo.dev/accounts/laynaik/projects/vitana-sms
```

Tap the latest **development** build → tap **Install**.

Or install from the `.ipa` download link directly in Safari on the device.

#### If it says "Untrusted Developer"

**Settings → General → VPN & Device Management → VITANA PRIVATE LIMITED → Trust**

#### If it says "Developer Mode required" (iOS 16+)

**Settings → Privacy & Security → Developer Mode → Toggle ON** → restart → **Turn On**

---

## Pushing a New Native Build

A new EAS build is needed whenever you change:
- `package.json` (add/remove native packages)
- `app.config.js`
- Any file in `ios/` or `android/`
- `eas.json`

### Trigger the build

```bash
cd mobile

# iOS development build (installs on provisioned devices)
eas build --profile development --platform ios

# Android development build
eas build --profile development --platform android
```

The build runs in the cloud (~15–25 min). EAS prints a URL when done.

### Install the new build

Open the EAS build URL on your iPhone in Safari → **Install**.

> After installing a new native build, re-open the app and connect to Metro as normal. All your JavaScript changes from before still work — you don't need to re-bundle.

---

## Build Profiles

Defined in `eas.json`:

| Profile | Purpose | Distribution |
|---|---|---|
| `development` | Local dev with Metro | Internal (provisioned devices only) |
| `preview` | Staging build for testers | Internal (TestFlight-like) |
| `staging` | Staging App Store bundle | Internal |
| `production` | App Store release | App Store |

```bash
# Preview build (share with testers without Xcode)
eas build --profile preview --platform ios

# Production build
eas build --profile production --platform ios
```

---

## OTA Updates (JavaScript Only)

For pure JavaScript/TypeScript changes you can push an OTA update — no new EAS build needed and no reinstall on the device.

```bash
cd mobile

# Push update to the development channel
eas update --channel development --message "fix: login screen typo"

# Push update to production
eas update --channel production --message "feat: new dashboard"
```

Users get the update the next time they open the app (or within 30 seconds if the app is already open and backgrounded).

> OTA updates only work if the JavaScript change doesn't require new native code.
> If you added a native package → do a full EAS build instead.

---

## Environment Variables

| Variable | Where set | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `.env` / eas.json `env` | Backend API URL |
| `EXPO_PUBLIC_ENV` | `.env` / eas.json `env` | `development`, `staging`, `production` |
| `EAS_PROJECT_ID` | `.env` | Expo project UUID |
| `SENTRY_AUTH_TOKEN` | EAS secret (add via dashboard) | Sentry source map upload |
| `GOOGLE_SERVICES_PLIST` | EAS file secret | Firebase iOS config |
| `GOOGLE_SERVICES_JSON` | EAS file secret | Firebase Android config |

Set secrets on the EAS dashboard: https://expo.dev/accounts/laynaik/projects/vitana-sms/secrets

---

## Troubleshooting

### "Unable to resolve module X"
A package is imported in code but not installed.
```bash
cd mobile && pnpm install
# or
npx expo install <package-name>
```

### Metro can't connect to device
- Ensure Mac and iPhone are on the same Wi-Fi
- Try the LAN URL: `npx expo start --dev-client --lan`
- Check firewall: macOS may block port 8081

### Build fails with lockfile mismatch
```bash
cd /path/to/SMSRepoA
rm pnpm-lock.yaml && pnpm install
```

### ExpoModulesJSI build error (Swift 6)
Already handled automatically by `scripts/fix-expo-modules-jsi.js` which runs on every `pnpm install`. If it appears, run:
```bash
cd /path/to/SMSRepoA && pnpm install
```

### Sentry "Cannot find module @sentry/cli"
The `@sentry/react-native/expo` plugin is disabled by default (it requires `SENTRY_AUTH_TOKEN`). To enable symbolicated crash reports in production, add credentials as EAS secrets and uncomment the plugin in `app.config.js`.

---

## Key Files Reference

| File | Purpose |
|---|---|
| `mobile/app.config.js` | Expo config (icons, plugins, bundle ID, etc.) |
| `mobile/eas.json` | EAS build profiles and environment vars |
| `mobile/.env` | Local environment variables (not committed) |
| `mobile/babel.config.js` | Babel config (module aliases, reanimated plugin) |
| `mobile/tsconfig.json` | TypeScript path aliases |
| `pnpm-workspace.yaml` | pnpm monorepo config |
| `scripts/fix-expo-modules-jsi.js` | Auto-patches expo-modules-jsi for Swift 6 |
