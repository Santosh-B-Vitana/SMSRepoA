# Mobile Application Deployment Guide

**Platform:** Expo (React Native) + .NET 8 Backend  
**Version:** 1.0  
**Last Updated:** June 2026

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Mobile App (Expo RN)                       │
│  Android APK / iOS IPA — distributed via EAS or direct install  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (JWT Bearer)
┌────────────────────────▼────────────────────────────────────────┐
│              Backend API (.NET 8 / ASP.NET Core)                 │
│  AWS EC2 / ECS  ←→  SQL Server RDS  ←→  Redis Cache            │
│                          ↑                                      │
│                    Firebase Admin SDK (FCM push)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 1 — Backend Deployment

### 1.1 Prerequisites

Before every backend deployment:

- [ ] Database backup taken (RDS snapshot)
- [ ] Redis cache flushed if config schema changed
- [ ] Firebase service account JSON available in AWS Secrets Manager
- [ ] Redis connection string set (required for < 200ms app-config caching)

### 1.2 Run Database Migration

```bash
# On the deployment machine (or CI/CD runner with DB access):
dotnet ef database update --context AppDbContext \
  --connection "Server=...;Database=SMS_SchX;..."

# After PROMPT-11 PR merge, this applies:
# Migration: AddMobileEntities
# New tables: MobileDeviceTokens, UserNotificationPreferences,
#             MobileAppConfigurations, MobileFeatureFlags, NotificationDeliveryLogs
```

Verify migration:
```sql
SELECT name FROM sys.tables WHERE name LIKE 'Mobile%' OR name LIKE 'UserNotification%' OR name = 'NotificationDeliveryLogs';
-- Expected: 5 rows
```

### 1.3 Seed Per-School Data

```sql
-- MobileAppConfiguration (required for /api/mobile/app-config to return versionRequirements)
INSERT INTO MobileAppConfigurations (Id, SchoolId, MinVersion, RecommendedVersion, IsActive, CreatedAt, UpdatedAt)
SELECT NEWID(), Id, '1.0.0', '1.0.0', 1, GETUTCDATE(), GETUTCDATE()
FROM Schools
WHERE IsActive = 1 AND IsDeleted = 0
  AND Id NOT IN (SELECT SchoolId FROM MobileAppConfigurations);
```

### 1.4 Environment Variables

Set these in your deployment environment (ECS task definition / app service / `appsettings.Production.json`):

```json
{
  "Firebase": {
    "ServiceAccountJson": "<AWS-Secrets-Manager-value>",
    "ProjectId": "your-firebase-project-id"
  },
  "ConnectionStrings": {
    "Redis": "your-redis-endpoint:6380,ssl=true,password=..."
  }
}
```

### 1.5 Build and Deploy Backend

```bash
# Build
dotnet publish SmsApi.csproj -c Release -o ./publish

# Docker (if using containers)
docker build -t sms-api:latest .
docker push <ecr-repo>/sms-api:latest

# Deploy (ECS service update or IIS site refresh)
aws ecs update-service --cluster sms-prod --service sms-api --force-new-deployment
```

### 1.6 Smoke Test New Endpoints

```bash
BASE_URL=https://your-api-domain

# 1. App Config (Sprint 2)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/mobile/app-config"
# Expected: 200

# 2. Parent Dashboard (Sprint 3)
curl -s "$BASE_URL/api/mobile/parent-dashboard" \
  -H "Authorization: Bearer $PARENT_TOKEN" | jq .unreadCount
# Expected: number

# 3. Student Minimal List (Sprint 7)
curl -s "$BASE_URL/api/students?minimal=true&pageSize=5" \
  -H "Authorization: Bearer $TEACHER_TOKEN" | jq '.students | length'
# Expected: > 0 if students exist

# 4. Notification Preferences (Sprint 10)
curl -s "$BASE_URL/api/notifications/preferences" \
  -H "Authorization: Bearer $TOKEN" | jq '.preferences'
# Expected: array (may be empty)
```

---

## Part 2 — Mobile App Deployment

### 2.1 Prerequisites

```bash
node --version     # 18+
npm install --global eas-cli
eas --version      # 3+
```

Ensure `mobile/.env` is configured:
```env
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain/api
EXPO_PUBLIC_ENV=production
```

### 2.2 EAS Build — Development/Preview

```bash
cd mobile

# Install dependencies
npm install

# Build for internal distribution (APK for Android, ad-hoc for iOS)
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Share build links with testers
eas build:list --limit 5
```

### 2.3 EAS Build — Production

```bash
cd mobile

# Production build (AAB for Play Store, IPA for App Store)
eas build --platform all --profile production

# Submit directly to stores
eas submit --platform android --latest
eas submit --platform ios --latest
```

### 2.4 Over-the-Air (OTA) Update

For JS-only changes (not native module changes):

```bash
cd mobile
eas update --branch production --message "Fix parent dashboard layout"
```

> OTA updates bypass app store review. Use for bug fixes and UI tweaks only.  
> Any change to `app.config.js` plugins, native modules, or permissions requires a new build.

### 2.5 School-Specific White-Label Build

For a school-branded standalone app:

```bash
cd mobile

# Edit scripts/school-configs.json for the target school
# Then run:
SCHOOL_ID=your-school-id eas build --platform all --profile school-production
```

---

## Part 3 — Firebase / Push Notification Setup

### 3.1 Firebase Project Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create or select project
3. Add Android app: use package name from `app.config.js` (`android.package`)
4. Add iOS app: use bundle ID from `app.config.js` (`ios.bundleIdentifier`)
5. Download `google-services.json` → place in `mobile/` (Android)
6. Download `GoogleService-Info.plist` → place in `mobile/` (iOS)

### 3.2 APNs Setup (iOS)

1. Apple Developer Portal → Certificates → Keys → Create key with APNs capability
2. Download `.p8` file
3. Upload to Firebase: Project Settings → Cloud Messaging → iOS App → APNs Auth Key

### 3.3 Backend Firebase Credentials

```bash
# Generate service account key:
# Firebase Console → Project Settings → Service Accounts → Generate new private key

# Store in AWS Secrets Manager:
aws secretsmanager create-secret \
  --name "sms-api/firebase-service-account" \
  --secret-string "$(cat firebase-service-account.json)"

# Reference in ECS task definition:
# "secretOptions": [{ "name": "Firebase__ServiceAccountJson", "valueFrom": "arn:..." }]
```

---

## Part 4 — Rollback Procedures

### 4.1 Backend Rollback

```bash
# Revert to previous ECS task definition
aws ecs describe-task-definition --task-definition sms-api --query 'taskDefinition.revision'
aws ecs update-service --cluster sms-prod --service sms-api --task-definition sms-api:<prev-revision>

# Revert database migration if needed (removes mobile tables — no data loss to existing tables)
dotnet ef database update 20260610165518_AddWhatsAppCommunicationHub --context AppDbContext
```

### 4.2 Mobile App Rollback

```bash
# Roll back OTA update to previous channel
eas update:rollback --branch production

# For store releases: use Play Store/App Store rollback feature
```

---

## Part 5 — Monitoring

| Signal | Tool | Threshold | Action |
|---|---|---|---|
| App-config cache hit rate | CloudWatch (Redis metric `CacheHits`) | < 90% | Check Redis connection |
| Push delivery failure rate | `NotificationDeliveryLogs` WHERE `DeliveryStatus='Failed'` | > 5% | Check FCM credentials |
| Dashboard p99 latency | CloudWatch ALB target response time | > 600ms | Check DB query plan |
| Invalid token cleanup | `MobileDeviceTokens` WHERE `IsActive=0` growing rapidly | > 100/day | Check FCM project config |

### Useful Queries

```sql
-- Push delivery success rate (last 24h)
SELECT
  DeliveryStatus,
  COUNT(*) AS Count,
  CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,1)) AS Pct
FROM NotificationDeliveryLogs
WHERE AttemptedAt > DATEADD(hour, -24, GETUTCDATE())
GROUP BY DeliveryStatus;

-- Active device tokens per platform
SELECT Platform, COUNT(*) AS TokenCount
FROM MobileDeviceTokens
WHERE IsActive = 1 AND IsDeleted = 0
GROUP BY Platform;

-- App-config cache effectiveness (Redis key pattern)
-- Run in Redis CLI: KEYS mobile:app-config:*
```

---

## Quick Reference — New Endpoints

| Method | Route | Auth | Sprint |
|---|---|---|---|
| GET | `/api/mobile/app-config` | All roles | 2 |
| GET | `/api/mobile/parent-dashboard` | Parent | 3 |
| POST | `/api/fees/payments/mobile-initiate` | Parent, Student | 4 |
| GET | `/api/mobile/teacher-dashboard` | Teacher, Staff, Principal | 7 |
| GET | `/api/students?minimal=true` | All staff | 7 |
| GET | `/api/mobile/student-dashboard` | Student | 9 |
| POST | `/api/notifications/register-device` | All roles | 10 |
| GET | `/api/notifications/preferences` | All roles | 10 |
| PUT | `/api/notifications/preferences/{type}` | All roles | 10 |
| GET | `/api/mobile/admin-dashboard` | Admin, Principal | 14 |
