# PROMPT-07: Build Automation & CI/CD Pipelines

> **Prompt ID:** PROMPT-07  
> **Epic:** EP-11 — Build Automation  
> **Phase:** 3 — Sprint 12  
> **Estimated Story Points:** 18  
> **Prerequisites:** PROMPT-01 complete; EAS account set up; GitHub repository secrets configured  
> **Related Architecture Docs:** [11-build-automation](../11-build-automation.md) · [12-deployment-strategy](../12-deployment-strategy.md)

---

## Context

The mobile app and white-label system exist. Now build the full CI/CD automation so builds are triggered by Git events and school apps can be generated with a single workflow dispatch.

Read `docs/mobile_application_docs/11-build-automation.md` completely before implementing.

---

## Prerequisites (Ops Setup Required Before This Prompt)

1. EAS account created for Vitana organization.
2. EAS project created for shared app: `vitana-sms`. Get the `projectId` UUID.
3. GitHub repository secrets configured:
   - `EXPO_TOKEN` — EAS access token.
   - `APPLE_TEAM_ID`, `ASC_APP_ID` — Apple Developer account.
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` — Google Play service account JSON.
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — For school asset downloads.
   - `SLACK_BOT_TOKEN` — For build notifications.

---

## Requirements

### 1. EAS Configuration (`mobile/eas.json`)

Implement exactly as shown in `docs/mobile_application_docs/11-build-automation.md` Section 3.

Key profiles required:
- `development`: internal, development client.
- `preview`: APK + IPA internal distribution for PR builds.
- `staging`: AAB + IPA, `staging` update channel.
- `production`: AAB + IPA, `production` channel, remote credentials.
- `school-production`: extends `production`, channel `${SCHOOL_ID}-production`.

### 2. GitHub Actions Workflow: PR Preview Build

**File:** `.github/workflows/mobile-eas-preview.yml`

Implement exactly as shown in architecture doc Section 4.1:
- Trigger: `pull_request` on paths `mobile/**`, `packages/**`.
- Jobs: `test` (lint + jest + tsc) then `preview-build`.
- `test` job must pass before `preview-build` starts.
- `preview-build`: EAS preview build for all platforms.
- Comment build download links on the PR.

### 3. GitHub Actions Workflow: Staging Build

**File:** `.github/workflows/mobile-eas-staging.yml`

Trigger: `push` to `develop` branch, paths `mobile/**` or `packages/**`.

Steps:
1. Checkout + pnpm setup.
2. Install dependencies.
3. Run lint + tests.
4. EAS staging build (`--profile staging`).
5. Auto-submit to Play Store internal track + TestFlight.
6. Slack notification with build URL.

### 4. GitHub Actions Workflow: Production Release

**File:** `.github/workflows/mobile-eas-production.yml`

Trigger: `push` of tags matching `mobile-v*.*.*`.

**Critical:** This workflow must require **manual approval** via a GitHub Environment named `mobile-production`. Set environment protection rules to require 1 reviewer.

Steps:
1. Extract version from tag (`mobile-v1.2.0` → `1.2.0`).
2. Checkout + pnpm setup.
3. EAS production build with `APP_VERSION` injected.
4. Submit to Play Store internal track + TestFlight.
5. Slack notification: "Production build submitted for review."
6. Archive AAB and IPA to S3 as backup.

### 5. GitHub Actions Workflow: OTA Update

**File:** `.github/workflows/mobile-ota-update.yml`

Trigger: `workflow_dispatch` with inputs:
- `channel`: string (e.g., `production`, `staging`, `school-dps-rohini-production`)
- `message`: string (update description)

Steps:
1. Checkout + setup.
2. `eas update --channel {channel} --message "{message}"`.
3. Slack: "OTA update deployed to channel: {channel}".

### 6. GitHub Actions Workflow: School App Build

**File:** `.github/workflows/mobile-school-build.yml`

Trigger: `workflow_dispatch` with inputs:
- `school_id`: string
- `platform`: choice [all, android, ios]
- `submit_to_stores`: boolean

Steps:
1. Validate `school_id` exists in `school-configs.json`.
2. Checkout + pnpm setup.
3. Download school assets: `node scripts/inject-school-config.js {school_id}`.
4. EAS build with `SCHOOL_ID={school_id}`, `--profile school-production`.
5. If `submit_to_stores=true`: `eas submit`.
6. Upload artifacts to S3: `s3://vitana-builds/{schoolId}/android/` and `/ios/`.
7. Slack: "School app build complete: {schoolId} ({platform})".

### 7. Backend-Triggered CI Path Filters

Update existing backend CI to ignore mobile paths:

```yaml
# .github/workflows/backend.yml (update existing)
on:
  push:
    paths-ignore:
      - 'mobile/**'
      - 'ui/**'
      - 'packages/**'
      - 'docs/**'
      - '*.md'
```

```yaml
# .github/workflows/web-ui.yml (update existing)
on:
  push:
    paths-ignore:
      - 'mobile/**'
      - 'packages/**'
      - 'docs/**'
```

### 8. Mobile Lint & Test CI Job (Reusable)

Create a reusable workflow `.github/workflows/mobile-checks.yml`:

```yaml
name: Mobile Checks (reusable)
on:
  workflow_call:

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @vitana/shared-types build
      - run: pnpm --filter @vitana/shared-utils build
      - run: pnpm --filter @vitana/mobile tsc --noEmit
      - run: pnpm --filter @vitana/mobile lint
      - run: pnpm --filter @vitana/mobile test --ci --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: mobile/coverage/
```

### 9. Rollback Script

Create `mobile/scripts/ota-rollback.sh`:
```bash
#!/bin/bash
# Usage: ./scripts/ota-rollback.sh <channel> <previous-update-group-id>
# Rolls back OTA update on a channel
CHANNEL=$1
GROUP_ID=$2
eas update:republish --channel "$CHANNEL" --group "$GROUP_ID" --non-interactive
```

---

## Implementation Tasks

1. Finalize `mobile/eas.json` with all profiles.
2. Create `.github/workflows/mobile-eas-preview.yml`.
3. Create `.github/workflows/mobile-eas-staging.yml`.
4. Create `.github/workflows/mobile-eas-production.yml`.
5. Create `.github/workflows/mobile-ota-update.yml`.
6. Create `.github/workflows/mobile-school-build.yml`.
7. Create `.github/workflows/mobile-checks.yml` (reusable).
8. Update existing `backend.yml` with `paths-ignore`.
9. Update existing `web-ui.yml` with `paths-ignore`.
10. Configure `mobile-production` GitHub Environment with required reviewer.
11. Add all required secrets to GitHub repository settings (document which secrets needed).
12. Add `mobile/assets/school-assets/*/` to `.gitignore` (except `vitana/`).
13. Create `mobile/scripts/ota-rollback.sh`.
14. Test PR preview build by opening a draft PR.

---

## Acceptance Criteria

- [ ] Opening a PR with `mobile/` changes triggers the preview build workflow.
- [ ] PR comment appears with Android APK download link within 30 minutes.
- [ ] Pushing `mobile-v0.1.0` tag triggers production build workflow.
- [ ] Production workflow requires manual approval before building.
- [ ] OTA update workflow dispatches successfully to `staging` channel.
- [ ] School build workflow dispatches with `school_id=vitana` and produces a build.
- [ ] Backend-only PR does NOT trigger any mobile build.
- [ ] Mobile-only PR does NOT trigger .NET build.
- [ ] Coverage artifacts uploaded after test job.

---

## Testing Requirements

- Integration test: Push a test tag `mobile-v0.0.1-test` → verify workflow triggers.
- Manual: Trigger school build dispatch for `vitana` → verify EAS build starts.
- Manual: OTA update to `staging` channel → verify update deployed in EAS dashboard.
- Verify `EXPO_TOKEN` secret works (EAS CLI authenticates).

---

## Documentation Requirements

Add to `mobile/README.md`:
- How to trigger a production release (tagging convention).
- How to deploy an OTA update.
- How to build a new school app (workflow dispatch instructions).
- Required GitHub secrets list with descriptions.

---

## Definition of Done

- [ ] All acceptance criteria pass.
- [ ] No secrets hardcoded in workflow files.
- [ ] `mobile-production` environment requires approval.
- [ ] `mobile/README.md` updated with CI/CD instructions.
- [ ] Peer review of all workflow files.
