# EP-11: Build Automation

> **Epic ID:** EP-11  
> **Priority:** P1  
> **Estimated Sprints:** 2  
> **Phase:** 3 — Sprint 12  
> **Related Docs:** [11-build-automation](../11-build-automation.md) · [08-white-label-architecture](../08-white-label-architecture.md) · [PROMPT-07](../12-cursor-prompts/PROMPT-07-build-automation.md)

---

## Business Objective

Manual builds are a bottleneck that prevents Vitana from scaling to 100+ school apps. If generating a new school app requires a developer to install Xcode, manage certificates, run a local build, and manually upload to stores — this system cannot scale. Build automation removes humans from the build loop entirely. A new school app should go from "assets ready" to "build submitted to stores" with one click.

**Target:** Zero manual steps between asset upload and store submission.

## Technical Objective

Implement complete CI/CD pipelines using EAS Build + GitHub Actions: PR preview builds, staging builds on develop merge, production releases via Git tags, OTA update deployment, and dedicated school app builds via workflow dispatch.

---

## Current State Analysis

- EAS account: needs to be provisioned for Vitana.
- `mobile/eas.json`: basic structure created in PROMPT-01, needs completing.
- `.github/workflows/`: no mobile workflows exist.
- Android: no Play Console app created yet.
- iOS: no App Store Connect app created yet.
- Signing: not yet configured.

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | Every PR touching `mobile/**` triggers a preview APK + IPA build |
| FR-2 | PR comment shows download links within 30 minutes |
| FR-3 | Merge to `develop` triggers staging build + internal track submission |
| FR-4 | Pushing a `mobile-v*.*.*` tag triggers production build |
| FR-5 | Production build requires manual approval in GitHub environment |
| FR-6 | School app build triggered via `workflow_dispatch` with `school_id` input |
| FR-7 | School app build downloads assets from S3, validates them, then builds |
| FR-8 | OTA updates deployable via `workflow_dispatch` to any named channel |
| FR-9 | Build artifacts uploaded to S3 as backup after every production build |
| FR-10 | Slack notifications on build complete/failed |
| FR-11 | All signing managed via EAS Remote Credentials (no local keystores) |
| FR-12 | Mobile CI path-filtered: backend/web changes don't trigger mobile builds |
| FR-13 | Rollback script available for OTA emergency hotfixes |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | PR preview build completes in < 30 minutes |
| NFR-2 | Production build completes in < 40 minutes |
| NFR-3 | OTA update deployed in < 5 minutes |
| NFR-4 | School app build (full cycle) completes in < 35 minutes |
| NFR-5 | Zero manual Mac/Xcode interaction for any build type |

---

## GitHub Actions Workflows

| Workflow File | Trigger | Purpose |
|---|---|---|
| `mobile-eas-preview.yml` | PR on `mobile/**` | Preview APK + IPA |
| `mobile-eas-staging.yml` | Push to `develop` | Staging build + internal track |
| `mobile-eas-production.yml` | Tag `mobile-v*.*.*` | Production release |
| `mobile-school-build.yml` | `workflow_dispatch` | Dedicated school app |
| `mobile-ota-update.yml` | `workflow_dispatch` | OTA update to channel |
| `mobile-checks.yml` | Reusable | Lint + typecheck + test |

---

## Required GitHub Secrets

| Secret | Description |
|---|---|
| `EXPO_TOKEN` | EAS authentication token |
| `APPLE_TEAM_ID` | Apple Developer team ID |
| `ASC_APP_ID` | App Store Connect app ID |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` | JSON key for Play Console API |
| `AWS_ACCESS_KEY_ID` | For school asset downloads + artifact upload |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `SLACK_BOT_TOKEN` | Slack build notifications |
| `EAS_PROJECT_ID` | Expo EAS project UUID |
| `SENTRY_AUTH_TOKEN` | Sentry source map upload |

---

## EAS Build Profiles

| Profile | Platform | Distribution | Channel | Use Case |
|---|---|---|---|---|
| `development` | iOS + Android | Internal | `development` | Local dev with dev client |
| `preview` | iOS + Android | Internal | `preview` | PR review builds |
| `staging` | iOS + Android | Internal | `staging` | QA on staging API |
| `production` | iOS + Android | Store | `production` | Release to stores |
| `school-production` | iOS + Android | Store | `{schoolId}-production` | Dedicated school apps |

---

## School App Build Process

```
workflow_dispatch inputs:
  school_id: "dps-rohini"
  platform: "all"
  submit_to_stores: true

Step 1: Validate school_id in school-configs.json
Step 2: Download school assets from S3 via inject-school-config.js
Step 3: Validate assets (dimensions, format, size)
Step 4: Run EAS build with SCHOOL_ID env var
Step 5: EAS build completes → download AAB + IPA from EAS
Step 6: Upload to S3 backup bucket
Step 7: If submit_to_stores: EAS submit to Play Console + App Store Connect
Step 8: Slack notification: "Build complete: dps-rohini (android + ios)"
```

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-11-US-01 | PR preview build with PR comment | 5 |
| EP-11-US-02 | Staging build on develop merge | 3 |
| EP-11-US-03 | Production release via tag with approval gate | 5 |
| EP-11-US-04 | School app build workflow | 8 |
| EP-11-US-05 | OTA update workflow | 3 |
| EP-11-US-06 | EAS Remote Credentials setup (Android + iOS) | 5 |
| EP-11-US-07 | S3 artifact backup | 3 |
| EP-11-US-08 | Slack notifications | 2 |
| EP-11-US-09 | Rollback script | 2 |

**Total:** 36 story points / 2 sprints

---

## Acceptance Criteria

- [ ] PR with `mobile/` change → preview APK available within 30 minutes.
- [ ] `mobile-v0.1.0` tag → production build starts, requires approval.
- [ ] School build `school_id=vitana` → completes, AAB uploaded to S3.
- [ ] OTA update `channel=staging` → update live in EAS dashboard.
- [ ] Backend-only PR → no mobile workflows triggered.
- [ ] Slack message received on build complete.
- [ ] `mobile-production` GitHub environment requires 1 reviewer.
- [ ] All secrets stored as GitHub secrets (none hardcoded in YAML).

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 12 | All 6 workflow files + EAS setup + path filters + Slack |
| Sprint 13 | S3 artifact backup + rollback script + school build end-to-end test |
