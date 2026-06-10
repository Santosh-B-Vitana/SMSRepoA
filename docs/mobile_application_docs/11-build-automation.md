# Vitana Mobile Platform — Build Automation Architecture

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [08-white-label-architecture](./08-white-label-architecture.md) · [12-deployment-strategy](./12-deployment-strategy.md) · [05-repository-strategy](./05-repository-strategy.md)

---

## 1. Build Automation Goals

| Goal | Target |
|---|---|
| New school app from request to stores | < 4 hours build + 2-8 days store review |
| OTA bug fix deployment | < 15 minutes |
| Shared app update to stores | < 4 hours build + 1-3 days review |
| Automated PR preview build | < 30 minutes |
| Zero manual Mac/Xcode interaction for builds | ✅ (EAS cloud builds) |
| Zero manual signing rotation | ✅ (EAS manages certs) |

---

## 2. Technology Selection

| Tool | Role | Why |
|---|---|---|
| **Expo EAS Build** | Cloud build infrastructure | No Mac needed; handles signing, Gradle, Xcode; iOS M-series fleet |
| **Expo EAS Update** | OTA update delivery | JS bundle push in minutes; channel-based targeting |
| **GitHub Actions** | CI orchestration | Triggers EAS, runs tests, manages secrets |
| **Fastlane** | Store metadata + screenshots only | EAS handles builds; Fastlane used only for store asset management |
| **EAS Submit** | Store submission | Automated AAB/IPA upload to Play Console and App Store Connect |

**Why not Codemagic/Bitrise?** EAS Build is purpose-built for Expo and is the lowest-friction path. Codemagic and Bitrise are better suited for bare React Native or Flutter. EAS + GitHub Actions gives us the most control with least vendor lock-in.

---

## 3. EAS Configuration

```json
// mobile/eas.json
{
  "cli": {
    "version": ">= 10.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "http://localhost:5092/api",
        "EXPO_PUBLIC_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false },
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api-staging.vitanasms.com/api",
        "EXPO_PUBLIC_ENV": "staging"
      }
    },
    "staging": {
      "channel": "staging",
      "android": { "buildType": "app-bundle" },
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api-staging.vitanasms.com/api",
        "EXPO_PUBLIC_ENV": "staging"
      }
    },
    "production": {
      "channel": "production",
      "android": {
        "buildType": "app-bundle",
        "credentialsSource": "remote"
      },
      "ios": {
        "credentialsSource": "remote"
      },
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.vitanasms.com/api",
        "EXPO_PUBLIC_ENV": "production"
      }
    },
    "school-production": {
      "extends": "production",
      "channel": "school-${SCHOOL_ID}-production",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.vitanasms.com/api",
        "EXPO_PUBLIC_ENV": "production",
        "SCHOOL_ID": "${SCHOOL_ID}"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "ops@vitanasms.com",
        "ascAppId": "${ASC_APP_ID}",
        "appleTeamId": "${APPLE_TEAM_ID}"
      }
    }
  }
}
```

---

## 4. GitHub Actions Workflows

### 4.1 PR Preview Build (`mobile-eas-preview.yml`)

Triggered on every PR touching `mobile/` or `packages/`:

```yaml
name: Mobile PR Preview Build
on:
  pull_request:
    paths: ['mobile/**', 'packages/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @vitana/mobile lint
      - run: pnpm --filter @vitana/mobile test --ci
      - run: pnpm --filter @vitana/shared-types build
      - run: pnpm --filter @vitana/shared-utils build

  preview-build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
        working-directory: mobile
      - name: Build preview APK + IPA
        run: eas build --platform all --profile preview --non-interactive
        working-directory: mobile
      - name: Comment build links on PR
        uses: expo/expo-github-action/preview-comment@v8
```

### 4.2 Staging Build (`mobile-eas-staging.yml`)

Triggered on merge to `develop`:

```yaml
name: Mobile Staging Build
on:
  push:
    branches: [develop]
    paths: ['mobile/**', 'packages/**']

jobs:
  staging-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install
        working-directory: mobile
      - name: Build staging
        run: eas build --platform all --profile staging --non-interactive --auto-submit
        working-directory: mobile
```

### 4.3 Production Release (`mobile-eas-production.yml`)

Triggered on push of tag `mobile-v*.*.*`:

```yaml
name: Mobile Production Release
on:
  push:
    tags: ['mobile-v*.*.*']

jobs:
  production-release:
    runs-on: ubuntu-latest
    environment: mobile-production   # Requires manual approval in GitHub
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install
        working-directory: mobile
      - name: Extract version from tag
        run: echo "VERSION=${GITHUB_REF#refs/tags/mobile-v}" >> $GITHUB_ENV
      - name: Build production
        run: eas build --platform all --profile production --non-interactive
        env:
          APP_VERSION: ${{ env.VERSION }}
        working-directory: mobile
      - name: Submit to stores
        run: eas submit --platform all --latest --non-interactive
        working-directory: mobile
```

### 4.4 School App Build (`mobile-school-build.yml`)

Manually triggered workflow to build a dedicated school app:

```yaml
name: Build Dedicated School App
on:
  workflow_dispatch:
    inputs:
      school_id:
        description: 'School ID (e.g. dps-rohini)'
        required: true
        type: string
      platform:
        description: 'Platform'
        required: true
        default: 'all'
        type: choice
        options: ['all', 'android', 'ios']

jobs:
  prepare-school-assets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install
        working-directory: mobile
      - name: Download and inject school assets
        run: node scripts/inject-school-config.js ${{ inputs.school_id }}
        working-directory: mobile
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      - name: Upload assets to artifacts
        uses: actions/upload-artifact@v4
        with:
          name: school-assets-${{ inputs.school_id }}
          path: mobile/assets/school-assets/${{ inputs.school_id }}/

  build-school-app:
    needs: prepare-school-assets
    runs-on: ubuntu-latest
    environment: mobile-production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: school-assets-${{ inputs.school_id }}
          path: mobile/assets/school-assets/${{ inputs.school_id }}/
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install
        working-directory: mobile
      - name: Build school app
        run: |
          eas build \
            --platform ${{ inputs.platform }} \
            --profile school-production \
            --non-interactive
        working-directory: mobile
        env:
          SCHOOL_ID: ${{ inputs.school_id }}
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: mobile-builds
          slack-message: "School app build complete: ${{ inputs.school_id }} (${{ inputs.platform }})"
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

### 4.5 OTA Update Deployment

```yaml
name: Mobile OTA Update
on:
  workflow_dispatch:
    inputs:
      channel:
        description: 'Update channel (production | staging | school-<id>-production)'
        required: true
      message:
        description: 'Update message'
        required: true

jobs:
  ota-update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install
        working-directory: mobile
      - name: Publish OTA update
        run: |
          eas update \
            --channel ${{ inputs.channel }} \
            --message "${{ inputs.message }}" \
            --non-interactive
        working-directory: mobile
```

---

## 5. Signing Management

### Android

- **EAS Managed Credentials:** EAS generates and stores the Android keystore on Expo's servers.
- Keystore is backed up in Expo's secure vault.
- SHA-1 / SHA-256 fingerprints provided by EAS are registered in Google Play Console.
- No local keystore needed — EAS injects at build time.

### iOS

- **EAS Managed Credentials:** EAS handles:
  - Distribution certificate (P12).
  - App Store provisioning profiles.
  - Automatic profile regeneration when devices are added.
- Apple Team ID and App Store Connect API Key stored as GitHub secrets.
- For each school app, a separate App Store provisioning profile is created (different Bundle ID).

---

## 6. Build Artifact Storage

```
EAS Artifact Storage (managed by Expo):
├── Android AAB: stored per build with EAS build ID
├── iOS IPA: stored per build with EAS build ID
└── Retention: 30 days (EAS plan dependent)

Vitana S3 Backup:
├── s3://vitana-builds/{schoolId}/android/{version}-{buildId}.aab
├── s3://vitana-builds/{schoolId}/ios/{version}-{buildId}.ipa
└── Retention: 1 year
```

Build artifacts are downloaded from EAS after each build and backed up to S3 via a post-build GitHub Actions step.

---

## 7. Build Monitoring

```
Every EAS build → Webhook → GitHub Actions
                          → Slack notification (mobile-builds channel)
                          → Build status in PR comment
Failed build → Slack alert → PagerDuty (if production)
Build time > 20 min → Slack warning
```

---

## 8. Rollback Strategy

### OTA Rollback (< 5 minutes)

If an OTA update causes issues:
```bash
# Rollback: point channel to previous update
eas update --channel production --rollback-to-embedded
# or
eas update:republish --channel production --group <previous-update-group-id>
```

This instantly rolls all users on the `production` channel back to the previous JS bundle.

### Store Rollback

Play Store: Use "Staged rollout halt" in Play Console (immediate) then rollback.
App Store: Cannot rollback a live release. Must submit a new patch version with fix (1-24h review for expedited).

**Prevention:** Never release to 100% of Play Store at once. Always use staged rollout (10% → 25% → 50% → 100%) with 24-hour monitoring at each stage.

---

## 9. New School App Generation Checklist

When a new school requests a dedicated app:

```
[ ] School provides: logo PNG 1024×1024, splash PNG 2048×2048, hex colors, app name
[ ] Vitana ops validates assets (size, format, quality)
[ ] Vitana devops adds school entry to school-configs.json
[ ] EAS project created for the school (eas project:create)
[ ] App created in Google Play Console (Developer Console)
[ ] App created in App Store Connect
[ ] Android package name registered
[ ] iOS Bundle ID registered
[ ] Run: workflow_dispatch: build_school_app (school_id: <id>, platform: all)
[ ] Build completes (~20 min Android, ~30 min iOS)
[ ] AAB/IPA reviewed manually before store submission
[ ] Submit to internal testing tracks (Play Console + TestFlight)
[ ] School admin QA on internal build
[ ] Submit to production track
[ ] Store review period (Android: 1-3 days, iOS: 1-7 days)
[ ] Share store URLs with school
[ ] Update school record with store URLs
```

---

*Next: [12-deployment-strategy.md](./12-deployment-strategy.md)*
