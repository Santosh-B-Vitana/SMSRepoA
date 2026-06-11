# Vitana SMS Mobile — Developer Running Guide

> **Who This Is For:** Every engineer working on the Vitana mobile app  
> **Version:** 1.0 | June 2026  
> **Read before your first day on the mobile project.**

---

## Table of Contents

1. [Machine Setup (Do Once)](#1-machine-setup-do-once)
2. [Running the App — First Time](#2-running-the-app--first-time)
3. [Running on Android Emulator](#3-running-on-android-emulator)
4. [Running on iOS Simulator (macOS only)](#4-running-on-ios-simulator-macos-only)
5. [Running on a Physical Android Phone](#5-running-on-a-physical-android-phone)
6. [Running on a Physical iPhone](#6-running-on-a-physical-iphone)
7. [Expo Go vs Development Build](#7-expo-go-vs-development-build)
8. [Connecting to the Backend](#8-connecting-to-the-backend)
9. [Daily Development Workflow](#9-daily-development-workflow)
10. [Debugging Tools](#10-debugging-tools)
11. [Hot Reload & Fast Refresh](#11-hot-reload--fast-refresh)
12. [Common Errors & Fixes](#12-common-errors--fixes)
13. [EAS Cloud Builds (CI/CD)](#13-eas-cloud-builds-cicd)

---

## 1. Machine Setup (Do Once)

### 1.1 Required for All Platforms

```bash
# Node.js 22 LTS (check with: node --version)
# macOS:
brew install node@22
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Windows/Linux:
# Use nvm: https://github.com/nvm-sh/nvm
nvm install 22 && nvm use 22

# pnpm 9 (check with: pnpm --version)
npm install -g pnpm@9

# Expo CLI + EAS CLI (check with: expo --version, eas --version)
npm install -g @expo/eas-cli expo-cli
```

### 1.2 macOS (for iOS Development)

```bash
# Xcode — install from App Store (≈12 GB, takes 20–30 minutes)
# After installation:
sudo xcode-select --install
sudo xcodebuild -license accept
open /Applications/Xcode.app  # Open once to complete setup

# Watchman (required for Metro on macOS)
brew install watchman

# Ruby (for CocoaPods — used by Expo bare workflow later)
brew install rbenv
rbenv install 3.2.0
rbenv global 3.2.0
gem install cocoapods
```

### 1.3 Android Development (All Platforms)

**Install Android Studio:**
1. Download from https://developer.android.com/studio
2. Install with default options
3. Open Android Studio → SDK Manager (⌘+Shift+A on Mac) → SDK Tools tab
4. Install:
   - Android SDK Build-Tools 34
   - Android Emulator
   - Android SDK Platform-Tools
   - Intel x86 Emulator Accelerator (HAXM) — or Apple Virtualization Framework on Apple Silicon

**Configure environment variables** (add to `~/.zshrc` or `~/.bashrc`):

```bash
# macOS (Apple Silicon)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Verify
source ~/.zshrc
adb --version        # Should print version
emulator -list-avds  # Lists available emulators
```

**Install Java 17** (required for building Android):

```bash
# macOS
brew install --cask temurin@17
# Set JAVA_HOME
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home

# Verify
java --version  # Should print "openjdk 17.x.x"
```

### 1.4 Create an Android Emulator (AVD)

1. Open Android Studio
2. Click `Device Manager` in the toolbar
3. Click `+ Create Device`
4. Select: **Pixel 7** (recommended — good mid-range representation)
5. Select system image: **API 34, x86_64** (download if needed)
6. Name: `Pixel_7_API34`
7. Click Finish
8. Click the ▶ Play button to start the emulator

Alternatively via command line:

```bash
# List available AVDs
emulator -list-avds

# Start an AVD
emulator -avd Pixel_7_API34

# Create a new AVD headlessly (alternative)
sdkmanager "system-images;android-34;google_apis;x86_64"
avdmanager create avd -n Pixel7 -k "system-images;android-34;google_apis;x86_64" -d "pixel_7"
```

### 1.5 Verify Everything Works

```bash
node --version    # v22.x.x
pnpm --version    # 9.x.x
expo --version    # Latest
eas --version     # Latest
adb --version     # Android Debug Bridge
java --version    # openjdk 17.x.x

# macOS only
xcrun simctl list  # Lists available iOS simulators
```

---

## 2. Running the App — First Time

```bash
# Step 1: Clone (if not already done)
git clone https://github.com/vitana/SMSRepoA.git
cd SMSRepoA

# Step 2: Install all workspace packages
pnpm install
# This installs: mobile/, ui/, packages/shared-types, packages/shared-utils

# Step 3: Build shared packages (required before mobile can import them)
pnpm --filter @vitana/shared-types build
pnpm --filter @vitana/shared-utils build

# Step 4: Create local environment file
cp mobile/.env.example mobile/.env.local
# Edit mobile/.env.local and fill in your API base URL

# Step 5: Start the Expo development server
pnpm --filter @vitana/mobile start
# OR: cd mobile && npx expo start

# You should see:
# ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
# █ ▄▄▄▄▄ █ ▀▄█ ▀███ ▄▄▄▄▄ █
# ...
# [QR CODE HERE]
# ...
# › Metro waiting on exp://192.168.1.5:8081
# › Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
# › Press a │ open Android
# › Press i │ open iOS simulator
# › Press w │ open web
```

**What the Metro server URL means:**  
`exp://192.168.1.5:8081` — this is your machine's local IP + Metro port. Your phone must be on the **same WiFi network** to connect.

---

## 3. Running on Android Emulator

**Option A — From the Metro terminal (easiest):**
```bash
# With Metro already running, press:
a
# Metro opens the app in the running Android emulator automatically
```

**Option B — Explicit command:**
```bash
# Start Metro and open Android simultaneously
pnpm --filter @vitana/mobile android
```

**Option C — Manual ADB install (if Expo can't connect):**
```bash
# Check emulator is running
adb devices
# Output: List of devices attached
#         emulator-5554   device

# Force open the app
adb -s emulator-5554 shell monkey -p com.vitana.sms 1
```

**Performance tip:** Android emulators are slow on Intel Macs. Use a physical Android phone for a much better experience. Apple Silicon Macs run Android emulators well.

---

## 4. Running on iOS Simulator (macOS only)

**Option A — From the Metro terminal:**
```bash
# With Metro running, press:
i
# Expo opens the iOS simulator with the app installed
```

**Option B — Specify simulator:**
```bash
# List available simulators
xcrun simctl list devices available

# Open specific simulator (replace with desired device)
npx expo start --ios --device "iPhone 15 Pro"
```

**Option C — Open Simulator manually:**
```bash
# Open Simulator app
open -a Simulator

# In the Simulator, select: File > Open Simulator > iOS 17 > iPhone 15
```

**Recommended simulators for testing:**
- iPhone 15 (default — represents standard phones)
- iPhone SE 3rd gen (represents smallest supported screen)
- iPad Pro 12.9" (tablet layout testing)

---

## 5. Running on a Physical Android Phone

This is the **recommended way to develop** — real hardware gives the truest performance picture.

### 5.1 Enable Developer Options on Your Android Phone

1. Open **Settings** → **About Phone**
2. Find **Build Number** (may be under Software Information)
3. Tap **Build Number 7 times** rapidly
4. You'll see "You are now a developer!"
5. Go back to Settings → **Developer Options** is now visible

### 5.2 Enable USB Debugging

1. Open **Developer Options**
2. Enable **USB Debugging** (toggle ON)
3. Enable **Install via USB** (toggle ON)
4. Enable **USB debugging (Security settings)** if present

### 5.3 Connect Phone to Mac

```bash
# Connect phone via USB cable
# Phone will show a dialog: "Allow USB Debugging?"
# Tap "Always allow from this computer" → OK

# Verify connection
adb devices
# Should show: List of devices attached
#              R3CT1001234   device    ← your phone's serial number
```

### 5.4 Run the App via USB

```bash
# Start Metro dev server first
pnpm --filter @vitana/mobile start

# In a second terminal, press 'a' OR run:
npx expo run:android

# Metro will build a dev APK and install it on your phone.
# First run takes 2–5 minutes (Gradle build).
# Subsequent runs are fast (Metro hot reload).
```

### 5.5 Connect Wirelessly (WiFi — After USB Setup)

Once ADB is paired via USB once, you can disconnect the cable and use WiFi:

```bash
# With phone connected via USB, enable wireless debugging
adb tcpip 5555

# Disconnect USB cable, then:
adb connect 192.168.1.X:5555
# (replace X with your phone's WiFi IP: Settings > WiFi > your network)

# Verify
adb devices
# Should show: 192.168.1.X:5555   device

# Phone and Mac must be on same WiFi network
```

**Pro tip for Android 11+:** Use **Wireless Debugging** in Developer Options:
1. Developer Options → **Wireless Debugging** → Enable
2. Tap "Pair device with QR code"
3. In terminal: `adb pair <IP>:<PORT>` using the code shown on phone

### 5.6 Metro QR Code Scan (Alternative)

Instead of USB, scan the QR code shown in the Metro terminal using the **Expo Go app**:

1. Install **Expo Go** from Play Store on your Android phone
2. Make sure your phone is on the same WiFi as your Mac
3. Open Expo Go → tap "Scan QR code"
4. Scan the QR code from Metro terminal
5. App opens instantly

**Note:** Expo Go has limitations (see Section 7). Use a development build for full functionality.

---

## 6. Running on a Physical iPhone

### 6.1 Install Expo Go (Simplest Method)

1. Install **Expo Go** from the App Store
2. Make sure iPhone is on the same WiFi as your Mac
3. Open your iPhone's **Camera app**
4. Point it at the QR code in the Metro terminal
5. Tap the notification banner to open in Expo Go

**Limitation:** Expo Go doesn't support all native modules. Use a development build for the full Vitana SMS experience.

### 6.2 Development Build on Physical iPhone (Full Method)

**Requires:** Apple Developer account (free for personal testing, $99/year for distribution)

```bash
# 1. Register your iPhone's UDID with Apple Developer
# Get UDID: Connect iPhone to Mac, open Finder, click on device, click on serial number
# It changes to a long string like: 00008101-001A2B3C4D5E6F78

# 2. Register UDID at: https://developer.apple.com/account/resources/devices/add
# Device Class: iPhone, enter UDID

# 3. Build development client for your device
cd mobile
eas build --platform ios --profile development --device
# This builds in EAS cloud — no local Xcode required
# Takes 15–20 minutes. Link sent to your email.
# Click link on iPhone → trust the developer profile → install

# 4. Start Metro dev server
pnpm --filter @vitana/mobile start --dev-client

# 5. Open the installed dev client on iPhone
# It shows the QR scanner — scan Metro QR code
# App loads with full native module support
```

### 6.3 Run on iPhone via Xcode (macOS + Xcode Required)

```bash
# 1. Open Xcode and sign in with Apple ID
# Xcode → Settings → Accounts → + (Apple ID)

# 2. Build and run
npx expo run:ios --device
# Xcode builds and installs on connected iPhone
# First run: 5–10 minutes. Subsequent: 30 seconds (hot reload).
```

---

## 7. Expo Go vs Development Build

| Feature | Expo Go | Development Build |
|---|---|---|
| **Setup time** | 0 seconds (scan QR) | 15–30 min (build once) |
| **expo-secure-store** | ✅ Works | ✅ Works |
| **expo-notifications** (push) | ❌ Limited | ✅ Full support |
| **expo-sqlite** | ✅ Works | ✅ Works |
| **react-native-reanimated** | ✅ Works | ✅ Works |
| **@react-native-community/netinfo** | ✅ Works | ✅ Works |
| **Custom native modules** | ❌ Not supported | ✅ Supported |
| **Splash screen** | Expo Go splash | ✅ Your custom splash |
| **App icon** | Expo Go icon | ✅ Your custom icon |
| **Performance** | Good | Better |

**For Vitana SMS development:** Use Expo Go for quick prototyping and basic testing. Build a development build once you start working on push notifications, offline sync, or Cashfree payment SDK.

**Build the development client once:**

```bash
cd mobile
eas build --platform all --profile development
# EAS builds APK (Android) and development IPA (iOS) in the cloud
# Download links sent to your email
# Install on devices, then use QR scan forever after
```

---

## 8. Connecting to the Backend

### 8.1 Production Backend (Easiest)

The `.env.local` already points to production:

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.vitanasms.com/api
```

Use the demo school credentials:
```
School domain: demo.vitanasms.com
Username: demo.parent@demo.vitanasms.com
Password: Demo@12345
Role: Parent
```

```
Username: demo.teacher@demo.vitanasms.com
Password: Demo@12345
Role: Teacher
```

### 8.2 Local Backend (When Working on New APIs)

If you're running the .NET backend locally on your machine:

```bash
# The backend runs on localhost:5092 by default
# But your phone CANNOT access localhost — it needs your machine's IP

# Find your machine's local IP address:
# macOS:
ipconfig getifaddr en0     # WiFi interface
# OR:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Update mobile/.env.local:
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.5:5092/api
# Replace 192.168.1.5 with your machine's actual IP

# IMPORTANT: Your phone and Mac must be on the same WiFi network
```

**Android Emulator special case:**  
Android emulator's localhost is `10.0.2.2` (maps to host machine's localhost):

```bash
# For Android emulator only:
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5092/api
```

**iOS Simulator:**  
Can access host machine directly via `localhost`:

```bash
# For iOS simulator:
EXPO_PUBLIC_API_BASE_URL=http://localhost:5092/api
```

### 8.3 Backend CORS Configuration

When connecting mobile to the local backend, you may see CORS errors. Add mobile URLs to the backend's allowed origins in `appsettings.json`:

```json
"Cors": {
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:3000",
    "exp://192.168.1.5:8081",
    "http://192.168.1.5:8081"
  ]
}
```

> Note: Native mobile apps don't send `Origin` headers, so CORS doesn't actually apply. This only matters for Expo web (`expo start --web`).

### 8.4 Verify Backend Connection

Open React Native DevTools network tab, or add this to your app temporarily:

```typescript
// In app/(auth)/login.tsx — temporary health check
fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '')}/health/live`)
  .then(r => r.json())
  .then(data => console.log('Backend health:', data))
  .catch(err => console.error('Backend unreachable:', err));
```

---

## 9. Daily Development Workflow

### 9.1 Starting Your Day

```bash
# 1. Pull latest changes
git pull origin develop

# 2. Install any new packages (if package.json changed)
pnpm install

# 3. Rebuild shared packages if they changed
pnpm --filter @vitana/shared-types build
pnpm --filter @vitana/shared-utils build

# 4. Start Metro
pnpm --filter @vitana/mobile start

# 5. Open on your device:
# Physical Android (USB): press 'a' in Metro terminal
# Physical iPhone: scan QR with Expo Go or dev build
# Android emulator: press 'a'
# iOS simulator: press 'i'
```

### 9.2 Making and Seeing Changes

The Metro bundler supports **Fast Refresh** — changes to TypeScript/TSX files appear on device **within 1–2 seconds** without full app restart.

```bash
# Change any .ts or .tsx file → device updates automatically

# Force a full reload (if stuck):
# Android: shake device → Reload
#         OR: in terminal press 'r'
#         OR: adb shell input keyevent 82 (shake via adb)
# iOS: shake device → Reload
#     OR: in terminal press 'r'
```

### 9.3 Adding a New Package

```bash
# From the mobile/ directory
cd mobile
pnpm add @some/package

# Then restart Metro with --clear to pick up new native modules:
pnpm --filter @vitana/mobile start --clear
```

**If the package has native code** (iOS pods / Android gradle), you need to rebuild the dev client:

```bash
# Rebuild development client with new native module
eas build --platform all --profile development
# Install new build on devices, then continue as normal
```

### 9.4 Working on a New Screen

```bash
# Create the screen file (Expo Router picks it up automatically)
# Example: adding a new parent screen at /leaves/history
touch mobile/app/\(parent\)/leaves/history.tsx

# The route /(parent)/leaves/history is now available
# Navigate to it with: router.push('/(parent)/leaves/history')
```

---

## 10. Debugging Tools

### 10.1 Expo DevTools (Browser-Based)

When Metro is running, press `j` in the terminal to open the Expo DevTools in your browser:

```
http://localhost:8081/_expo/devtools
```

Shows:
- Connected devices
- Logs from the app
- Network requests (limited)
- Performance metrics

### 10.2 React Native DevTools (Recommended)

React Native DevTools is built into Metro for SDK 52+:

```bash
# With Metro running, press 'j' in terminal
# OR open in browser: http://localhost:8081/debugger-ui/

# In the DevTools:
# → Components tab: inspect React component tree
# → Profiler: performance profiling
# → Network: inspect API calls
# → Console: all console.log output
```

On device: shake the device → "Open Debugger" (React Native DevTools opens in Chrome).

### 10.3 Flipper (Advanced)

For SQLite inspection, network interception, and layout inspection:

```bash
# Install Flipper
brew install --cask flipper

# Open Flipper, connect device
# Plugins available:
# - Databases: inspect SQLite tables
# - Network: full request/response inspection
# - Layout: React Native component hierarchy
# - Logs: filtered device logs
```

### 10.4 `console.log` in Development

```typescript
// Use structured logging — easier to filter
console.log('[AuthStore] setAuth called:', { role: user.role, schoolId: user.schoolId });
console.error('[API] Request failed:', { endpoint: url, status: error.status });
console.warn('[Offline] Queue full:', { pending: queue.length });
```

View logs:
- **Expo DevTools:** All logs in browser
- **Metro terminal:** Filtered logs shown in terminal
- **Android Logcat:** `adb logcat -s ReactNativeJS` (raw device logs)
- **iOS Console:** Open Console.app on Mac → filter by device

### 10.5 Network Inspection with `expo-dev-client`

When using a development build (not Expo Go), you can use the **Network** tab in React Native DevTools to see all API calls, headers, and responses.

This is invaluable for verifying:
- `Authorization` header is injected
- `X-Academic-Year` header is present
- API response envelope is correctly unwrapped
- 401 refresh flow is working

---

## 11. Hot Reload & Fast Refresh

### Fast Refresh (Automatic, Default)

Fast Refresh preserves component state and restores it after code changes. It works for:
- TypeScript/TSX component changes
- Style changes (NativeWind classes)
- Logic changes (hooks, utils)

**Does NOT work for:**
- `app.config.js` changes → must restart Metro
- New native module installation → must rebuild dev client
- Changes to `metro.config.js` → must restart Metro
- Changes to `babel.config.js` → must restart Metro
- Environment variable changes → restart Metro + clear cache

### Cache Clearing

When Fast Refresh behaves unexpectedly:

```bash
# Clear Metro bundler cache
pnpm --filter @vitana/mobile start --clear

# Nuclear option: clear everything
cd mobile
rm -rf node_modules/.cache
rm -rf .expo
pnpm install
npx expo start --clear
```

### On-Device Shortcuts

| Action | Android | iOS |
|---|---|---|
| Reload app | Shake → Reload | Shake → Reload |
| Open DevTools | Shake → Open Debugger | Shake → Open Debugger |
| Performance monitor | Shake → Performance Monitor | Shake → Performance Monitor |
| Toggle inspector | Shake → Show Inspector | Shake → Show Inspector |

---

## 12. Common Errors & Fixes

### Error: "Network request failed" on Physical Device

**Cause:** Phone cannot reach the backend URL.

**Fix:**
```bash
# Check your backend URL uses your machine's IP (not localhost)
# mobile/.env.local:
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.5:5092/api  # Your Mac's IP

# Verify same WiFi network:
# Mac: System Settings → WiFi → Details (shows IP)
# Phone: Settings → WiFi → (your network) → shows IP in same subnet
```

### Error: "Unable to resolve module @vitana/shared-types"

**Cause:** Shared packages not built.

**Fix:**
```bash
pnpm --filter @vitana/shared-types build
pnpm --filter @vitana/shared-utils build
pnpm --filter @vitana/mobile start --clear
```

### Error: "cannot find module 'nativewind'"

**Cause:** pnpm hoist issue or missing install.

**Fix:**
```bash
cd mobile
pnpm install
pnpm --filter @vitana/mobile start --clear
```

### Error: Metro "EADDRINUSE: address already in use :::8081"

**Cause:** Another Metro process is running.

**Fix:**
```bash
# Kill all Metro processes
lsof -ti:8081 | xargs kill -9
# Then start fresh:
pnpm --filter @vitana/mobile start
```

### Error: Android device not detected by ADB

**Fix:**
```bash
# Restart ADB server
adb kill-server
adb start-server
adb devices

# If still not showing:
# - Unplug and replug USB
# - Try different USB cable (some cables are charge-only)
# - Try different USB port
# - On phone: revoke USB debugging permissions and re-grant
# - Check Developer Options → USB Configuration → MTP/PTP (not "Charge only")
```

### Error: "SDK version too old"

**Cause:** Expo Go app is outdated.

**Fix:** Update Expo Go from the Play Store / App Store. If the SDK version is too new for Expo Go, create a development build instead.

### Error: iOS Simulator "This app cannot be installed because its integrity could not be verified"

**Fix:**
```bash
# Reset simulators
xcrun simctl erase all
# Then re-run
npx expo start --ios
```

### Error: "JAVA_HOME is not set"

**Fix:**
```bash
# macOS with Temurin 17
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
echo 'export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home' >> ~/.zshrc
```

### Error: `adb: error: failed to copy 'X.apk' to 'Y': No space left on device`

**Fix:** Free space on the Android emulator:
```bash
# Wipe and reset the emulator
avdmanager delete avd --name Pixel7
# Then recreate it
```

### Blank White Screen on App Start

**Cause:** JavaScript error during startup (often a missing import or store hydration issue).

**Fix:**
```bash
# Open React Native DevTools or Flipper
# Check the console for red error messages
# Most common: circular import in stores

# Quick test: shake device → Reload
# If still blank: Metro --clear
pnpm --filter @vitana/mobile start --clear
```

### NativeWind Classes Not Applying

**Cause:** Metro cache or NativeWind preset misconfiguration.

**Fix:**
```bash
# Verify global.css is imported in app/_layout.tsx
# '../global.css' must be the FIRST import

# Clear cache
pnpm --filter @vitana/mobile start --clear
```

---

## 13. EAS Cloud Builds (CI/CD)

When you need a full native build (APK or IPA):

### 13.1 Preview Build (Share with Team)

```bash
cd mobile

# Build an APK (Android) + IPA (iOS) for internal testing
eas build --platform all --profile preview --non-interactive

# This takes 15–25 minutes in EAS cloud (no Mac needed for iOS)
# You'll get a download link via email and in EAS dashboard
```

### 13.2 Development Build (Full Native Modules)

```bash
# Build development client with all native modules
eas build --platform all --profile development

# Install the APK/IPA on your device
# Then run Metro dev server and scan QR code as usual
```

### 13.3 Check Build Status

```bash
# List recent builds
eas build:list

# Check specific build
eas build:view <build-id>
```

### 13.4 OTA Update (Push JS-Only Changes)

```bash
# Deploy a JS/TS change without a new store build
eas update --channel staging --message "Fix attendance calendar"

# Deploy to production
eas update --channel production --message "Hotfix: fee balance calculation"
```

---

## Quick Reference Card

```
DAILY COMMANDS
─────────────────────────────────────────────────────────────
Start Metro:        pnpm --filter @vitana/mobile start
Start clean:        pnpm --filter @vitana/mobile start --clear
Open Android:       Press 'a' in Metro terminal
Open iOS sim:       Press 'i' in Metro terminal
Reload device:      Press 'r' in Metro terminal (or shake device)

TESTING
─────────────────────────────────────────────────────────────
Type check:         pnpm --filter @vitana/mobile typecheck
Lint:               pnpm --filter @vitana/mobile lint
Run tests:          pnpm --filter @vitana/mobile test

ANDROID PHYSICAL DEVICE
─────────────────────────────────────────────────────────────
Check connected:    adb devices
Install APK:        adb install mobile.apk
View logs:          adb logcat -s ReactNativeJS
Connect wireless:   adb tcpip 5555 && adb connect 192.168.x.x:5555

WHEN THINGS BREAK
─────────────────────────────────────────────────────────────
Clear Metro cache:  pnpm --filter @vitana/mobile start --clear
Kill Metro port:    lsof -ti:8081 | xargs kill -9
Rebuild packages:   pnpm --filter @vitana/shared-types build
                    pnpm --filter @vitana/shared-utils build
Full reset:         rm -rf mobile/.expo && pnpm install && start --clear

DEMO CREDENTIALS (for testing)
─────────────────────────────────────────────────────────────
API:       https://api.vitanasms.com/api
Domain:    demo.vitanasms.com
Parent:    demo.parent@demo.vitanasms.com / Demo@12345
Teacher:   demo.teacher@demo.vitanasms.com / Demo@12345
Student:   demo.student@demo.vitanasms.com / Demo@12345
Admin:     demo.admin@demo.vitanasms.com / Demo@12345
```

---

*Questions? Check `docs/mobile_application_docs/12-cursor-prompts/` for implementation prompts or ask in #mobile-dev Slack channel.*
