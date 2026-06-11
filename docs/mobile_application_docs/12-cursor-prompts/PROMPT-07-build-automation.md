# PROMPT-07: Build Automation & CI/CD Pipelines

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-11 — Build Automation  
> **Sprint**: 12 (Weeks 23–24)  
> **Story Points**: 18  
> **Prerequisites**: PROMPT-01 ✓, PROMPT-06 ✓ (white-label config exists)  
> **Next Prompt**: PROMPT-16 (Store Setup & Deployment)  
> **Owner**: DevOps Engineer (primary) + Mobile Lead (review)

---

## PHASE 1: Context & Scope

### What We're Building

Complete CI/CD automation: every PR gets a preview build, merges to develop get staging builds, version tags trigger production releases, and school apps can be generated with a single workflow dispatch — all without any engineer needing Xcode or Android Studio.

**Pipelines:**
- PR preview: APK + IPA on every mobile PR (< 30 min)
- Staging: build + submit to internal testing on develop merge
- Production: build + store submit on `mobile-v*.*.*` tag (requires approval)
- OTA update: deploy JS changes without store review (< 5 min)
- School app: `workflow_dispatch` with `school_id` input → dedicated school app

### Current State

- ✅ `eas.json` exists with build profiles
- ✅ `app.config.js` dynamic with `SCHOOL_ID`
- ✅ `inject-school-config.js` script exists
- ❌ No GitHub Actions workflows exist
- ❌ EAS project not created (DevOps must do this)
- ❌ No Play Console app (DevOps must do this)
- ❌ No App Store Connect app (DevOps must do this)

### Success Criteria

- [ ] PR touching `mobile/**` triggers preview build within 30 minutes
- [ ] PR comment shows Android APK download link
- [ ] Pushing `mobile-v0.1.0` tag triggers production workflow
- [ ] Production workflow shows "Waiting for approval" in GitHub Actions
- [ ] `workflow_dispatch` school build with `school_id=vitana` completes
- [ ] OTA update deploys to `staging` channel successfully
- [ ] Backend-only PR does NOT trigger any mobile workflow
- [ ] All secrets stored as GitHub repository secrets (zero hardcoded values)

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/11-build-automation.md
docs/mobile_application_docs/12-deployment-strategy.md
docs/mobile_application_docs/epics/EP-11-build-automation.md
```

### Required Secrets (DevOps must configure before this prompt)

```bash
# Check GitHub repository secrets are configured:
# Settings → Secrets and variables → Actions

# Required secrets:
EXPO_TOKEN                     # EAS CLI auth: from https://expo.dev/accounts/[account]/settings/access-tokens
APPLE_TEAM_ID                  # Apple Developer: XXXXXXXXXX
ASC_APP_ID                     # App Store Connect App ID: 12345678
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY # JSON file content for Play Console API
AWS_ACCESS_KEY_ID               # For school asset downloads
AWS_SECRET_ACCESS_KEY           # For school asset uploads
SLACK_BOT_TOKEN                # For build notifications
EAS_PROJECT_ID                 # From EAS project: eas project:info
SENTRY_AUTH_TOKEN              # For source map uploads
```

### Pre-Prompt Checklist

```bash
# 1. Login to EAS
eas login

# 2. Create EAS project (from mobile/ directory)
cd mobile && eas project:init
# Copy the projectId to school-configs.json → vitana.easProjectId
# Also set EAS_PROJECT_ID secret in GitHub

# 3. Configure EAS credentials (run once)
eas credentials --platform android  # Sets up managed keystore
eas credentials --platform ios      # Sets up distribution cert + profile

# 4. Verify eas.json build profiles work locally
SCHOOL_ID=vitana eas build --platform android --profile preview --local
# (optional local build just to verify config is valid before CI)
```

---

## PHASE 3: Technical Planning

### Workflow Decision Tree

```
Code change pushed to GitHub
         │
         ├── PR opened/updated (path: mobile/** or packages/**)
         │         └── mobile-eas-preview.yml
         │               → test → preview build → PR comment
         │
         ├── Push to develop (path: mobile/** or packages/**)
         │         └── mobile-eas-staging.yml
         │               → test → staging build → internal tracks
         │
         ├── Push tag mobile-v*.*.*
         │         └── mobile-eas-production.yml
         │               → test → APPROVAL REQUIRED → production build → store submit
         │
         ├── workflow_dispatch "Build School App"
         │         └── mobile-school-build.yml
         │               → inject assets → build → [optional] store submit
         │
         └── workflow_dispatch "Deploy OTA Update"
                   └── mobile-ota-update.yml
                         → eas update --channel X
```

---

## PHASE 4: Database Design

> Not applicable. This prompt creates infrastructure files, not data models.

---

## PHASE 5: Backend Implementation

> Not applicable for this DevOps-focused prompt.

---

## PHASE 6: Implementation (GitHub Actions Workflows)

### 6.1 Reusable Check Workflow

```yaml
# .github/workflows/mobile-checks.yml
name: Mobile Checks (reusable)
on:
  workflow_call:
    outputs:
      build_number:
        description: "Build number based on run ID"
        value: ${{ jobs.checks.outputs.build_number }}

jobs:
  checks:
    runs-on: ubuntu-latest
    outputs:
      build_number: ${{ steps.build_num.outputs.number }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build shared packages
        run: |
          pnpm --filter @vitana/shared-types build
          pnpm --filter @vitana/shared-utils build

      - name: Type check
        run: pnpm --filter @vitana/mobile typecheck

      - name: Lint
        run: pnpm --filter @vitana/mobile lint

      - name: Run tests
        run: pnpm --filter @vitana/mobile test --ci --coverage --coverageReporters=lcov

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: mobile/coverage/lcov.info
          retention-days: 7

      - name: Generate build number
        id: build_num
        run: echo "number=${{ github.run_number }}" >> $GITHUB_OUTPUT
```

### 6.2 PR Preview Build

```yaml
# .github/workflows/mobile-eas-preview.yml
name: Mobile — PR Preview Build

on:
  pull_request:
    paths:
      - 'mobile/**'
      - 'packages/**'
      - '.github/workflows/mobile-*.yml'

concurrency:
  group: preview-${{ github.head_ref }}
  cancel-in-progress: true

jobs:
  checks:
    uses: ./.github/workflows/mobile-checks.yml
    secrets: inherit

  preview-build:
    needs: checks
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

      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        working-directory: mobile

      - name: Build shared packages
        run: |
          pnpm --filter @vitana/shared-types build
          pnpm --filter @vitana/shared-utils build

      - name: EAS Preview Build (Android APK + iOS Internal)
        id: build
        run: |
          eas build \
            --platform all \
            --profile preview \
            --non-interactive \
            --json \
            --no-wait \
            > build_output.json
          cat build_output.json
        working-directory: mobile
        env:
          SCHOOL_ID: vitana
          BUILD_NUMBER: ${{ needs.checks.outputs.build_number }}

      - name: Comment build links on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const buildOutput = JSON.parse(fs.readFileSync('mobile/build_output.json', 'utf8'));
            const androidBuild = buildOutput.find(b => b.platform === 'android');
            const iosBuild = buildOutput.find(b => b.platform === 'ios');

            const body = `## 📱 Preview Build

            | Platform | Status | Download |
            |---|---|---|
            | Android (APK) | ⏳ Building | [View build](${androidBuild?.buildUrl ?? '#'}) |
            | iOS | ⏳ Building | [View build](${iosBuild?.buildUrl ?? '#'}) |

            > Builds take ~20-30 minutes. Links will be available once complete.
            > Build #${{ github.run_number }} · Commit \`${{ github.sha }}`.slice(0, 7)\``;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body,
            });
```

### 6.3 Staging Build (on develop merge)

```yaml
# .github/workflows/mobile-eas-staging.yml
name: Mobile — Staging Build

on:
  push:
    branches: [develop]
    paths:
      - 'mobile/**'
      - 'packages/**'

jobs:
  checks:
    uses: ./.github/workflows/mobile-checks.yml
    secrets: inherit

  staging-build:
    needs: checks
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

      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }

      - name: Install + build shared packages
        run: |
          pnpm install --frozen-lockfile
          pnpm --filter @vitana/shared-types build
          pnpm --filter @vitana/shared-utils build

      - name: EAS Staging Build
        run: |
          eas build \
            --platform all \
            --profile staging \
            --non-interactive \
            --auto-submit
        working-directory: mobile
        env:
          SCHOOL_ID: vitana
          BUILD_NUMBER: ${{ needs.checks.outputs.build_number }}
          EXPO_APPLE_ID: ops@vitanasms.com

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1.27
        with:
          channel-id: 'mobile-builds'
          slack-message: |
            *Mobile Staging Build* ${{ job.status == 'success' && '✅' || '❌' }}
            Branch: `develop`
            Commit: `${{ github.sha }}`.slice(0, 7)`
            <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Run>
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

### 6.4 Production Release (via Git tag)

```yaml
# .github/workflows/mobile-eas-production.yml
name: Mobile — Production Release

on:
  push:
    tags: ['mobile-v*.*.*']

jobs:
  checks:
    uses: ./.github/workflows/mobile-checks.yml
    secrets: inherit

  production-build:
    needs: checks
    runs-on: ubuntu-latest
    environment:
      name: mobile-production  # Requires manual approval — configure in GitHub Settings
      url: ${{ steps.get-build-url.outputs.url }}
    steps:
      - uses: actions/checkout@v4

      - name: Extract version from tag
        id: version
        run: |
          VERSION=${GITHUB_REF#refs/tags/mobile-v}
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "Building version: $VERSION"

      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - uses: pnpm/action-setup@v4
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }

      - name: Install + build shared packages
        run: |
          pnpm install --frozen-lockfile
          pnpm --filter @vitana/shared-types build
          pnpm --filter @vitana/shared-utils build

      - name: EAS Production Build
        id: get-build-url
        run: |
          BUILD_JSON=$(eas build \
            --platform all \
            --profile production \
            --non-interactive \
            --json)
          echo "url=$(echo $BUILD_JSON | jq -r '.[0].buildUrl')" >> $GITHUB_OUTPUT
        working-directory: mobile
        env:
          SCHOOL_ID: vitana
          APP_VERSION: ${{ steps.version.outputs.version }}
          BUILD_NUMBER: ${{ needs.checks.outputs.build_number }}

      - name: Submit to App Stores (internal testing)
        run: eas submit --platform all --latest --non-interactive
        working-directory: mobile

      - name: Upload artifacts to S3
        run: |
          aws s3 cp . s3://vitana-builds/vitana/${{ steps.version.outputs.version }}/ \
            --recursive --exclude "*" --include "*.aab" --include "*.ipa"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Upload source maps to Sentry
        run: |
          npx @sentry/cli sourcemaps inject --org vitana-technologies --project vitana-mobile .expo/
          npx @sentry/cli sourcemaps upload --org vitana-technologies --project vitana-mobile \
            --release "${{ steps.version.outputs.version }}+${{ needs.checks.outputs.build_number }}" .expo/
        working-directory: mobile
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1.27
        with:
          channel-id: 'mobile-builds'
          slack-message: |
            *Production Release* ${{ job.status == 'success' && '✅' || '❌' }}
            Version: `${{ steps.version.outputs.version }}`
            Submitted to: Play Store Internal + TestFlight
            <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Run>
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

### 6.5 OTA Update Deployment

```yaml
# .github/workflows/mobile-ota-update.yml
name: Mobile — OTA Update

on:
  workflow_dispatch:
    inputs:
      channel:
        description: 'Update channel (e.g. production, staging, school-dpsrohini-production)'
        required: true
        type: string
      message:
        description: 'Update description (shown in EAS dashboard)'
        required: true
        type: string
      platform:
        description: 'Target platform'
        required: true
        default: 'all'
        type: choice
        options: [all, android, ios]

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

      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }

      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @vitana/shared-types build
      - run: pnpm --filter @vitana/shared-utils build

      - name: Deploy OTA Update
        run: |
          eas update \
            --channel "${{ github.event.inputs.channel }}" \
            --message "${{ github.event.inputs.message }}" \
            --platform "${{ github.event.inputs.platform }}" \
            --non-interactive
        working-directory: mobile

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1.27
        with:
          channel-id: 'mobile-builds'
          slack-message: |
            *OTA Update Deployed* ✅
            Channel: `${{ github.event.inputs.channel }}`
            Message: "${{ github.event.inputs.message }}"
            By: @${{ github.actor }}
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

### 6.6 School App Build

```yaml
# .github/workflows/mobile-school-build.yml
name: Mobile — Build Dedicated School App

on:
  workflow_dispatch:
    inputs:
      school_id:
        description: 'School ID (must exist in scripts/school-configs.json)'
        required: true
        type: string
      platform:
        description: 'Platform to build'
        required: true
        default: 'all'
        type: choice
        options: [all, android, ios]
      submit_to_stores:
        description: 'Submit to store internal testing after build?'
        required: true
        default: false
        type: boolean

jobs:
  validate-school:
    runs-on: ubuntu-latest
    outputs:
      school_name: ${{ steps.validate.outputs.school_name }}
    steps:
      - uses: actions/checkout@v4
      - name: Validate school ID
        id: validate
        run: |
          SCHOOL_NAME=$(node -e "
            const configs = require('./mobile/scripts/school-configs.json');
            const school = configs['${{ github.event.inputs.school_id }}'];
            if (!school) { console.error('School not found'); process.exit(1); }
            console.log(school.appName);
          ")
          echo "school_name=$SCHOOL_NAME" >> $GITHUB_OUTPUT

  build-school-app:
    needs: validate-school
    runs-on: ubuntu-latest
    environment: mobile-production
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }

      - run: pnpm install --frozen-lockfile

      - name: Inject school assets
        run: node scripts/inject-school-config.js ${{ github.event.inputs.school_id }}
        working-directory: mobile
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build school app
        run: |
          eas build \
            --platform ${{ github.event.inputs.platform }} \
            --profile school-production \
            --non-interactive
        working-directory: mobile
        env:
          SCHOOL_ID: ${{ github.event.inputs.school_id }}
          BUILD_NUMBER: ${{ github.run_number }}

      - name: Submit to stores (if requested)
        if: ${{ github.event.inputs.submit_to_stores == 'true' }}
        run: eas submit --platform ${{ github.event.inputs.platform }} --latest --non-interactive
        working-directory: mobile

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1.27
        with:
          channel-id: 'mobile-builds'
          slack-message: |
            *School App Build* ${{ job.status == 'success' && '✅' || '❌' }}
            School: *${{ needs.validate-school.outputs.school_name }}* (`${{ github.event.inputs.school_id }}`)
            Platform: ${{ github.event.inputs.platform }}
            Store submit: ${{ github.event.inputs.submit_to_stores }}
            By: @${{ github.actor }}
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

### 6.7 Update Existing Backend/Web Workflows (Path Filters)

```yaml
# .github/workflows/backend.yml — ADD to existing trigger:
on:
  push:
    paths-ignore:
      - 'mobile/**'
      - 'ui/**'
      - 'packages/**'
      - 'docs/**'
      - '*.md'
  pull_request:
    paths-ignore:
      - 'mobile/**'
      - 'packages/**'
      - 'docs/**'
```

```yaml
# .github/workflows/web-ui.yml — ADD to existing trigger:
on:
  push:
    paths-ignore:
      - 'mobile/**'
      - 'packages/**'
      - 'docs/**'
  pull_request:
    paths-ignore:
      - 'mobile/**'
      - 'packages/**'
```

### 6.8 OTA Rollback Script

```bash
#!/bin/bash
# mobile/scripts/ota-rollback.sh
# Usage: ./scripts/ota-rollback.sh <channel> [<previous-update-group-id>]
# Example: ./scripts/ota-rollback.sh production
#
# If no group ID provided, rolls back to the "embedded" (app store build) update

CHANNEL=$1
GROUP_ID=$2

if [ -z "$CHANNEL" ]; then
  echo "Usage: $0 <channel> [group-id]"
  exit 1
fi

if [ -z "$GROUP_ID" ]; then
  echo "Rolling back $CHANNEL to embedded bundle..."
  eas update --channel "$CHANNEL" --rollback-to-embedded --non-interactive
else
  echo "Rolling back $CHANNEL to group $GROUP_ID..."
  eas update:republish --channel "$CHANNEL" --group "$GROUP_ID" --non-interactive
fi

echo "Rollback complete. Channel: $CHANNEL"
```

```bash
chmod +x mobile/scripts/ota-rollback.sh
```

---

## PHASE 7: AI/ML Integration

> Not applicable.

---

## PHASE 8: External Integrations

### Configure GitHub Environment

```
GitHub Settings → Environments → New environment
Name: "mobile-production"
Protection rules:
  ✅ Required reviewers: [1 reviewer]
  ✅ Prevent self-review
Deployment branches:
  ✅ Protected branches only (tags matching mobile-v*.*.*)
```

---

## PHASE 9: Testing & Validation

### 9.1 Validation Checklist

- [ ] Open a draft PR with a change to `mobile/README.md` → preview build triggers
- [ ] PR build comment appears within 3 minutes of workflow start
- [ ] Push `mobile-v0.0.1-test` tag → production workflow starts but pauses for approval
- [ ] Approve → build completes
- [ ] Trigger `mobile-ota-update` dispatch to `staging` channel → EAS dashboard shows new update
- [ ] Backend-only change PR → zero mobile workflows triggered
- [ ] `mobile-school-build` dispatch with `school_id=vitana` → successful build
- [ ] Slack notification received in `mobile-builds` channel after each build

### 9.2 Test the Rollback

```bash
cd mobile
# Get current production update group ID
eas update:list --channel production --limit 5

# Simulate rollback
./scripts/ota-rollback.sh staging  # test on staging first
```

---

## PHASE 10: Documentation & Verification

### Required README additions

```markdown
# In mobile/README.md — add CI/CD section:

## CI/CD Pipelines

| Trigger | Workflow | Result |
|---|---|---|
| PR on `mobile/**` | `mobile-eas-preview.yml` | Preview APK + IPA |
| Push to `develop` | `mobile-eas-staging.yml` | Staging build + internal tracks |
| Tag `mobile-v*.*.*` | `mobile-eas-production.yml` | Production build + store submit |
| `workflow_dispatch` | `mobile-school-build.yml` | Dedicated school app |
| `workflow_dispatch` | `mobile-ota-update.yml` | OTA JS update |

## Releasing a New Version

1. Merge all PRs for the release
2. Update version in `mobile/package.json`
3. Push tag: `git tag mobile-v1.2.0 && git push origin mobile-v1.2.0`
4. Approve the production workflow in GitHub Actions
5. Monitor build in EAS dashboard

## Emergency OTA Rollback

./scripts/ota-rollback.sh production [optional-group-id]
```

### Git Commit

```bash
git add .
git commit -m "feat(mobile/ci): complete GitHub Actions CI/CD pipelines

- mobile-checks.yml: reusable type check + lint + test + coverage
- mobile-eas-preview.yml: PR preview APK + IPA with PR comment
- mobile-eas-staging.yml: staging build on develop merge
- mobile-eas-production.yml: prod build on tag with manual approval gate
- mobile-ota-update.yml: workflow_dispatch OTA update to any channel
- mobile-school-build.yml: dedicated school app build
- backend.yml + web-ui.yml: path-ignore filters added
- ota-rollback.sh: emergency rollback script
- github Environment: mobile-production with reviewer protection

Next: PROMPT-16 (Store Setup + Release Ops)"
```

---

**END OF PROMPT-07**
