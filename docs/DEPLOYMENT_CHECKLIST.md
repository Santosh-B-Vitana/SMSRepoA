# Vitana SMS — Deployment Checklist & Environment Reference

> **Version:** 1.0 — June 2026  
> **Covers:** WhatsApp Communication Hub + Full Platform (Backend · Frontend · Mobile)  
> **Environment layers:** Local → Development → Staging → Production

---

## Table of Contents

1. [What's New — Extra Requirements](#1-whats-new--extra-requirements)
2. [Infrastructure Requirements](#2-infrastructure-requirements)
3. [Complete Environment Variable Reference](#3-complete-environment-variable-reference)
   - [3.1 Backend — appsettings.Production.json / Environment Variables](#31-backend--appsettingsjson--environment-variables)
   - [3.2 Frontend — ui/.env.production](#32-frontend--uienvproduction)
   - [3.3 WhatsApp Test Script — scripts/whatsapp/.env](#33-whatsapp-test-script--scriptswhatsappenv)
4. [Pre-Deployment Checklist](#4-pre-deployment-checklist)
   - [4.1 Meta / WhatsApp Business Setup](#41-meta--whatsapp-business-setup)
   - [4.2 Database Migrations](#42-database-migrations)
   - [4.3 Hangfire / Background Jobs](#43-hangfire--background-jobs)
   - [4.4 Redis](#44-redis)
   - [4.5 AWS S3](#45-aws-s3)
   - [4.6 Security & Secrets](#46-security--secrets)
   - [4.7 Backend Application](#47-backend-application)
   - [4.8 Frontend Application](#48-frontend-application)
5. [Deployment Steps](#5-deployment-steps)
6. [Post-Deployment Smoke Test](#6-post-deployment-smoke-test)
7. [WhatsApp Module Activation Per School](#7-whatsapp-module-activation-per-school)
8. [Mobile App Deployment (Future)](#8-mobile-app-deployment-future)
9. [Rollback Plan](#9-rollback-plan)
10. [Secret Rotation Schedule](#10-secret-rotation-schedule)

---

## 1. What's New — Extra Requirements

The WhatsApp Communication Hub introduces dependencies that **did not exist before** in the platform. Every item in this section must be provisioned before deployment.

| New Requirement | Why Needed | Where To Get It |
|---|---|---|
| **Meta Business Account** | Business identity that owns the WABA | business.facebook.com |
| **WhatsApp Business Account (WABA)** | Container for phone number + templates | Meta Business Manager |
| **Verified Phone Number** (Shared Mode) | The number Vitana sends from | WhatsApp → API Setup in Meta Console |
| **Meta System User + Permanent Token** | Never-expiring API access token | Business Manager → System Users |
| **Meta App Secret** | Webhook signature verification (HMAC-SHA256) | App Dashboard → App Settings → Basic |
| **Hangfire SQL Server schema** | Background job storage (8 recurring jobs) | Runs automatically on first startup |
| **Redis (mandatory now)** | Message queue + quota cache + rate limiter | AWS ElastiCache or Redis Cloud |
| **`ngrok` or public HTTPS URL** | Meta webhook endpoint must be publicly reachable | Existing prod URL is sufficient |
| **`SchoolFeaturePermission` row** | Gates WhatsApp Hub in sidebar per school | Super Admin → School Feature Permissions |
| **Webhook subscription on Meta** | Meta must be told where to send status updates | Meta Developer Console → Webhook |
| **44 Utility templates submitted** | Must be APPROVED before messages can send | `python3 scripts/whatsapp/whatsapp_test.py templates register` |

---

## 2. Infrastructure Requirements

### Production Minimum Requirements

| Component | Existing? | Minimum Spec | Notes |
|---|---|---|---|
| SQL Server (Tenant DBs) | ✅ AWS RDS | db.t3.medium | WhatsApp tables add ~15 tables per tenant |
| SQL Server (CRM DB) | ✅ AWS RDS | db.t3.medium | WhatsApp adds 9 CRM tables + Hangfire schema |
| **Redis** | ⚠️ Optional before | **Required now** | min 512 MB, AOF persistence ON |
| .NET 8 App Server | ✅ | 2 vCPU, 4 GB RAM | Hangfire adds 5 worker threads |
| Outbound HTTPS (443) | ✅ | Required | To graph.facebook.com |
| Inbound HTTPS (443) | ✅ | Required | For Meta webhook callbacks |
| AWS S3 | ✅ | Existing bucket | No new requirement |

### Redis — Mandatory for Production

Redis was optional before (app fell back to in-memory cache). With the WhatsApp Hub it is **mandatory** for:
- Message queue (`wa:queue:{schoolId}:p{priority}`)
- Quota cache (`wa:quota:{schoolId}`)
- Rate limiter (80 msg/s per phone number)
- Deduplication keys (`wa:dedup:{schoolId}:{eventKey}:{entityId}`)
- Subscription status cache (`wa:sub:{schoolId}`)

**AWS ElastiCache setup:**
```
Engine: Redis 7.x
Node type: cache.t3.micro (dev) / cache.t3.small (prod)
Multi-AZ: Yes (production)
AOF persistence: yes (appendonly)
Max memory policy: allkeys-lru
```

Enable `appendonly yes` in Redis config. Without AOF, a Redis restart loses all queued messages that haven't been flushed to DB.

---

## 3. Complete Environment Variable Reference

### 3.1 Backend — appsettings.json / Environment Variables

The .NET app reads config in this priority order:
`appsettings.json` → `appsettings.{Environment}.json` → Environment Variables → User Secrets

**In production, set all secrets as OS Environment Variables or AWS Secrets Manager. Never put production secrets in appsettings.json.**

---

#### CONNECTION STRINGS

```json
"ConnectionStrings": {
  "DefaultConnection": "",
  "CRMConnection": "",
  "Redis": ""
}
```

| Variable | Description | Example | Required |
|---|---|---|---|
| `ConnectionStrings__DefaultConnection` | Primary tenant SQL Server DB (template — DBServer/DBName replaced per request by middleware) | `Server=prod-rds.xxxx.ap-south-1.rds.amazonaws.com;Database=SMS_Sch1;User Id=sms_app;Password=XXX;TrustServerCertificate=true;MultipleActiveResultSets=true` | ✅ |
| `ConnectionStrings__CRMConnection` | Platform CRM SQL Server DB (school registry, billing, WhatsApp subscriptions, Hangfire) | `Server=prod-rds.xxxx.ap-south-1.rds.amazonaws.com;Database=SMS_CRM;User Id=sms_crm;Password=XXX;TrustServerCertificate=true` | ✅ |
| `ConnectionStrings__Redis` | Redis connection string | `prod-redis.xxxx.cache.amazonaws.com:6379,password=XXX,ssl=True,abortConnect=false` | ✅ **Now mandatory** |

> **CRM DB user permissions required:** `db_datareader`, `db_datawriter`, `db_ddladmin` (for Hangfire schema creation on first run).

---

#### DATABASE PROVIDER

```json
"DatabaseProvider": "SqlServer"
```

| Variable | Values | Default | Notes |
|---|---|---|---|
| `DatabaseProvider` | `SqlServer` or `PostgreSQL` | `SqlServer` | Production must be `SqlServer` for Hangfire compatibility |

---

#### JWT AUTHENTICATION

```json
"JwtSettings": {
  "Issuer": "SmsApi",
  "Audience": "SmsApiClient",
  "Secret": "",
  "ExpirationInMinutes": 60
}
```

| Variable | Description | Production Value |
|---|---|---|
| `JwtSettings__Secret` | HMAC signing key. Min 32 characters. **Never use default.** | Generate: `openssl rand -base64 48` |
| `JwtSettings__Issuer` | Token issuer claim | `SmsApi` |
| `JwtSettings__Audience` | Token audience claim | `SmsApiClient` |
| `JwtSettings__ExpirationInMinutes` | Token lifetime | `60` (prod) |

---

#### AWS S3 FILE STORAGE

```json
"Aws": {
  "AccessKey": "",
  "SecretKey": "",
  "Region": "ap-south-1",
  "BucketName": "",
  "RootFolder": "vitana-prod",
  "ServiceUrl": "",
  "ForcePathStyle": false
}
```

| Variable | Description | Required |
|---|---|---|
| `Aws__AccessKey` | IAM user access key (or use IAM role instead) | If not using IAM role |
| `Aws__SecretKey` | IAM user secret key | If not using IAM role |
| `Aws__Region` | AWS region | ✅ |
| `Aws__BucketName` | S3 bucket for uploads | ✅ |
| `Aws__RootFolder` | Object key prefix | ✅ |

> **Recommended:** Use IAM Instance Role instead of access keys. Leave `AccessKey` and `SecretKey` blank and attach an IAM role to the EC2/ECS instance with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on the bucket.

---

#### EMAIL (SMTP)

```json
"Email": {
  "SmtpServer": "",
  "SmtpPort": 587,
  "SenderEmail": "",
  "SenderPassword": "",
  "EnableSSL": true
}
```

| Variable | Description | Example |
|---|---|---|
| `Email__SmtpServer` | SMTP host | `email-smtp.ap-south-1.amazonaws.com` (AWS SES) |
| `Email__SmtpPort` | SMTP port | `587` (STARTTLS) or `465` (SSL) |
| `Email__SenderEmail` | From address | `noreply@vitanaschools.in` |
| `Email__SenderPassword` | SMTP password or SES SMTP credential | From SES SMTP Settings |
| `Email__EnableSSL` | Use TLS | `true` |

---

#### WHATSAPP COMMUNICATION HUB ← NEW

```json
"WhatsApp": {
  "MetaApiBaseUrl": "https://graph.facebook.com",
  "MetaApiVersion": "v19.0",
  "SharedPhoneNumberId": "",
  "SharedWabaId": "",
  "SharedAccessToken": "",
  "AppSecret": "",
  "WebhookVerifyToken": "",
  "MessageProcessorBatchSize": 50,
  "MaxRetryAttempts": 3
}
```

| Variable | Description | How To Get It | Required |
|---|---|---|---|
| `WhatsApp__MetaApiBaseUrl` | Meta Graph API base URL | Always `https://graph.facebook.com` | ✅ |
| `WhatsApp__MetaApiVersion` | Graph API version | `v21.0` (latest stable, June 2026) | ✅ |
| `WhatsApp__SharedPhoneNumberId` | Phone Number ID from Meta API Setup page | developers.facebook.com → App → WhatsApp → API Setup → **Phone number ID** | ✅ for Mode A |
| `WhatsApp__SharedWabaId` | WhatsApp Business Account ID | Same page → **WhatsApp Business Account ID** | ✅ for Mode A |
| `WhatsApp__SharedAccessToken` | Permanent System User access token | Business Manager → System Users → Generate Token → scopes: `whatsapp_business_messaging` + `whatsapp_business_management` | ✅ for Mode A |
| `WhatsApp__AppSecret` | Meta App Secret (for webhook HMAC verification) | developers.facebook.com → Your App → App Settings → Basic → **App secret** → Show | ✅ strongly recommended |
| `WhatsApp__WebhookVerifyToken` | Arbitrary secret string you choose — must match what you enter in Meta webhook config | You choose this (e.g. `vitana-webhook-v1-prod-2026`) | ✅ |
| `WhatsApp__MessageProcessorBatchSize` | Messages dequeued per Hangfire job run | `50` (adjust based on rate limits) | Optional |
| `WhatsApp__MaxRetryAttempts` | Retry count before moving to DLQ | `3` | Optional |

> **Token Security:** The `SharedAccessToken` is a long-lived secret. Store it in AWS Secrets Manager or AWS Parameter Store (SecureString). Never put it in a file committed to git.
>
> **Mode B (Dedicated School Numbers):** Access tokens for Mode B schools are stored per-row in `CRM.SchoolWhatsappAccounts.AccessTokenEncrypted`. These are AES-256 encrypted at rest. The encryption key must be set via `WhatsApp__EncryptionKey` (32-byte base64 key — see below).

---

#### WHATSAPP ENCRYPTION KEY (Mode B) ← NEW

```json
"WhatsApp": {
  "AccessTokenEncryptionKey": ""
}
```

| Variable | Description | How To Generate |
|---|---|---|
| `WhatsApp__AccessTokenEncryptionKey` | 32-byte AES-256 key for encrypting school-specific access tokens at rest | `openssl rand -base64 32` — store in AWS Secrets Manager |

---

#### HANGFIRE ← NEW

Hangfire uses the `CRMConnection` SQL Server database. No separate config section needed — it picks up from `ConnectionStrings__CRMConnection` automatically. The schema is created as `hangfire.*` tables on first startup.

**Optional Hangfire tuning:**

```json
"Hangfire": {
  "WorkerCount": 5,
  "DashboardPath": "/hangfire"
}
```

| Variable | Description | Production Recommendation |
|---|---|---|
| `Hangfire__WorkerCount` | Concurrent background job workers | `5` (adjust based on load) |
| `Hangfire__DashboardPath` | URL for Hangfire job monitor UI | `/hangfire` — access restricted to SuperAdmin role |

---

#### CORS

```json
"Cors": {
  "AllowedOrigins": [],
  "FallbackOrigins": []
}
```

| Variable | Description | Production Value |
|---|---|---|
| `Cors__AllowedOrigins__0` | Primary frontend origin | `https://app.vitanaschools.in` |
| `Cors__AllowedOrigins__1` | Subdomain wildcard if needed | `https://*.vitanaschools.in` |

---

#### RATE LIMITING

```json
"RateLimiting": {
  "MaxLoginAttempts": 5,
  "LockoutDurationMinutes": 15
}
```

| Variable | Production Value |
|---|---|
| `RateLimiting__MaxLoginAttempts` | `5` |
| `RateLimiting__LockoutDurationMinutes` | `15` |

---

#### OBSERVABILITY

```json
"OpenTelemetry": {
  "ServiceName": "sms-api",
  "ServiceVersion": "1.0.0",
  "OtlpEndpoint": ""
},
"Seq": {
  "ServerUrl": ""
}
```

| Variable | Description | Example |
|---|---|---|
| `OpenTelemetry__OtlpEndpoint` | OTLP endpoint for distributed tracing (optional) | `http://jaeger:4317` |
| `Seq__ServerUrl` | Seq structured log aggregation (optional) | `http://seq:80` |

---

#### ADMIN PASSWORDS (change on first deploy)

```json
"DefaultAdmin": {
  "Username": "admin",
  "Password": ""
},
"SUPERADMIN_PASSWORD": "",
"DEMO_STAFF_PASSWORD": "",
"DEMO_PARENT_PASSWORD": ""
```

| Variable | Description | Production Note |
|---|---|---|
| `DefaultAdmin__Password` | Initial admin password (seeded on first run) | Use a strong password; admin will be prompted to change on first login |
| `SUPERADMIN_PASSWORD` | Super Admin login password | Must be set via environment variable; not in appsettings |
| `DEMO_STAFF_PASSWORD` | Demo staff account (dev/staging only) | Leave blank or set to invalid in production |
| `DEMO_PARENT_PASSWORD` | Demo parent account (dev/staging only) | Leave blank or set to invalid in production |

---

#### CASHFREE PAYMENT GATEWAY

Set per-school via the Settings UI (Admin → Settings → Payment Gateway). No top-level config required unless you want platform-level defaults.

---

### 3.2 Frontend — ui/.env.production

Create `ui/.env.production` (or pass at build time via CI):

```bash
# ── Vitana SMS Frontend — Production Environment ───────────────────────────────

# API URL — must match the backend deployment URL exactly (no trailing slash)
VITE_API_BASE_URL=https://api.vitanaschools.in

# Optional: Sentry DSN for frontend error tracking
VITE_SENTRY_DSN=

# Optional: PostHog analytics
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://app.posthog.com
```

| Variable | Description | Required |
|---|---|---|
| `VITE_API_BASE_URL` | Full URL of the .NET backend | ✅ |
| `VITE_SENTRY_DSN` | Sentry project DSN for error monitoring | Optional but recommended |
| `VITE_POSTHOG_KEY` | PostHog product analytics key | Optional |

> The frontend build is purely static after `pnpm build`. VITE_ variables are baked into the JS bundle at build time — they are not runtime environment variables. **Never put secrets in VITE_ variables** — they are visible in browser source.

---

### 3.3 WhatsApp Test Script — scripts/whatsapp/.env

```bash
# ── WhatsApp Cloud API Test Credentials ────────────────────────────────────────
# This file is gitignored. Never commit it.

# Meta System User permanent token
WHATSAPP_ACCESS_TOKEN=

# From Meta Developer Console → App → WhatsApp → API Setup
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WABA_ID=

# From App Dashboard → App Settings → Basic → App secret
WHATSAPP_APP_SECRET=

# Arbitrary string — must match WhatsApp__WebhookVerifyToken in appsettings
WHATSAPP_WEBHOOK_VERIFY_TOKEN=vitana_whatsapp_verify

# Default test recipient (registered in Meta sandbox: API Setup → Manage phone number list)
# Format: country code + number, no + prefix (e.g. 919810861740 for +91 9810861740)
WHATSAPP_TEST_RECIPIENT=919810861740

# API version
WHATSAPP_API_VERSION=v21.0
WHATSAPP_API_BASE=https://graph.facebook.com
```

> This file is for local development and CI testing only. The production backend reads credentials from `appsettings` / environment variables — **not from this file**.

---

## 4. Pre-Deployment Checklist

Work through every item in order. Each section must be complete before moving to the next.

---

### 4.1 Meta / WhatsApp Business Setup

These steps must be done **once per Vitana platform deployment** (for Shared Mode). Dedicated school numbers (Mode B) require these steps again per school.

```
□  Create Meta Business Account at business.facebook.com
   └─ Business name: Vitana Technologies Pvt. Ltd.
   └─ Business email: platform@vitana.in
   └─ Business website: https://vitanaschools.in

□  Verify the Meta Business Account
   └─ Upload business registration document (GST Certificate or Company Registration)
   └─ Wait for Meta verification (1-5 business days)
   └─ Status: Settings → Business Info → Verification Status = VERIFIED

□  Create a Meta Developer App
   └─ developers.facebook.com → My Apps → Create App → Business type
   └─ App name: Vitana SMS Production
   └─ Add product: WhatsApp

□  Connect WhatsApp Business Account to the App
   └─ WhatsApp → API Setup → Choose or create WABA
   └─ Copy: Phone Number ID → appsettings WhatsApp__SharedPhoneNumberId
   └─ Copy: WABA ID → appsettings WhatsApp__SharedWabaId

□  Create System User for permanent API access
   └─ business.facebook.com → Settings → System Users → Add
   └─ Name: vitana-sms-api-prod
   └─ Role: Admin
   └─ Click: Generate Token
      └─ App: Vitana SMS Production
      └─ Permissions: whatsapp_business_messaging, whatsapp_business_management
      └─ Token expiry: NEVER
   └─ Copy token → AWS Secrets Manager → "vitana/whatsapp/shared-access-token"
   └─ Set env var: WhatsApp__SharedAccessToken

□  Get App Secret for webhook verification
   └─ developers.facebook.com → App → App Settings → Basic
   └─ Click "Show" next to App secret
   └─ Copy → AWS Secrets Manager → "vitana/whatsapp/app-secret"
   └─ Set env var: WhatsApp__AppSecret

□  Add Display Phone Number (required for production sends)
   └─ WhatsApp → Phone Numbers → Add Phone Number
   └─ Verify with OTP sent to the actual phone number
   └─ Set display name: "Vitana SMS" (must match business verification)

□  Configure Webhook on Meta
   └─ WhatsApp → Configuration → Webhook → Edit
   └─ Callback URL: https://api.vitanaschools.in/api/webhooks/whatsapp
   └─ Verify Token: [same value as WhatsApp__WebhookVerifyToken in appsettings]
   └─ Click Verify and Save (backend must be deployed and reachable first)
   └─ Subscribe to webhook fields:
      ☑ messages
      ☑ message_template_status_update

□  Register 44 Utility templates
   └─ cd scripts/whatsapp
   └─ python3 whatsapp_test.py check       (verify credentials)
   └─ python3 whatsapp_test.py templates register
   └─ Wait 24-72 hours for Meta review
   └─ python3 whatsapp_test.py templates list  (confirm all APPROVED)
```

---

### 4.2 Database Migrations

#### CRM Database (run once)

```bash
export DOTNET_ROOT=$HOME/.dotnet
export PATH="$PATH:$HOME/.dotnet:$HOME/.dotnet/tools"

cd /path/to/SMSRepoA

# Apply CRM migration (adds 9 WhatsApp tables + Hangfire tables on first start)
dotnet ef database update \
  --context CrmDbContext \
  --connection "Server=prod-rds...;Database=SMS_CRM;..."
```

**New CRM tables created:**
- `WhatsappProviders`
- `WhatsappProviderCosts`
- `SchoolWhatsappAccounts`
- `WhatsappPlans`
- `WhatsappSubscriptions`
- `WhatsappBillingInvoices`
- `WhatsappCostTrackings`
- `WhatsappRenewalLedgers`
- `WhatsappPricingConfigs`

#### Per-Tenant Databases

Each school DB needs the per-tenant migration applied. Options:

**Option A — Apply on startup (recommended for small fleets, <20 schools):**

Set `SkipMigrations: false` in appsettings. The app applies migrations on startup for the current request's school DB. Subsequent schools get migrated on their first request.

**Option B — Bulk migration script (recommended for 20+ schools):**

```bash
# List all school DBs from CRM
sqlcmd -S prod-rds -d SMS_CRM -Q \
  "SELECT DBServer, DBName FROM SchoolConfig WHERE IsActive = 1"

# For each DB, run:
dotnet ef database update \
  --context AppDbContext \
  --connection "Server={DBServer};Database={DBName};..."
```

**New per-tenant tables per school:**
- `WhatsappSettings`
- `WhatsappTemplates`
- `WhatsappTemplateVersions`
- `WhatsappTemplateMappings`
- `WhatsappMessageQueues`
- `WhatsappMessageLogs`
- `WhatsappWebhookEvents`
- `WhatsappUsages`
- `WhatsappUsageHistories`
- `WhatsappContacts`
- `WhatsappOptInEvents`
- `WhatsappRetryQueues`
- `WhatsappAuditLogs`
- `WhatsappConversations`

#### Verify Migrations

```sql
-- CRM DB: confirm WhatsApp tables exist
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE 'Whatsapp%'
ORDER BY TABLE_NAME;
-- Expected: 9 rows

-- Tenant DB: confirm WhatsApp tables exist
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE 'Whatsapp%'
ORDER BY TABLE_NAME;
-- Expected: 14 rows

-- Confirm Hangfire schema created (happens on first app start)
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'hangfire'
ORDER BY TABLE_NAME;
-- Expected: ~8 Hangfire system tables after first app boot
```

---

### 4.3 Hangfire / Background Jobs

Hangfire creates its own schema on first application startup. No manual step is needed beyond ensuring the CRM DB user has `db_ddladmin` permission.

```
□  Verify CRM DB user has db_ddladmin role
   SQL: EXEC sp_addrolemember 'db_ddladmin', 'sms_crm_user';

□  After first deployment, confirm Hangfire dashboard is accessible:
   URL: https://api.vitanaschools.in/hangfire
   Auth: SuperAdmin role required
   Expected: Dashboard shows 8 recurring WhatsApp jobs scheduled

□  Verify all 8 recurring jobs are registered:
   ☑ whatsapp-message-processor (every 30 seconds)
   ☑ whatsapp-renewal-engine (daily 00:01 UTC)
   ☑ whatsapp-expiration (daily 00:05 UTC)
   ☑ whatsapp-retry (every 15 minutes)
   ☑ whatsapp-cost-aggregator (hourly)
   ☑ whatsapp-usage-sync (every 5 minutes)
   ☑ whatsapp-quota-alert (daily 03:30 UTC = 09:00 IST)
   ☑ whatsapp-invoice-generator (1st of month 02:00 UTC)

□  Confirm workers are running: Hangfire Dashboard → Servers tab
   Expected: 1 server with 5 workers listed
```

---

### 4.4 Redis

```
□  Redis instance provisioned and reachable from app server
   Test: redis-cli -h <host> ping → PONG

□  AOF persistence enabled (appendonly yes)
   Verify: redis-cli CONFIG GET appendonly → appendonly yes

□  Max memory policy set
   redis-cli CONFIG SET maxmemory-policy allkeys-lru

□  Connection string set in appsettings / env var:
   ConnectionStrings__Redis = "<host>:<port>,password=<pw>,ssl=True,abortConnect=false"

□  Verify app connects to Redis on startup:
   Check logs for: "Using distributed Redis cache"
   (If you see "Using in-memory distributed cache" — Redis is not connected)

□  Health check endpoint confirms Redis:
   GET https://api.vitanaschools.in/health
   Expected: { "Redis": { "status": "Healthy" } }
```

---

### 4.5 AWS S3

```
□  S3 bucket exists and is accessible
□  IAM policy attached allows: s3:PutObject, s3:GetObject, s3:DeleteObject
□  CORS policy on bucket allows requests from api.vitanaschools.in
□  Env vars set: Aws__AccessKey, Aws__SecretKey (or IAM instance role)
□  Env var set: Aws__BucketName, Aws__Region
□  Test: upload one file via app → verify it appears in S3 console
```

---

### 4.6 Security & Secrets

```
□  JWT secret rotated from default
   JwtSettings__Secret = [min 48 chars, random]
   Generate: openssl rand -base64 48

□  SuperAdmin password changed from default
   SUPERADMIN_PASSWORD = [strong password, stored in password manager]

□  WhatsApp tokens stored in AWS Secrets Manager (not in config files)
   Secrets to create:
   ├── vitana/whatsapp/shared-access-token     (Meta System User token)
   ├── vitana/whatsapp/app-secret              (Meta App Secret)
   ├── vitana/whatsapp/webhook-verify-token    (your chosen verify string)
   └── vitana/whatsapp/encryption-key          (AES-256 key for Mode B tokens)

□  Database passwords rotated from dev defaults
   Connection strings use production-grade passwords

□  HTTPS enforced on all endpoints (no HTTP in production)
□  CORS AllowedOrigins set to exact production domain only
□  Security headers middleware active (SecurityHeadersMiddleware)

□  scripts/whatsapp/.env is gitignored
   Verify: git check-ignore -v scripts/whatsapp/.env
   Expected: .gitignore:73:scripts/whatsapp/.env
```

---

### 4.7 Backend Application

```
□  ASPNETCORE_ENVIRONMENT = Production
□  Build: dotnet publish -c Release
□  All NuGet packages restored (Hangfire.Core, Hangfire.SqlServer,
   Hangfire.AspNetCore, Hangfire.InMemory, libphonenumber-csharp)
□  Docker image built with updated Dockerfile
□  Health check passes: GET /health → all green
□  Swagger disabled in production (UseSwagger only in Development)
□  Data Protection keys configured for multi-instance deployment
   (shared key ring required if running multiple instances)
□  Logging level set to Warning for EF Core (prevents SQL query logging)
□  Serilog file sink has adequate disk space for log rotation
```

---

### 4.8 Frontend Application

```
□  VITE_API_BASE_URL points to production API
□  Build: cd ui && pnpm build
□  WhatsApp Hub routes present in App.tsx (added in this release)
□  New lazy-loaded pages included in build:
   ☑ pages/superadmin/WhatsAppHub/index.tsx
   ☑ pages/superadmin/WhatsAppHub/CostDashboard.tsx
   ☑ pages/superadmin/WhatsAppHub/Subscriptions.tsx
   ☑ pages/superadmin/WhatsAppHub/PricingConfig.tsx
   ☑ pages/superadmin/WhatsAppHub/RenewalDashboard.tsx
   ☑ pages/admin/WhatsAppHub/index.tsx
   ☑ pages/admin/WhatsAppHub/Templates.tsx
   ☑ pages/admin/WhatsAppHub/MessageHistory.tsx
   ☑ pages/admin/WhatsAppHub/TestingConsole.tsx
   ☑ pages/admin/WhatsAppHub/Settings.tsx
□  Static assets deployed to CDN / S3 / Nginx
□  Cache-Control headers set correctly for JS chunks
```

---

## 5. Deployment Steps

Execute in this exact order:

### Step 1 — Database (before app deployment)

```bash
# 1a. Apply CRM migration
dotnet ef database update --context CrmDbContext

# 1b. Apply per-tenant migration to all active school DBs
# (or set SkipMigrations=false and let app auto-migrate on first request)
```

### Step 2 — Secrets

```bash
# Push all secrets to AWS Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id vitana/whatsapp/shared-access-token \
  --secret-string "EAARG6A7RTw..."

aws secretsmanager put-secret-value \
  --secret-id vitana/whatsapp/app-secret \
  --secret-string "abc123..."

aws secretsmanager put-secret-value \
  --secret-id vitana/whatsapp/webhook-verify-token \
  --secret-string "vitana-webhook-v1-prod-2026"

# Generate AES-256 key for Mode B token encryption
openssl rand -base64 32
aws secretsmanager put-secret-value \
  --secret-id vitana/whatsapp/encryption-key \
  --secret-string "<generated-key>"
```

### Step 3 — Deploy Backend

```bash
# Build
docker build -t vitana-sms-api:latest .

# Set env vars on container / ECS task definition
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__CRMConnection=Server=...
ConnectionStrings__Redis=...
WhatsApp__SharedPhoneNumberId=1157978060731916
WhatsApp__SharedWabaId=27088955500746088
WhatsApp__SharedAccessToken=<from Secrets Manager>
WhatsApp__AppSecret=<from Secrets Manager>
WhatsApp__WebhookVerifyToken=<from Secrets Manager>
WhatsApp__MetaApiVersion=v21.0

# Deploy (ECS / EC2 / App Service)
docker run -d \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e ConnectionStrings__Redis="..." \
  -e WhatsApp__SharedAccessToken="..." \
  -p 80:80 \
  vitana-sms-api:latest
```

### Step 4 — Deploy Frontend

```bash
cd ui
VITE_API_BASE_URL=https://api.vitanaschools.in pnpm build
# Deploy dist/ to S3 + CloudFront / Nginx
```

### Step 5 — Configure Meta Webhook

```bash
# Verify backend is reachable at webhook URL
curl -X GET "https://api.vitanaschools.in/api/webhooks/whatsapp\
?hub.mode=subscribe\
&hub.verify_token=vitana-webhook-v1-prod-2026\
&hub.challenge=testchallenge"
# Expected response: testchallenge

# Then go to Meta Console and click Verify and Save
```

### Step 6 — Register Templates

```bash
cd scripts/whatsapp

# Verify credentials
python3 whatsapp_test.py check

# Submit all 44 templates
python3 whatsapp_test.py templates register

# Wait 24-72 hours, then check
python3 whatsapp_test.py templates list
# All should show APPROVED
```

### Step 7 — Seed Initial Data via Super Admin

```
1. Login to Super Admin → WhatsApp Hub
2. Configure Provider:
   POST /api/super-admin/whatsapp/providers
   {
     "name": "Meta Cloud API",
     "apiBaseUrl": "https://graph.facebook.com",
     "apiVersion": "v21.0"
   }

3. Create Plans:
   Starter  — 500 msgs  — ₹999/mo
   Growth   — 2000 msgs — ₹2,499/mo
   Pro      — 5000 msgs — ₹4,999/mo
   Elite    — 10000 msgs — ₹7,999/mo

4. Configure Pricing:
   Markup %: 100
   GST %: 18
   Platform fee: 0

5. For each school — create SchoolWhatsappAccount:
   POST /api/super-admin/whatsapp/accounts
   Mode: A (Shared)
   SchoolId: <CRM school ID>
   ProviderId: 1

6. Assign plan to each school:
   POST /api/super-admin/whatsapp/subscriptions
   {
     "accountId": <account ID>,
     "planId": <plan ID>,
     "renewalPolicy": "Expire",
     "overagePolicy": "Block",
     "autoRenew": true
   }
```

---

## 6. Post-Deployment Smoke Test

Run these in order after deployment. Each must pass before proceeding.

```bash
# T1 — Health check
curl https://api.vitanaschools.in/health
# Expected: 200 with all components Healthy

# T2 — Hangfire dashboard accessible
# Open browser: https://api.vitanaschools.in/hangfire (SuperAdmin login required)
# Expected: 8 recurring WhatsApp jobs visible

# T3 — Webhook verification
curl "https://api.vitanaschools.in/api/webhooks/whatsapp\
?hub.mode=subscribe\
&hub.verify_token=<your-verify-token>\
&hub.challenge=ping123"
# Expected: ping123

# T4 — Meta API credentials (from scripts folder)
cd scripts/whatsapp
python3 whatsapp_test.py check
# Expected: ✓ All checks passed

# T5 — Template status
python3 whatsapp_test.py templates list
# Expected: All APPROVED (after 24-72h wait)

# T6 — Ping test recipient (if number registered in Meta sandbox)
python3 whatsapp_test.py ping --to 919810861740
# Expected: ✓ hello_world sent — wamid: wamid.XXXX

# T7 — Full demo send (after templates APPROVED + numbers registered)
python3 whatsapp_test.py demo send
# Expected: 30 sent, 0 failed

# T8 — Delivery status webhook (check Hangfire logs)
# After T7, open WhatsApp on 9810861740
# Check Hangfire: processed job count increasing
# Check DB: SELECT TOP 10 Status, SentAt, DeliveredAt FROM WhatsappMessageLogs ORDER BY CreatedAt DESC
# Expected: Status = 'Delivered' or 'Read'

# T9 — Quota tracking
# After T7:
curl -H "Authorization: Bearer <admin-jwt>" \
  https://api.vitanaschools.in/api/whatsapp/usage
# Expected: { "used": 17, "quota": 2000, "remaining": 1983 }

# T10 — Super Admin cost dashboard
curl -H "Authorization: Bearer <superadmin-jwt>" \
  https://api.vitanaschools.in/api/super-admin/whatsapp/dashboard
# Expected: activeSchools > 0, totalMessagesMtd >= 30
```

---

## 7. WhatsApp Module Activation Per School

For each school that purchases the WhatsApp add-on:

```
□  Super Admin creates SchoolWhatsappAccount (Mode A or Mode B)
□  Super Admin assigns a plan (Starter/Growth/Pro/Elite/Custom)
□  School admin goes to: Settings → WhatsApp Hub → Setup
□  School admin enables: WhatsApp Notifications = ON
□  School admin creates templates (or clones from platform library)
□  School admin submits templates to Meta
□  Wait for template approval (24-72 hours)
□  School admin maps templates to events:
   Settings → WhatsApp Hub → Settings → Event Notification Mappings
□  School admin sends test message via Testing Console
□  Verify message received on target phone
□  School admin enables event auto-send: AutoSendOnEvents = ON
□  Enable WhatsApp module in School Feature Permissions:
   Super Admin → Schools → [school] → Feature Permissions → WhatsApp = true

□  Post-activation test:
   - Mark one student absent in Attendance module
   - Verify WhatsApp message received by parent within 2 minutes
   - Check message log: GET /api/whatsapp/messages?status=Delivered
```

---

## 8. Mobile App Deployment — Phase 1: Foundation (PR: Mobile Scaffold)

> **Status:** Phase 1 scaffold is complete. This section covers all prerequisites that MUST be satisfied before this code can be deployed and tested on a device.

---

### 8.1 What Was Added in This PR

| Component | Files | Purpose |
|---|---|---|
| `pnpm-workspace.yaml` (root) | `/pnpm-workspace.yaml` | Declares `ui`, `mobile`, `packages/*` as workspace packages |
| `@vitana/shared-types` | `packages/shared-types/` | TypeScript contract types shared by web + mobile |
| `@vitana/shared-utils` | `packages/shared-utils/` | Formatter, validator, and constant utilities |
| `@vitana/mobile` | `mobile/` | Expo SDK 52 skeleton with Expo Router v4, auth guard, role-based navigation |
| GitHub Actions workflows | `.github/workflows/mobile-*.yml` | CI/CD pipeline stubs for mobile builds |

---

### 8.2 Prerequisites Before Deploying / Running Mobile App

#### 8.2.1 Developer Tooling

| Tool | Required Version | How To Install |
|---|---|---|
| Node.js | v22+ | `nvm install 22` |
| pnpm | v11+ | `npm install -g pnpm@latest` |
| Expo CLI | Latest | `npm install -g expo-cli` |
| EAS CLI | v10+ | `npm install -g eas-cli` |
| Xcode | 16+ (macOS only, for iOS) | Mac App Store |
| Android Studio | Latest (for Android emulator) | developer.android.com |

#### 8.2.2 Accounts & Credentials

| Account | Required For | Link |
|---|---|---|
| Expo Account | EAS Build, OTA updates | expo.dev/signup |
| Apple Developer Account ($99/year) | iOS builds, App Store | developer.apple.com |
| Google Play Developer Account ($25 one-time) | Android Play Store | play.google.com/console |

#### 8.2.3 Environment Variables — mobile/.env

Create `mobile/.env` from `mobile/.env.example`:

```bash
cp mobile/.env.example mobile/.env
```

Then fill in:

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.vitanasms.com/api   # production
# OR for local dev:
EXPO_PUBLIC_API_BASE_URL=http://localhost:5092/api
EXPO_PUBLIC_ENV=development
```

#### 8.2.4 EAS Project Setup (first time only)

```bash
cd mobile
eas init          # Creates EAS project, writes projectId to app.config.js
eas credentials   # Configure Android keystore + iOS certificates
```

Update `mobile/scripts/school-configs.json` to replace `"YOUR_EAS_PROJECT_ID"` with the actual EAS project ID from `expo.dev`.

#### 8.2.5 Backend API Must Be Running

The mobile app calls:
- `POST /api/auth/login` — login
- `POST /api/auth/refresh` — token refresh
- `GET /api/mobile/app-config` — *(not yet implemented — Phase 2)* school branding & feature flags

Ensure the ASP.NET Core backend is deployed and reachable at the `EXPO_PUBLIC_API_BASE_URL` configured in `.env`.

---

### 8.3 Installation & Build Steps

#### 8.3.1 Install All Workspace Dependencies (from repo root)

```bash
pnpm install
```

#### 8.3.2 Build Shared Packages

```bash
pnpm --filter @vitana/shared-types build
pnpm --filter @vitana/shared-utils build
```

#### 8.3.3 Run the Expo Dev Server

```bash
pnpm --filter @vitana/mobile start
# or directly:
cd mobile && npx expo start
```

#### 8.3.4 Open on Device / Emulator

```bash
# Android emulator (requires Android Studio + API 30+ AVD)
pnpm --filter @vitana/mobile android

# iOS simulator (macOS only, requires Xcode 16+)
pnpm --filter @vitana/mobile ios

# Physical device — scan QR code with Expo Go app
pnpm --filter @vitana/mobile start
```

---

### 8.4 EAS Build Commands

```bash
# Development build (installs Expo Go replacement on device)
cd mobile && eas build --profile development --platform all

# Preview APK (for QA testing, no store required)
cd mobile && eas build --profile preview --platform android

# Production build
cd mobile && eas build --profile production --platform all

# White-label school build
cd mobile && SCHOOL_ID=dps-rohini eas build --profile school-production --platform all
```

---

### 8.5 Mobile Phase 1 Checklist (before merging this PR)

```
[x] pnpm install from repo root completes with exit code 0
[x] pnpm --filter @vitana/shared-types build completes
[x] pnpm --filter @vitana/shared-utils test — all 34 tests pass
[x] pnpm --filter @vitana/mobile typecheck — 0 TypeScript errors
[x] mobile/.env.example present with all required keys documented
[ ] mobile/.env created from mobile/.env.example with valid API URL
[ ] mobile/scripts/school-configs.json EAS project IDs updated (or left as placeholder for Phase 2)
[ ] Expo dev server starts without errors (pnpm --filter @vitana/mobile start)
[ ] App shows auth screen on Android emulator (API 30+)
[ ] App shows auth screen on iOS simulator (iOS 17+)
[ ] Unauthenticated user is redirected to /(auth)/ by root layout guard
```

---

### 8.6 Mobile Test Infrastructure (June 2026)

All items below have been implemented as part of the robustness testing phase.

#### CI Checks (automated on every PR)

| Check | Command | Status |
|---|---|---|
| TypeScript | `pnpm --filter @vitana/mobile typecheck` | ✅ PASS |
| ESLint (0 warnings) | `pnpm --filter @vitana/mobile lint` | ✅ PASS |
| Unit tests + coverage | `pnpm --filter @vitana/mobile test --ci --coverage` | ✅ PASS |
| Coverage gate (≥60% lines) | Inline awk in `mobile-checks.yml` | ✅ Configured |
| Backend smoke (non-blocking) | `bash mobile/scripts/backend-smoke.sh` | ✅ Added (`continue-on-error: true`) |

#### Unit Test Files

| File | Tests | Coverage Area |
|---|---|---|
| `src/features/auth/__tests__/useLogout.test.ts` | 5 | Auth store, logout flow |
| `src/lib/__tests__/analytics.test.ts` | 9 | PII sanitization, amount bucketing |
| `src/notifications/__tests__/handler.test.ts` | 6+ | Deep link routing (21 types) |
| `src/hooks/__tests__/useFeatureFlag.test.ts` | — | Feature flag resolution |
| `src/offline/__tests__/marksDraftService.test.ts` | 8 | SQLite draft CRUD |
| `src/offline/__tests__/offlineQueue.test.ts` | 10 | Queue processing, conflict resolution |
| `src/api/__tests__/client.test.ts` | 5 | Axios interceptors, ApiError |
| `src/api/endpoints/__tests__/communication.test.ts` | 10 | Communication API URLs |
| `src/components/common/__tests__/FeatureErrorBoundary.test.tsx` | 6 | Error boundary + Sentry |
| `src/lib/__tests__/performance.test.ts` | 8 | Screen load spans, slow threshold |

#### Component Tests (React Testing Library)

| File | Tests | Screen |
|---|---|---|
| `src/screens/__tests__/LoginScreen.test.tsx` | 7 | Login form validation, API errors |
| `src/screens/__tests__/SyncStatusScreen.test.tsx` | 8 | Sync queue display, retry |
| `src/screens/__tests__/MarksExamSubjectScreen.test.tsx` | 6 | Exam subject selection |

#### E2E Tests (Maestro — require device)

| File | Flow |
|---|---|
| `maestro/tests/login_parent.yaml` | Parent login |
| `maestro/tests/student_login.yaml` | Student login |
| `maestro/tests/logout.yaml` | Logout |
| `maestro/tests/student_attendance.yaml` | Student attendance view |
| `maestro/tests/student_assignments.yaml` | Student assignments |
| `maestro/tests/student_timetable.yaml` | Student timetable |
| `maestro/tests/student_leave_apply.yaml` | Student leave apply |
| `maestro/tests/student_notifications.yaml` | Student notifications |
| `maestro/tests/teacher_send_message.yaml` | Teacher messaging + announcement |
| `maestro/tests/teacher_create_assignment.yaml` | Teacher create assignment |
| `maestro/tests/teacher_marks_entry.yaml` | Teacher marks entry + save draft |
| `maestro/tests/teacher_create_announcement.yaml` | Teacher announcement standalone |
| `maestro/tests/parent_fee_view.yaml` | Parent fee summary |
| `maestro/tests/parent_view_results.yaml` | Parent exam results |
| `maestro/tests/parent_send_message.yaml` | Parent send message |
| `maestro/tests/admin_dashboard.yaml` | Admin dashboard + broadcast |

#### Scripts

| Script | Purpose |
|---|---|
| `mobile/scripts/smoke-test.sh` | One-command TypeScript + lint + jest |
| `mobile/scripts/backend-smoke.sh` | cURL-based API health checks (all 4 demo roles) |
| `mobile/scripts/ota-rollback.sh` | OTA rollback to embedded or specific update group |

#### Documentation

| File | Purpose |
|---|---|
| `docs/mobile_application_docs/TEST_CASES.md` | 113 detailed test cases (11 categories) |
| `mobile/RELEASE_RUNBOOK.md` | Release procedure including rollback |
| `mobile/store-assets/CHECKLIST.md` | Per-release store asset validation |
| `mobile/store-assets/MAINTENANCE_SCHEDULE.md` | Weekly/monthly/annual tasks |

---

### 8.7 Future Phases (Firebase / APNs / Push Notifications)

These are deferred to later epics (EP-06 Push Notifications):

| Item | Deferred To |
|---|---|
| Firebase project + FCM service account key | EP-06 (Push Notifications) |
| APNs auth key (.p8) for iOS push | EP-06 (Push Notifications) |
| `MobileDeviceTokens` database table | EP-06 (Push Notifications) |
| `POST /api/mobile/device-tokens` endpoint | EP-06 (Push Notifications) |
| `POST /api/mobile/app-config` endpoint | EP-02 (Mobile Foundation — API layer) |
| Expo EAS credentials (production signing) | Before first store release |
| Google Play Console + App Store Connect app creation | Before first store release |

---

## 9. Rollback Plan

If deployment causes issues, roll back in reverse order:

```
1. Rollback frontend:
   Deploy previous build artifact to CDN/Nginx

2. Rollback backend:
   docker run previous-image-tag

3. Database rollback (if needed):
   -- WhatsApp tables are additive only — existing functionality unaffected
   -- To fully remove WhatsApp tables:
   dotnet ef migrations remove (removes last migration from source)
   dotnet ef database update <previous-migration-name>

4. Hangfire tables:
   DROP SCHEMA hangfire CASCADE;
   -- Hangfire will recreate on next startup

5. Meta Webhook:
   -- If webhook causes issues, delete the webhook subscription in Meta Console
   -- Existing templates remain on WABA — no data loss
```

**No breaking changes to existing modules.** The WhatsApp module is purely additive:
- New tables only (no existing table modifications)
- New controllers only (no existing controller changes)
- New MediatR handlers (existing handlers unchanged)
- Existing notification flow (in-app) still works if WhatsApp is disabled

---

## 10. Secret Rotation Schedule

| Secret | Rotation Frequency | How To Rotate |
|---|---|---|
| JWT Secret | Every 6 months | Update env var → rolling restart → existing tokens expire within 1h |
| DB Passwords | Every 6 months | Update RDS → update connection strings → rolling restart |
| WhatsApp Access Token | Never expires (System User) | Rotate if compromised: revoke in Business Manager → generate new → update Secrets Manager |
| WhatsApp App Secret | If compromised | Regenerate in Meta Console → update Secrets Manager → restart |
| Webhook Verify Token | If compromised | Change in both Meta Console and appsettings → restart |
| AES Encryption Key | Never (changing breaks all Mode B tokens) | Only rotate if compromised; re-encrypt all stored tokens when rotating |
| AWS Access Keys | Every 90 days (if not using IAM role) | Rotate in IAM → update env vars |

---

## Quick Reference — All Secrets

| Secret Name | Where Stored (Production) | Required For |
|---|---|---|
| `DefaultConnection` | AWS Secrets Manager or Parameter Store | DB access |
| `CRMConnection` | AWS Secrets Manager | CRM DB + Hangfire |
| `Redis` connection | AWS Secrets Manager | Queue + cache |
| `JwtSettings__Secret` | AWS Secrets Manager | Auth token signing |
| `SUPERADMIN_PASSWORD` | AWS Secrets Manager | Super admin login |
| `Aws__AccessKey` / `SecretKey` | IAM Role (preferred) or Secrets Manager | S3 uploads |
| `WhatsApp__SharedAccessToken` | AWS Secrets Manager | Meta API calls |
| `WhatsApp__AppSecret` | AWS Secrets Manager | Webhook signature verification |
| `WhatsApp__WebhookVerifyToken` | AWS Parameter Store (plain) | Webhook handshake |
| `WhatsApp__AccessTokenEncryptionKey` | AWS Secrets Manager | Mode B token encryption |
| `Email__SenderPassword` | AWS Secrets Manager | SMTP |
| `Cashfree__ApiKey` / `ApiSecret` | Per-school via Admin UI | Payment gateway |
| `Firebase__ServiceAccountKeyJson` | AWS Secrets Manager | Push notifications (future) |
| `Apns__PrivateKeyPath` | AWS Secrets Manager as .p8 content | iOS push (future) |

---

## Section 9 — PROMPT-11: Mobile API Gaps Phase (Sprint 2–14)

**PR Scope:** 10 new backend endpoints + Firebase push + DB schema additions  
**Related Sprints:** 2, 3, 4, 7, 9, 10, 14

### 9.1 Database Migration Prerequisites

Run **before deploying code**:

```bash
dotnet ef database update --context AppDbContext
# Migration: 20260611_AddMobileEntities
# Creates 5 new tables:
#   MobileDeviceTokens
#   UserNotificationPreferences
#   MobileAppConfigurations
#   MobileFeatureFlags
#   NotificationDeliveryLogs
```

Verify migration applied:
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN (
  'MobileDeviceTokens','UserNotificationPreferences',
  'MobileAppConfigurations','MobileFeatureFlags','NotificationDeliveryLogs'
);
-- Expected: 5 rows
```

### 9.2 Environment Variables / Secrets

| Variable | Store | Required For | Sprint |
|---|---|---|---|
| `Firebase__ServiceAccountJson` | AWS Secrets Manager | FCM push delivery | Sprint 10 |
| `Firebase__ServiceAccountPath` | File path (alternative to JSON) | FCM push delivery | Sprint 10 |
| `Firebase__ProjectId` | App Settings | Firebase project reference | Sprint 10 |
| `ConnectionStrings__Redis` | AWS Secrets Manager | App-config caching (5 min TTL) | Sprint 2 |

> **Note:** If `Firebase__ServiceAccountJson` and `Firebase__ServiceAccountPath` are both empty, the app starts normally but push delivery is silently skipped. Never use this in production after Sprint 10.

### 9.3 Seed Data Required

Before deploying the app-config endpoint (Sprint 2):

```sql
-- Insert a MobileAppConfiguration row per active school
INSERT INTO MobileAppConfigurations
  (Id, SchoolId, MinVersion, RecommendedVersion, IsActive, CreatedAt, UpdatedAt)
SELECT
  NEWID(), Id, '1.0.0', '1.0.0', 1, GETUTCDATE(), GETUTCDATE()
FROM Schools
WHERE IsActive = 1 AND IsDeleted = 0;
```

```sql
-- Optionally pre-seed common mobile feature flags
INSERT INTO MobileFeatureFlags
  (Id, SchoolId, FlagKey, IsEnabled, CreatedAt, UpdatedAt)
SELECT
  NEWID(), s.Id, f.FlagKey, f.IsEnabled, GETUTCDATE(), GETUTCDATE()
FROM Schools s
CROSS JOIN (VALUES
  ('mobile.attendance.offline', 1),
  ('mobile.fees.online_payment', 1),
  ('mobile.parent.multi_child', 1),
  ('mobile.attendance.biometric', 0),
  ('mobile.exams.online_exam_portal', 0)
) AS f(FlagKey, IsEnabled)
WHERE s.IsActive = 1 AND s.IsDeleted = 0;
```

### 9.4 Firebase Setup (Sprint 10)

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable Firebase Cloud Messaging (FCM) in the project.
3. Download the **Service Account JSON** from Project Settings → Service Accounts → Generate new private key.
4. Store the JSON content in AWS Secrets Manager under key `Firebase__ServiceAccountJson`.
5. Verify FCM project ID matches the `Firebase__ProjectId` setting.
6. For iOS: ensure APNs certificate or key (.p8) is uploaded to the Firebase project under iOS App settings.

**Test FCM delivery** (after deploying Sprint 10):
```bash
curl -X POST https://your-api-domain/api/notifications/register-device \
  -H "Authorization: Bearer <test-token>" \
  -H "Content-Type: application/json" \
  -d '{"nativeToken":"test-token","platform":"android","deviceId":"test-device-1","appVersion":"1.0.0"}'
# Expected: 200 { message: "Device token registered successfully.", isNew: true }
```

### 9.5 Pre-Deploy Smoke Tests Per Sprint

#### Sprint 2 — App Config
```bash
GET /api/mobile/app-config
Authorization: Bearer <any-role-token>
# Expected: 200, response < 200ms (Redis cached), contains branding.schoolName
```

#### Sprint 3 — Parent Dashboard
```bash
GET /api/mobile/parent-dashboard
Authorization: Bearer <parent-token>
# Expected: 200, children list not empty, todayAttendance or null, unreadCount >= 0
```

#### Sprint 4 — Mobile Payment
```bash
POST /api/fees/payments/mobile-initiate
Authorization: Bearer <parent-token>
Body: { "studentId": "<linked-student-id>", "amount": 500, "purpose": "FeePayment" }
# Expected: 200, paymentSessionId not empty
```

#### Sprint 7 — Teacher Dashboard + Minimal Students
```bash
GET /api/mobile/teacher-dashboard
Authorization: Bearer <teacher-token>
# Expected: 200, todaySchedule list (may be empty)

GET /api/students?classFilter=10A&minimal=true
Authorization: Bearer <teacher-token>
# Expected: 200, each student has only id/name/rollNumber/photo (no address/documents)
```

#### Sprint 9 — Student Dashboard
```bash
GET /api/mobile/student-dashboard
Authorization: Bearer <student-token>
# Expected: 200, todaySchedule list, attendanceThisMonth, unreadCount
```

#### Sprint 10 — Push Notifications
```bash
POST /api/notifications/register-device
Authorization: Bearer <any-user-token>
Body: { "nativeToken": "fcm-token", "platform": "android", "deviceId": "device-1" }
# Expected: 200, isNew: true

GET /api/notifications/preferences
Authorization: Bearer <any-user-token>
# Expected: 200, preferences array (may be empty)

PUT /api/notifications/preferences/Fee
Authorization: Bearer <any-user-token>
Body: { "pushEnabled": false, "emailEnabled": true }
# Expected: 200, { notificationType: "Fee", pushEnabled: false, emailEnabled: true }
```

#### Sprint 14 — Admin Dashboard
```bash
GET /api/mobile/admin-dashboard
Authorization: Bearer <admin-token>
# Expected: 200, todayAttendanceRate (decimal), pendingApprovals object, recentAnnouncements
```

### 9.6 Rollback Plan

If the migration causes issues, run:
```bash
dotnet ef database update 20260610165518_AddWhatsAppCommunicationHub --context AppDbContext
```

This reverts to before `AddMobileEntities`. The 5 new tables will be dropped. No existing data is affected.

---

## Section 10: Mobile App — Phase 2 (EP-01: Authentication & Authorization)

> Sprint 2, Weeks 3–4. No database migrations required (JWT is stateless).

### 10.1 Prerequisites Before Deploying

**Dependencies**
- [ ] Run `pnpm install` from workspace root — ensures `@hookform/resolvers@^3.10.0` and `expo-constants` are installed
- [ ] Run `pnpm --filter @vitana/mobile typecheck` — must exit 0
- [ ] Run `pnpm --filter @vitana/mobile lint` — must exit 0 (max-warnings 0)
- [ ] Run `pnpm --filter @vitana/mobile test` — all 5 tests must pass

**Node.js Version**
- [ ] Confirm Node.js ≤ 22 is active when running `expo start` locally (Node.js 23+ breaks `expo-image` config plugin). Use `nvm use 22` if needed.
- [ ] CI pipelines (`mobile-eas-staging.yml`, `mobile-eas-production.yml`) pin Node.js via `.nvmrc` or `actions/setup-node` — verify version is ≤ 22.

**Backend API endpoints**
- [ ] `POST /api/auth/login` returns `{ token, refreshToken, expiration, user }` (or `{ requiresTwoFactor: true, email }`)
- [ ] `POST /api/auth/refresh` accepts `{ accessToken, refreshToken }`, returns new token pair
- [ ] `POST /api/auth/logout` accepts `{ refreshToken }`, invalidates it server-side
- [ ] `POST /api/auth/2fa/login` accepts `{ email, totp }`, returns full session
- [ ] `GET /api/settings/public-branding?domain=<school-domain>` returns `{ schoolName, logoUrl, primaryColor }` **without** an auth header

**Biometric / iOS**
- [ ] `NSFaceIDUsageDescription` is set in `app.config.js` plugins: `expo-local-authentication` (already configured in PROMPT-01)
- [ ] App Store review: `NSFaceIDUsageDescription` string must be approved before iOS build submission

**Security**
- [ ] Sentry DSN is configured and the scrub filter strips the `Authorization` header from all events
- [ ] Confirm tokens are stored via `expo-secure-store` (Keychain/Keystore) — **never** in AsyncStorage or logs

### 10.2 Environment Variables (No New Vars Required)

No new `EXPO_PUBLIC_*` variables are introduced in Phase 2. All auth endpoints derive from the existing `EXPO_PUBLIC_API_BASE_URL`.

### 10.3 Deployment Steps

```bash
# 1. Install dependencies (workspace root)
pnpm install

# 2. Verify quality gates
pnpm --filter @vitana/mobile typecheck
pnpm --filter @vitana/mobile lint
pnpm --filter @vitana/mobile test

# 3. Build staging (requires EAS CLI and EXPO_TOKEN secret)
cd mobile
eas build --profile staging --platform all

# 4. Run Maestro E2E against staging build (requires Maestro installed)
maestro test maestro/tests/login_parent.yaml
maestro test maestro/tests/logout.yaml

# 5. Promote to production after sign-off
eas build --profile production --platform all
eas submit --platform all
```

### 10.4 Phase 2 Validation Checklist

| Test | Expected Result |
|---|---|
| Login with `demo.parent@demo.vitanasms.com` / `Demo@12345` | Parent Dashboard |
| Login with wrong password | "Incorrect username or password." inline error |
| 5+ failed logins | "Too many attempts. Account locked for 15 minutes." |
| School domain `demo.vitanasms.com` via domain entry screen | Branding logo/name loads on login |
| White-label build (SCHOOL_ID=dps-rohini) | Domain entry screen skipped, login shown directly |
| Valid TOTP after 2FA challenge | Role dashboard |
| Invalid TOTP | "Invalid or expired code" error, code input cleared |
| First login on device with biometrics enrolled | "Enable Face ID / Fingerprint?" alert |
| Biometric unlock on second launch | Navigates to dashboard without password |
| Logout | Login screen shown, `vitana-auth` SecureStore key cleared |
| Cold start to login screen | < 1.5 seconds (measure on mid-range Android) |
| Check Sentry test project | `Authorization` header NOT present in any captured event |

### 10.5 Rollback

Phase 2 is frontend-only (no migrations, no new backend routes). To roll back:
1. Revert the mobile bundle via EAS: `eas update --branch production --message "Rollback auth phase 2"` (OTA update)
2. Or re-promote the prior production build from the EAS dashboard.

---

---

## Section 11: Mobile App — Phase 3 (EP-03: Parent App)

> Sprint 3, Week 5–6. No new database migrations. Requires PROMPT-11 migration already applied.

### 11.1 New Packages Added to mobile/

| Package | Version | Purpose |
|---|---|---|
| `@react-native-async-storage/async-storage` | `^3.1.1` | Offline leave application queue |
| `@react-native-community/netinfo` | `^12.0.1` | Network connectivity detection for fee payment gating |
| `expo-screen-capture` | `^56.0.4` | Prevent screenshots during Cashfree payment flow |
| `@expo/vector-icons` | `^15.1.1` | Feather icon set used across all parent screens |

### 11.2 Feature Flags Required (per school, set via Admin UI or SQL seed)

| Flag Key | Default | Controls |
|---|---|---|
| `mobile.fees.online_payment` / `featureFlags.enableCashfreePayments` | `false` | "Pay Online" button visibility; must be `true` to enable Cashfree |
| `moduleFlags.announcements` | `true` | Announcements menu item in More screen |
| `moduleFlags.diary` | `true` | Class Diary menu item in More screen |
| `moduleFlags.leaves` | `true` | Leave Applications menu item in More screen |

To enable online payment for a school:
1. Admin UI → Settings → Payment Gateway → enter Cashfree ApiKey + ApiSecret (sandbox first)
2. Enable `enableCashfreePayments: true` in `MobileFeatureFlags` for the school:

```sql
UPDATE MobileFeatureFlags
SET IsEnabled = 1, UpdatedAt = GETUTCDATE()
WHERE SchoolId = '<school-id>'
AND FlagKey = 'mobile.fees.online_payment';
```

### 11.3 Cashfree Payment Gateway Setup (per school)

Cashfree credentials are stored per-school in the database — **not** in `appsettings.json`.

| Step | Action | Where |
|---|---|---|
| 1 | Create Cashfree merchant account | [cashfree.com](https://cashfree.com) |
| 2 | Enable "Payment Gateway" product | Cashfree Merchant Dashboard |
| 3 | Get sandbox `ApiKey` + `ApiSecret` | Developer → API Keys |
| 4 | Enter in Admin UI | Admin → Settings → Payment Gateway |
| 5 | Test payment flow with ₹1 | Cashfree test cards: 4111 1111 1111 1111 |
| 6 | Switch to production credentials when ready | Admin → Settings → Payment Gateway |

> **Mandatory:** The deep link scheme `vitanasms://` must be registered in `app.config.js` (already done). For white-label builds using custom schemes, update the `returnUrl` in `fees/pay.tsx` accordingly.

### 11.4 Attendance Endpoint Verification

Before the attendance calendar screen works end-to-end, confirm that `GET /api/attendance/students` accepts `month` and `year` query parameters and returns:

```json
{
  "records": [{ "date": "2026-06-01", "status": "Present" }],
  "presentDays": 18,
  "absentDays": 2,
  "lateDays": 1,
  "totalWorkingDays": 21,
  "attendancePercent": 85.7
}
```

If the endpoint does not support month/year filtering, add a thin service method or query parameter to `AttendanceController` before Sprint 3 testing.

### 11.5 Backend API Endpoints Required (Sprint 3)

All endpoints below must be reachable before the Parent App screens render real data:

| Endpoint | Controller | Status |
|---|---|---|
| `GET /api/mobile/parent-dashboard` | `MobileDashboardController` | ✅ Built |
| `GET /api/students/my-children` | `StudentsController` | Verify exists |
| `GET /api/attendance/students?studentId=&month=&year=` | `AttendanceController` | Verify month/year params |
| `GET /api/fees/records?studentId=` | `FeesController` | Verify exists |
| `POST /api/fees/payments/mobile-initiate` | `FeesController` | ✅ Built |
| `POST /api/fees/transactions/{id}/verify` | `FeesController` | Verify route |
| `GET /api/fees/payments/gateway/transactions?payerId=` | `FeesController` | Verify route |
| `GET /api/fees/payments/{id}/receipt` | `FeesController` | Verify exists |
| `GET /api/examinations/results?studentId=` | `ExaminationsController` | Verify exists |
| `GET /api/examinations/report-cards/{studentId}` | `ExaminationsController` | Verify exists |
| `GET /api/announcements/for-parent?page=&pageSize=` | `AnnouncementsController` | Verify route |
| `GET /api/diary/parent/child/{studentId}?page=&pageSize=` | `DiaryController` | Verify exists |
| `POST /api/leavemanagement/student-leave` | `LeaveManagementController` | Verify exists |
| `GET /api/leavemanagement/student-leave/my-children?studentId=` | `LeaveManagementController` | Verify route |
| `GET /api/notifications/my?page=&pageSize=` | `NotificationsController` | Verify route |
| `PUT /api/notifications/{id}/read` | `NotificationsController` | Verify exists |
| `PUT /api/notifications/read-all` | `NotificationsController` | Verify exists |

### 11.6 Offline Leave Queue

The offline leave queue uses `AsyncStorage` key `offline_leave_queue` (JSON array). Queued leaves are submitted when the device reconnects. To implement auto-sync on reconnect, wire `NetInfo.addEventListener` in the root `_layout.tsx` and call `parentApi.applyLeave()` for each queued item.

### 11.7 Quality Gates (must pass before merging)

```
[ ] pnpm --filter @vitana/mobile typecheck   → 0 TypeScript errors
[ ] pnpm --filter @vitana/mobile lint        → 0 warnings (max-warnings 0)
[ ] pnpm --filter @vitana/mobile test        → all 5 existing tests pass
[ ] Expo dev server starts without errors
[ ] Dashboard screen loads with real data (parent JWT, backend running)
[ ] Attendance calendar shows correct P/A/L day colors
[ ] Fee summary shows correct outstanding balance
[ ] Cashfree payment opens browser checkout (sandbox)
[ ] Leave application submits online AND queues offline
[ ] Notifications mark-read works (bell count decrements)
[ ] All new screens have loading skeleton + empty state
```

### 11.8 Rollback

Phase 3 is frontend-only (no migrations, no new backend routes). To roll back:
1. OTA update: `eas update --branch production --message "Rollback parent app phase 3"`
2. Or re-promote the prior EAS production build from the EAS dashboard.

---

## Section 12: Mobile App — EP-05 Student App (Sprint 9–10) + PROMPT-05 Push Notifications (Sprint 10)

> **Sprint 9–10, Weeks 17–20.** No new database migrations (uses `AddMobileEntities` from PROMPT-11).

### 12.1 What Was Added

#### EP-05 — Student App (19 screens)

| Component | Files | Purpose |
|---|---|---|
| Student API endpoints | `mobile/src/api/endpoints/student.ts` | All student-facing API calls |
| Student Layout | `mobile/app/(student)/_layout.tsx` | 5-tab navigation (Home, Schedule, Results, Assignments, More) |
| Student Dashboard | `mobile/app/(student)/index.tsx` | Today's schedule, attendance %, due assignments, latest result |
| Timetable | `mobile/app/(student)/timetable/index.tsx` + `[day].tsx` | Weekly timetable with day navigator, current-period highlight |
| Exam Results | `mobile/app/(student)/results/index.tsx` + `[examId].tsx` | Result list + subject breakdown, grade badges |
| Report Card | `mobile/app/(student)/results/report-card/[id].tsx` | Opens PDF via expo-web-browser |
| Assignments | `mobile/app/(student)/assignments/index.tsx` + `[id].tsx` + `[id]/submit.tsx` | List with filter tabs, detail, text submission with offline queue |
| Attendance | `mobile/app/(student)/attendance/index.tsx` | Monthly calendar heatmap, shortage alert |
| Fee Summary | `mobile/app/(student)/fees/index.tsx` | Read-only outstanding balance + breakdown |
| Leave | `mobile/app/(student)/leaves/index.tsx` + `apply.tsx` | Leave list + application form with offline queue |
| Library | `mobile/app/(student)/library/index.tsx` | Issued books, overdue alert, fine display |
| Announcements | `mobile/app/(student)/announcements/index.tsx` | Infinite-scroll list |
| Notifications | `mobile/app/(student)/notifications/index.tsx` | Notification center with mark-read |
| Profile | `mobile/app/(student)/profile/index.tsx` | Academic details, photo, sign out |
| More | `mobile/app/(student)/more.tsx` | Navigation hub for secondary screens |

#### PROMPT-05 — Push Notifications

| Component | Files | Purpose |
|---|---|---|
| Push registration | `mobile/src/notifications/registration.ts` | FCM token registration with rotation handling |
| Push handler | `mobile/src/notifications/handler.ts` | Foreground/background/killed-app handler, deep links for 20 types |
| Permission rationale | `mobile/src/components/notifications/PushPermissionRationale.tsx` | Bottom-sheet shown once before system dialog |
| Root layout update | `mobile/app/_layout.tsx` | Mounts notification handlers + triggers registration on auth |
| Deep link tests | `mobile/src/notifications/__tests__/handler.test.ts` | 20 deep link unit tests |
| Teacher notification center | `mobile/app/(teacher)/notifications/index.tsx` | Notification list with mark-all-read, skeleton, deep-link tap |
| Admin notification center | `mobile/app/(admin)/notifications/index.tsx` | Notification list with mark-all-read, skeleton, deep-link tap |
| Shared preferences screen | `mobile/src/features/notifications/NotificationPreferencesScreen.tsx` | Role-filtered Switch toggles, optimistic updates, persisted to backend |
| Parent preferences route | `mobile/app/(parent)/notifications/settings.tsx` | Thin wrapper — parent notification type subset |
| Student preferences route | `mobile/app/(student)/notifications/settings.tsx` | Thin wrapper — student notification type subset |
| Teacher preferences route | `mobile/app/(teacher)/notifications/settings.tsx` | Thin wrapper — teacher notification type subset |
| Admin preferences route | `mobile/app/(admin)/notifications/settings.tsx` | Thin wrapper — admin notification type subset |
| Teacher API update | `mobile/src/api/endpoints/teacher.ts` | Added `getNotifications`, `markNotificationRead`, `markAllNotificationsRead` |

---

### 12.2 Prerequisites Before Deploying

#### 12.2.1 Backend Dependencies (already deployed in PROMPT-11)

| Item | Status |
|---|---|
| `AddMobileEntities` migration applied | Required — includes `MobileDeviceTokens`, `UserNotificationPreferences` |
| `GET /api/mobile/student-dashboard` endpoint | Required |
| `GET /api/students/me` endpoint | Required |
| `GET /api/timetable?classId=X` endpoint | Required |
| `GET /api/attendance/my-attendance?month=&year=` endpoint | Required |
| `GET /api/examinations/results?studentId=me` endpoint | Required |
| `GET /api/assignments?studentId=me` endpoint | Required |
| `POST /api/assignments/{id}/submissions` endpoint | Required |
| `GET /api/fees/records?studentId=me` endpoint | Required |
| `POST /api/attendance/leave-requests` endpoint | Required |
| `GET /api/library/my-issues` endpoint | Required |
| `POST /api/notifications/register-device` endpoint | Required for push |
| `GET /api/notifications/my` endpoint | Required |
| Firebase Admin SDK initialized in backend | Required for push delivery |

#### 12.2.2 Firebase Configuration (PROMPT-05 prerequisite)

```
[ ] Firebase project created at console.firebase.google.com
    └─ Project name: vitana-sms-mobile
    └─ Enable Firebase Cloud Messaging (FCM) product

[ ] Android app added to Firebase project
    └─ Package name: com.vitana.sms
    └─ Download google-services.json → place in mobile/google-services.json
    └─ Add to mobile/.gitignore: google-services.json

[ ] iOS app added to Firebase project
    └─ Bundle ID: com.vitana.sms
    └─ Download GoogleService-Info.plist → place in mobile/GoogleService-Info.plist
    └─ Add to mobile/.gitignore: GoogleService-Info.plist

[ ] For iOS: upload APNs authentication key (.p8) to Firebase project
    └─ Firebase console → Project Settings → Cloud Messaging → iOS app → APNs Auth Key
    └─ Key ID and Team ID from Apple Developer account

[ ] Download Firebase Service Account JSON
    └─ Firebase console → Project Settings → Service Accounts → Generate new private key
    └─ Store JSON content in AWS Secrets Manager under key: Firebase__ServiceAccountJson
    └─ Set backend env var: Firebase__ServiceAccountJson = <JSON content>
    └─ Or: Firebase__ServiceAccountPath = /path/to/service-account.json
```

#### 12.2.3 Environment Variables — Push Notifications

| Variable | Store | Required | Sprint |
|---|---|---|---|
| `Firebase__ServiceAccountJson` | AWS Secrets Manager | Mandatory for push delivery | Sprint 10 |
| `Firebase__ProjectId` | appsettings.json | Mandatory | Sprint 10 |

```json
"Firebase": {
  "ProjectId": "vitana-sms-mobile",
  "ServiceAccountJson": "",
  "ServiceAccountPath": ""
}
```

> If both `ServiceAccountJson` and `ServiceAccountPath` are empty, the app starts normally and silently skips push delivery. **Do not use this in production after Sprint 10.**

#### 12.2.4 Mobile Feature Flags (per school)

| Flag | Default | Controls |
|---|---|---|
| `library` | `true` | Show/hide Library in More tab |
| `hostel` | `false` | Show/hide Hostel card on dashboard |
| `transport` | `false` | Show/hide Transport card on dashboard |
| `mobile.exams.online_exam_portal` | `false` | Show/hide Online Exam button |

Set via Admin UI or SQL:
```sql
UPDATE MobileFeatureFlags
SET IsEnabled = 1, UpdatedAt = GETUTCDATE()
WHERE SchoolId = '<school-id>'
AND FlagKey = 'library';
```

#### 12.2.5 Dev Build Required for Push Notifications

> **Critical:** Push notifications require a **dev build** (not Expo Go). After adding Firebase packages, build with:
> ```bash
> cd mobile && eas build --platform all --profile development
> ```
> Then install on physical devices and scan QR code from Metro.

Push notifications **do not work on:**
- iOS simulators
- Android emulators without Google Play Services

---

### 12.3 Quality Gates (must pass before merging)

```
[ ] pnpm --filter @vitana/mobile typecheck   → 0 TypeScript errors
[ ] pnpm --filter @vitana/mobile lint        → 0 warnings (max-warnings 0)
[ ] pnpm --filter @vitana/mobile test        → all tests pass (including 20 new deep link tests)
[ ] Expo dev server starts without errors
[ ] Student dashboard loads with real API data (student JWT, backend running)
[ ] Timetable renders from API (class schedule visible)
[ ] Assignment list shows correct status badges
[ ] Assignment text submission: online → API called; offline → AsyncStorage queued
[ ] Exam results list → tap → subject breakdown visible
[ ] Report card PDF opens in browser
[ ] Attendance calendar shows P/A/L colors for current month
[ ] Leave application submits online AND queues offline
[ ] Notification bell badge shows unread count
[ ] Push registration: MobileDeviceTokens DB row created after login (physical device)
[ ] Push delivery: receive notification within 5s of backend event (physical device)
[ ] Tap notification → deep-links to correct student screen
[ ] Permission rationale shown once on first login; not shown on subsequent logins
[ ] Teacher notification center: FlashList renders, mark-all-read works
[ ] Admin notification center: FlashList renders, mark-all-read works
[ ] Notification preferences screen: gear icon visible in all 4 role notification centers
[ ] Notification preferences screen: toggles load from GET /notifications/preferences
[ ] Notification preference toggle: persists after app restart (PUT /notifications/preferences/{type} called)
[ ] All screens have loading skeletons and empty states
[ ] No runtime errors in Expo DevTools
```

---

### 12.4 API Smoke Tests

```bash
BASE=https://api-staging.vitanaschools.in/api
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@demo.com","password":"Demo@12345","schoolDomain":"demo.vitanasms.com"}' \
  | jq -r '.token')

# Student dashboard
curl -s "$BASE/mobile/student-dashboard" -H "Authorization: Bearer $TOKEN" | jq .todaySchedule

# Own profile
curl -s "$BASE/students/me" -H "Authorization: Bearer $TOKEN" | jq .rollNumber

# Attendance for current month
MONTH=$(date +%-m) YEAR=$(date +%Y)
curl -s "$BASE/attendance/my-attendance?month=$MONTH&year=$YEAR" -H "Authorization: Bearer $TOKEN" | jq .attendancePercent

# Assignments
curl -s "$BASE/assignments?studentId=me&pageSize=10" -H "Authorization: Bearer $TOKEN" | jq .totalCount

# Fee records
curl -s "$BASE/fees/records?studentId=me" -H "Authorization: Bearer $TOKEN" | jq .pendingAmount

# Push device registration
curl -X POST "$BASE/notifications/register-device" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nativeToken":"test-fcm-token","platform":"android","deviceId":"test-device-01","appVersion":"1.0.0"}'
# Expected: 200 { isNew: true }
```

---

### 12.5 Rollback

EP-05 and PROMPT-05 are purely frontend/mobile changes — no new database migrations.

**OTA rollback (fastest):**
```bash
cd mobile
eas update --branch production --message "rollback: revert student app ep-05"
```

**Full build rollback:**
1. In EAS dashboard → Production channel → select the prior build
2. Click "Re-publish" to push the prior JS bundle as an OTA update

**Push notification rollback:**
- Remove `Firebase__ServiceAccountJson` env var from backend → push silently skips
- No data loss; device tokens remain in DB for future re-enable

---

---

## Section 13: Mobile App — Phase 5 (EP-04: Teacher Portal + Offline Foundation)

> Sprint 7–8. No new database migrations.

### 13.1 New Packages

| Package | Version | Purpose |
|---|---|---|
| `expo-sqlite` | `^56.0.4` | SQLite for offline-first attendance |
| `drizzle-orm` | `^0.45.2` | Type-safe SQLite ORM |
| `drizzle-kit` | `^0.31.10` | Schema dev tooling |
| `expo-notifications` | `^56.0.16` | Push notification handling |
| `expo-application` | `^56.0.3` | Device ID for push registration |

### 13.2 SQLite Offline Foundation

Four tables created on first app launch (`vitana_offline.db`, WAL mode):
- `cached_student_lists` — per-class student list cache
- `attendance_drafts` — in-progress attendance state
- `offline_queue` — FIFO queue for deferred API calls
- `cached_timetable` — teacher timetable cache

### 13.3 Backend Requirements

`POST /api/attendance/students/bulk` must support `X-Idempotency-Key` header.  
`GET /api/students?classId=X&minimal=true` must return `{ id, firstName, lastName, rollNumber, photoUrl }[]`.

### 13.4 Quality Gates

```
[ ] pnpm typecheck → 0 errors
[ ] pnpm lint → 0 warnings
[ ] pnpm test → 26/26 pass
[ ] SQLite WAL mode confirmed: PRAGMA journal_mode = 'wal'
[ ] Attendance marks in airplane mode, syncs on reconnect
```

---

## Section 14: Mobile App — Feature Flag Platform (EP-09 / PROMPT-10)

> Sprint 7–10 (backend Sprint 2 parallel).

### 14.1 New Database Tables

Two new tables added via migration `20260610221349_AddMobileEntities`:

| Table | Purpose | Mandatory | Notes |
|---|---|---|---|
| `MobileFeatureFlags` | Per-school mobile feature flag overrides | Yes | Seed default flags (see 14.3) |
| `MobileAppConfigurations` | Remote config: version gates, maintenance mode | Yes | Insert one row per school |

**Validation step:** `SELECT COUNT(*) FROM MobileFeatureFlags; SELECT COUNT(*) FROM MobileAppConfigurations;` must both return rows after seed.

### 14.2 Migration Execution

```bash
dotnet ef database update --migration 20260610221349_AddMobileEntities
```

If running from scratch, all prior migrations must be applied first.

### 14.3 Seed Data Requirements

Insert a `MobileAppConfigurations` row for each school before go-live:

```sql
INSERT INTO MobileAppConfigurations (Id, SchoolId, MinVersion, RecommendedVersion, ForceUpdateVersion, MaintenanceMode, IsActive, CreatedAt, UpdatedAt)
VALUES (NEWID(), '<SchoolId>', '1.0.0', '1.0.0', NULL, 0, 1, GETUTCDATE(), GETUTCDATE());
```

Insert default mobile feature flags for each school:

```sql
INSERT INTO MobileFeatureFlags (Id, SchoolId, FlagKey, IsEnabled, Notes, CreatedAt)
VALUES
  (NEWID(), '<SchoolId>', 'mobile.attendance.offline', 1, 'Default on', GETUTCDATE()),
  (NEWID(), '<SchoolId>', 'mobile.attendance.biometric', 0, 'Default off', GETUTCDATE()),
  (NEWID(), '<SchoolId>', 'mobile.fees.online_payment', 1, 'Default on', GETUTCDATE()),
  (NEWID(), '<SchoolId>', 'mobile.fees.wallet', 0, 'Default off', GETUTCDATE()),
  (NEWID(), '<SchoolId>', 'mobile.parent.multi_child', 1, 'Default on', GETUTCDATE()),
  (NEWID(), '<SchoolId>', 'mobile.exams.online_exam_portal', 0, 'Default off', GETUTCDATE()),
  (NEWID(), '<SchoolId>', 'mobile.communication.whatsapp_trigger', 0, 'Default off', GETUTCDATE());
```

### 14.4 Redis — App Config Cache

The `GET /api/mobile/app-config` endpoint caches per `mobile:app-config:{schoolId}:{userId}` with 5-minute TTL.

| Requirement | Detail | Mandatory |
|---|---|---|
| Redis connection string | `REDIS__CONNECTIONSTRING` env var must be set | Yes |
| Cache TTL | 5 minutes (hardcoded in `MobileAppConfigService`) | — |
| Cache invalidation | Delete `mobile:app-config:{schoolId}:*` after flag changes | Yes (manual op after admin changes) |

**Validation:** Run `GET /api/mobile/app-config` twice — second call must return in < 50ms (vs ~200ms cold).

### 14.5 Environment Variables (No New Variables)

No new backend environment variables are required beyond those already provisioned. The mobile app requires:

| Variable | Location | Purpose | Mandatory |
|---|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `mobile/.env` | Backend API base URL | Yes |
| `EXPO_PUBLIC_WEB_BASE_URL` | `mobile/.env` | Web portal base URL for "Forgot Password" link. Defaults to `EXPO_PUBLIC_API_BASE_URL` minus `/api`. Only needed if web URL differs from API URL. | No |

### 14.6 Mobile AsyncStorage Cache

The app caches app config in `AsyncStorage` under key `vitana:app_config_cache`.

| Consideration | Detail |
|---|---|
| Cold-start offline | On first launch with no network, if no cached config exists, the API call fails and the app shows an error. Ensure users have connected at least once before going offline. |
| Cache staleness | 30-minute TanStack Query stale time; 24-hour gc time. AsyncStorage persists until app reinstall. |
| Cache clearing | Cleared automatically by `resetBranding()` on logout. |

### 14.7 Force Update Configuration

To trigger a force update:

1. Update `MobileAppConfigurations.ForceUpdateVersion` for the school to the minimum required version (e.g. `"1.2.0"`).
2. Invalidate Redis: `DEL mobile:app-config:*` (or wait 5 minutes for TTL).
3. Within 30 minutes, all mobile clients will receive the updated config and show the force-update screen.

**Rollback:** Set `ForceUpdateVersion` back to `NULL`.

### 14.8 Maintenance Mode Configuration

To enable maintenance mode:

1. `UPDATE MobileAppConfigurations SET MaintenanceMode=1, MaintenanceMessage='We are upgrading our servers. Back in 30 minutes.' WHERE SchoolId='<SchoolId>'`
2. Invalidate Redis (or wait 5 minutes).
3. All mobile clients will be redirected to the maintenance screen.

**Rollback:** `UPDATE MobileAppConfigurations SET MaintenanceMode=0 WHERE SchoolId='<SchoolId>'`

### 14.9 Quality Gates

```
[ ] dotnet ef database update executes without errors
[ ] GET /api/mobile/app-config returns 200 with correct schema
[ ] Redis cache hit on second call (< 50ms response)
[ ] MobileFeatureFlags seed data present for all active schools
[ ] MobileAppConfigurations row present for all active schools
[ ] Mobile: pnpm typecheck → 0 errors
[ ] Mobile: pnpm lint → 0 warnings
[ ] Mobile: useFeatureFlag tests pass (8/8)
[ ] forceUpdateVersion="99.0.0" → force-update screen shown on device
[ ] maintenanceMode=true → maintenance screen shown on device
[ ] library flag=false → LockedModuleCard shown in More tab
[ ] AsyncStorage cache works on airplane mode (cold start)
```

---

---

## 15. EP-06 — Push Notifications (Firebase FCM + APNs)

### 15.1 Firebase Project Setup

| Item | Purpose | Mandatory | Validation |
|---|---|---|---|
| Firebase project created | Hosts FCM and APNs routing | Yes | Console → Project Settings → General |
| Android app registered in Firebase | Provides `google-services.json` | Yes | Console → Project Settings → Your apps |
| iOS app registered in Firebase | Provides `GoogleService-Info.plist` and APNs certificate | Yes | Console → Project Settings → Your apps |
| APNs Auth Key uploaded (`.p8`) | Enables iOS push delivery via FCM | Yes | Firebase console → Project Settings → Cloud Messaging → APNs |
| FCM Sender ID noted | Required in mobile `.env` | Yes | Console → Project Settings → Cloud Messaging |

### 15.2 Backend Environment Variables

| Variable | Location | Purpose | Mandatory | Validation |
|---|---|---|---|---|
| `Firebase:ServiceAccountJson` | `appsettings.Production.json` or env var | Inline JSON of the Firebase service account private key (preferred over path-based in containers) | Yes | `GET /api/notifications/register-device` returns 200; check Hangfire dashboard for no Firebase init warnings |
| `Firebase:ServiceAccountPath` | `appsettings.json` (fallback) | File system path to service account JSON (use `ServiceAccountJson` in containers) | No (use one or the other) | Check startup log: "Firebase initialized successfully" |

**Obtaining the service account JSON:**
1. Firebase Console → Project Settings → Service accounts
2. Click "Generate new private key"
3. Copy the full JSON content into `Firebase:ServiceAccountJson` as a single escaped string, or mount the file and set `Firebase:ServiceAccountPath`

### 15.3 Mobile Environment Variables

| Variable | File | Purpose | Mandatory | Validation |
|---|---|---|---|---|
| `EXPO_PUBLIC_FCM_SENDER_ID` | `mobile/.env` | FCM project number shown to users in Android notification settings | Yes (Android) | Uncomment and set in `.env`; rebuild |
| `GOOGLE_SERVICES_JSON` | EAS Build secret / CI env | Path to per-school `google-services.json` for EAS native builds | Yes (Android EAS builds) | Set as EAS Build secret named `GOOGLE_SERVICES_JSON` |
| `GOOGLE_SERVICES_PLIST` | EAS Build secret / CI env | Path to per-school `GoogleService-Info.plist` for EAS native builds | Yes (iOS EAS builds) | Set as EAS Build secret named `GOOGLE_SERVICES_PLIST` |

### 15.4 EAS Build Configuration

| Item | Purpose | Mandatory | Steps |
|---|---|---|---|
| `google-services.json` placed at `mobile/google-services.json` | Used by `app.config.js` `android.googleServicesFile` during `eas build` | Yes (Android) | Download from Firebase console → Project Settings → Your apps → Android app → `google-services.json` |
| `GoogleService-Info.plist` placed at `mobile/GoogleService-Info.plist` | Used by `app.config.js` `ios.googleServicesFile` during `eas build` | Yes (iOS) | Download from Firebase console → Project Settings → Your apps → iOS app → `GoogleService-Info.plist` |
| `expo-notifications` plugin present in `app.config.js` | Injects FCM and APNs entitlements into native build | Yes | Already added in EP-06 gap closure; verify `plugins` array in `mobile/app.config.js` |
| EAS Build secrets configured | Provides Firebase config files to CI builds | Yes (CI) | `eas secret:create --name GOOGLE_SERVICES_JSON --value "$(cat google-services.json)" --scope project` |

### 15.5 Database Migration

| Item | Purpose | Mandatory | Steps |
|---|---|---|---|
| Migration `20260610221349_AddMobileEntities` | Creates `MobileDeviceTokens`, `NotificationDeliveryLogs`, `UserNotificationPreferences`, `MobileAppConfigurations`, `MobileFeatureFlags` | Yes | `dotnet ef database update` or applied automatically on startup (dev only) |

**Verify post-migration:**
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN (
  'MobileDeviceTokens', 'NotificationDeliveryLogs',
  'UserNotificationPreferences', 'MobileAppConfigurations', 'MobileFeatureFlags'
);
-- Expect: 5 rows
```

### 15.6 Hangfire Scheduled Jobs

| Job ID | Schedule | Purpose | Mandatory | Validation |
|---|---|---|---|---|
| `mobile-token-cleanup` | Weekly, Sunday 02:00 UTC | Deactivates FCM/APNs tokens inactive for > 90 days (NFR-5) | Yes | Hangfire dashboard `/hangfire` → Recurring jobs → `mobile-token-cleanup` shows "Never" (will run next Sunday) |

**Manual trigger for testing:**
Hangfire dashboard → Recurring jobs → `mobile-token-cleanup` → "Trigger now"

### 15.7 Feature Flags / RBAC

No new RBAC policies or feature flags are required. Push notification delivery is always-on once Firebase is configured; per-user preferences are managed through `UserNotificationPreferences` via `PUT /api/notifications/preferences/{notificationType}`.

### 15.8 Rollback Considerations

| Scenario | Rollback Action |
|---|---|
| Firebase credentials misconfigured | Set `Firebase:ServiceAccountJson=""` — `FirebasePushService` silently no-ops; in-app notifications continue working |
| FCM delivering to wrong school | `MobileDeviceTokens.SchoolId` is indexed; verify `SchoolId` is populated correctly on token registration. Tenant isolation is enforced at service level. |
| Invalid token rate > 10% | Check `NotificationDeliveryLogs` where `DeliveryStatus='InvalidToken'`; run `mobile-token-cleanup` job manually |
| Push causes app crash on tap | Set `EXPO_PUBLIC_ENV=development` in EAS Update OTA push; deep link navigation is wrapped in try/catch in `handler.ts` |

### 15.9 Quality Gates

```
[ ] POST /api/notifications/register-device returns 200 and creates row in MobileDeviceTokens
[ ] MobileDeviceTokens row has correct SchoolId (tenant isolation check)
[ ] PUT /api/notifications/preferences/fee_due returns 200
[ ] Firebase console shows registered Android/iOS apps
[ ] Backend logs "Firebase initialized" on startup (not "Firebase not configured — push disabled")
[ ] Send test push via Hangfire or direct FCM console → appears in NotificationDeliveryLogs with Status='Sent'
[ ] Tapping push notification navigates to correct deep-link screen
[ ] mobile-token-cleanup job appears in Hangfire recurring jobs dashboard
[ ] pnpm --filter mobile typecheck → 0 errors
[ ] pnpm --filter mobile test → handler.test.ts 22/22 PASS (21 type tests + completeness test)
[ ] EAS build completes without "google-services.json not found" error
[ ] Notification center (/(parent)/notifications) loads and shows unread badge
[ ] Mark All Read clears unread count
[ ] Notification preference toggles persist after app restart
```

---

## 16. EP-10 White Label Architecture

> **Sprint**: 11–13 · **Story Points**: 34 · **Prompt**: PROMPT-06

### 16.1 Environment Variables

| Variable | Purpose | Mandatory | Validation |
|---|---|---|---|
| `SCHOOL_ID` | Selects the school config in `school-configs.json` at build time | Optional (defaults to `vitana`) | Must match a key in `scripts/school-configs.json` |
| `APP_VERSION` | Semver version string embedded in the binary | Optional (defaults to `1.0.0`) | `^[0-9]+\.[0-9]+\.[0-9]+$` |
| `BUILD_NUMBER` | Monotonically increasing build number for stores | Optional (defaults to `1`) | Integer |
| `EXPO_PUBLIC_API_BASE_URL` | API base URL override at build time | Optional | Valid HTTPS URL |
| `EAS_PROJECT_ID` | EAS project UUID used when `school-configs.json` entry is `REPLACE_ME` | Optional | UUID format |
| `GOOGLE_SERVICES_JSON` | Path to `google-services.json` for Android Firebase | Optional (falls back to `./google-services.json`) | File must exist before `eas build` |
| `GOOGLE_SERVICES_PLIST` | Path to `GoogleService-Info.plist` for iOS Firebase | Optional (falls back to `./GoogleService-Info.plist`) | File must exist before `eas build` |

### 16.2 School Configuration Registry

| Item | Description | Mandatory | Validation |
|---|---|---|---|
| `scripts/school-configs.json` | Registry of all school build configs | Required for white-label builds | Each entry must have: `schoolId`, `appName`, `slug`, `androidPackage`, `iosBundleId`, `apiDomain`, `colors.primary`, `colors.accent`, `isWhiteLabel` |
| `easProjectId` per school | EAS project UUID for OTA updates | Required for production builds | Replace `YOUR_EAS_PROJECT_ID_*` placeholders before building |
| `schoolDomain` for white-label schools | Used to skip domain entry screen | Required for `isWhiteLabel: true` | Must match the school's subdomain pattern `*.vitanasms.com` |

> **Security**: `school-configs.json` contains package names and EAS project IDs. In production, manage via secrets manager or a private configuration repo. The `.gitignore` comment in `mobile/.gitignore` notes this.

### 16.3 Asset Requirements

Before running `eas build` for any school, the following assets must exist in `mobile/assets/school-assets/<schoolId>/`:

| File | Size | Mandatory |
|---|---|---|
| `app-icon-1024.png` | 1024×1024 px | Yes |
| `adaptive-icon.png` | 1024×1024 px (foreground only) | Yes |
| `splash-screen.png` | 2048×2048 px | Yes |
| `notification-icon.png` | 96×96 px monochrome | Yes |

Run the injection script to copy Vitana defaults for missing assets:

```bash
pnpm --filter @vitana/mobile inject:school <schoolId>
```

Asset directories for non-vitana schools are excluded from git via `mobile/.gitignore`.

### 16.4 Database Migration

| Item | Description | Mandatory |
|---|---|---|
| `20260611214839_AddMobileAppBranding` | Creates `MobileAppBrandings` table | Yes — run before first deployment |
| Command | `dotnet ef database update --context SmsApi.Data.AppDbContext` | Yes |
| Rollback | `dotnet ef database update --migration 20260610221349_AddMobileEntities --context SmsApi.Data.AppDbContext` | Drops `MobileAppBrandings` only |

### 16.5 New API Endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/mobile/branding` | Any authenticated role | Returns merged school branding (colors, logo, fonts) |
| `PUT /api/mobile/branding` | Admin, Principal | Upserts the `MobileAppBranding` row for the school |

No new RBAC policies required — existing `Admin` and `Principal` role claims are used.

### 16.6 EAS Build Profiles

For each white-label school, the `eas.json` (managed in PROMPT-07 Build Automation) should define a `school-<schoolId>-production` build profile. EAS project IDs must be set per school before production builds.

### 16.7 Monitoring Requirements

| Check | Action |
|---|---|
| Build-time: missing asset files | The `inject-school-config.js` script warns and exits 0 with a `[miss]` log; EAS build will fail at asset resolution |
| Runtime: `GET /api/mobile/branding` 500 | Check `MobileAppBrandings` migration ran; ensure school record exists in `Schools` table |
| Wrong colors after PUT branding | App-config cache TTL is 5 minutes; wait or restart the app |
| White-label app shows domain entry screen | Verify `isWhiteLabel: true` and `schoolDomain` are set in `school-configs.json` and `extra.isWhiteLabel` is in the installed binary |

### 16.8 Rollback Considerations

| Scenario | Rollback Action |
|---|---|
| Bad color values pushed via PUT branding | Call `PUT /api/mobile/branding` again with corrected hex values; propagates within 5-minute cache TTL |
| White-label binary shows wrong school | Rebuild with correct `SCHOOL_ID` and push OTA update via `eas update` |
| Migration broke existing mobile tables | `dotnet ef database update --migration 20260610221349_AddMobileEntities` — only drops `MobileAppBrandings` |
| `app.config.js` crashes on missing `school-configs.json` | Now wrapped in try/catch; will fall back to vitana defaults silently |

### 16.9 Quality Gates

```
[ ] dotnet build → 0 errors
[ ] dotnet ef database update runs AddMobileAppBranding successfully
[ ] GET /api/mobile/branding returns 200 with correct school colors
[ ] PUT /api/mobile/branding returns 200 for Admin role; 403 for Parent role
[ ] node scripts/inject-school-config.js test-school → creates assets directory, exits 0
[ ] node scripts/inject-school-config.js unknown-school → exits 1 with error message
[ ] SCHOOL_ID=vitana pnpm --filter @vitana/mobile start → no crash (try-catch in app.config.js)
[ ] SCHOOL_ID=test-school pnpm --filter @vitana/mobile start → test-school branding applied
[ ] useAppTheme().colors.primary matches school's primaryColor after setAppConfig()
[ ] Tab bars reflect school's primary color in all 4 role portals
[ ] pnpm --filter @vitana/mobile typecheck → 0 errors
[ ] pnpm --filter @vitana/mobile test → SchoolThemeProvider tests pass
```

---

## 17. EP-13 Admin & Principal Portal

> **Sprint**: 14 · **Story Points**: 24 · **Prompt**: PROMPT-09

### 17.1 Environment Variables

No new environment variables are required. The admin portal reuses the existing `EXPO_PUBLIC_API_BASE_URL` and JWT auth infrastructure.

| Variable | Purpose | Mandatory | Validation |
|---|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Already required — all admin API calls go through this | Yes | Valid HTTPS URL pointing to the .NET backend |

### 17.2 New Dependencies

| Package | Version | Purpose | Mandatory |
|---|---|---|---|
| `victory-native` | `^41.26.0` | Analytics charts (attendance trend, fee collection bars, class-wise bars) | Yes — analytics screen will crash without it |
| `@shopify/react-native-skia` | `1.5.0` | Hardware-accelerated canvas renderer required by victory-native v40+ | Yes |

**EAS Build requirement:** `@shopify/react-native-skia` uses native code and must be compiled. OTA updates alone are insufficient — a new EAS build is required when first adding Skia. Android builds require NDK (managed automatically by EAS). iOS builds require Xcode 15+.

**Verify Skia is in `app.config.js` plugins:**
```js
plugins: [
  ...,
  '@shopify/react-native-skia',  // required for victory-native
]
```

### 17.3 New API Endpoints Used

These endpoints are consumed by the mobile admin portal. Verify all are deployed and accessible before releasing the admin screens.

| Endpoint | Auth Role | Purpose | Validation |
|---|---|---|---|
| `GET /api/mobile/admin-dashboard` | Admin, Principal | KPI summary (attendance, fees, pending approvals, billing alert) | Returns `AdminDashboardResponse` — 200 OK |
| `GET /api/leavemanagement/leave-requests?status=pending&type=staff` | Admin, Principal | Staff pending leave requests | Returns array |
| `GET /api/leavemanagement/leave-requests?status=pending&type=student` | Admin, Principal | Student pending leave requests | Returns array |
| `PUT /api/leavemanagement/leave-requests/{id}/approve` | Admin, Principal | Approve a leave with optional remark | Returns 200 OK |
| `PUT /api/leavemanagement/leave-requests/{id}/reject` | Admin, Principal | Reject a leave with mandatory reason | Returns 200 OK |
| `GET /api/announcements` | Any authenticated | Paginated announcement list | Returns `PaginatedResponse<Announcement>` |
| `POST /api/announcements` | Admin, Principal | Create a new announcement | Returns created `Announcement` |
| `DELETE /api/announcements/{id}` | Admin, Principal | Delete an announcement | Returns 204/200 |
| `GET /api/analytics/dashboard` | Admin, Principal | Attendance trend + fee bar + class-wise data | Returns `AnalyticsDashboard` |
| `GET /api/students?search=X&page=N&pageSize=15` | Admin, Principal | Student search with pagination | Returns `PaginatedResponse<StudentSearchResult>` |
| `GET /api/staff?search=X&page=N&pageSize=15` | Admin, Principal | Staff search with pagination | Returns `PaginatedResponse<StaffSearchResult>` |

### 17.4 Database Migrations

No new migrations are required for the admin portal. All entities (MobileDeviceTokens, UserNotificationPreferences, MobileFeatureFlags, MobileAppConfigurations, MobileAppBranding) were created in previous sprints.

**Verify existing migrations are applied:**

```bash
dotnet ef database update --context SmsApi.Data.AppDbContext
```

### 17.5 Feature Flags

No new feature flags required. The admin portal uses the existing role-based routing in `app/_layout.tsx` (role `Admin` | `Principal` → `/(admin)` route group).

**Verify admin role routing works:**
The root `_layout.tsx` must redirect users with role `Admin` or `Principal` to `/(admin)`. Confirm `useAuthStore().user.role` is set correctly after login.

### 17.6 RBAC / Permissions

| Role | Access | Notes |
|---|---|---|
| `Admin` | Full access to all admin screens | Routed to `/(admin)` after login |
| `Principal` | Full access to all admin screens | Routed to `/(admin)` after login |
| `HRManager` | Leave approvals only | Currently receives same routing as Admin; can be restricted via FeatureGuard |
| `Accountant` | Fee analytics only | Currently receives same routing as Admin; can be restricted via FeatureGuard |

### 17.7 Analytics Endpoint Dependency

The Reports screen (`/(admin)/reports/`) depends on `GET /api/analytics/dashboard`. If this endpoint is not yet implemented in the backend:

- The screen shows an error `EmptyState` with "Analytics unavailable"
- No crash occurs — the query error is handled gracefully
- **Action required:** Implement `GET /api/analytics/dashboard` returning `AttendanceTrendPoint[]`, `FeeBarPoint[]`, and `ClassAttendancePoint[]`

### 17.8 Monitoring Requirements

| Check | Action |
|---|---|
| `GET /api/mobile/admin-dashboard` slow (> 2s) | Add caching to `GetAdminDashboardAsync`; response should be < 2s per success criteria |
| Approval badge count wrong | Dashboard query staleTime is 3 min; badge updates on tab mount or after approve/reject mutations |
| `victory-native` charts crash | Ensure `@shopify/react-native-skia` is in `app.config.js` plugins; EAS build (not OTA) is required |
| `POST /api/announcements` returns 403 | Verify JWT contains `Admin` or `Principal` role claim |

### 17.9 Rollback Considerations

| Scenario | Rollback Action |
|---|---|
| `victory-native` / Skia causes build failure | Remove from `package.json` and replace Reports screen with a static placeholder; OTA update |
| Analytics endpoint not ready | Reports screen already shows graceful `EmptyState` — no action needed |
| Leave approval mutation fails silently | `onError` alert is shown to admin; no data corruption; re-approval is safe (idempotent PUT) |
| Admin routed to wrong portal | Check `useAuthStore().user.role` value returned from `/auth/login`; verify JWT role claim |

### 17.10 Quality Gates

```
[ ] pnpm --filter @vitana/mobile typecheck → 0 errors
[ ] pnpm --filter @vitana/mobile lint → 0 warnings
[ ] EAS build completes without Skia/NDK errors
[ ] GET /api/mobile/admin-dashboard returns 200 with AdminDashboardResponse shape
[ ] Admin dashboard KPIs load in < 2s
[ ] Pending approval badge visible on Approvals tab when pendingApprovals > 0
[ ] Staff leave approval PUT returns 200 and invalidates dashboard cache
[ ] Reject without reason blocked (Alert.prompt + Android modal both enforce validation)
[ ] POST /api/announcements with priority=Urgent shows confirmation dialog before posting
[ ] Announcement appears in list after creation
[ ] Analytics charts render without crash on empty data
[ ] Student/staff search results appear within 300ms debounce after 2+ chars
[ ] Billing alert shown when billingAlert.alertMessage is non-null
[ ] Role-based routing: Admin/Principal → /(admin), Parent → /(parent), Teacher → /(teacher)
```

---

## 18. EP-12 Advanced Offline Sync Engine

> **Sprint**: 12 & 15 · **Story Points**: 24 · **Prompt**: PROMPT-12

### 18.1 Environment Variables

No new environment variables are required. The offline engine runs entirely within the mobile app using SQLite (expo-sqlite) and existing API credentials.

| Variable | Purpose | Mandatory | Validation |
|---|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Morning bundle API calls | Yes | Valid HTTPS URL |

### 18.2 New SQLite Tables

Three new tables are created via `CREATE TABLE IF NOT EXISTS` in `initDatabase()`. No migration file is needed — tables are created automatically on first app launch after the update.

| Table | Purpose | Cleanup |
|---|---|---|
| `marks_drafts` | Auto-saved marks entry drafts (every 30s) | Deleted when `is_submitted = 1` on startup maintenance |
| `diary_entry_queue` | Offline diary post queue with idempotency | Deleted when `status = 'synced'` on startup maintenance |
| `offline_bundle_cache` | Single-row morning bundle cache (id = 1) | Overwritten on each successful bundle fetch |

### 18.3 New Backend Endpoint

| Endpoint | Auth Role | Purpose | Validation |
|---|---|---|---|
| `GET /api/mobile/offline-bundle` | Teacher, Staff | Pre-fetched daily bundle: class rosters + timetable + announcements + pending leave count | Returns `OfflineBundleResponse` — 200 OK |

The endpoint is added to `MobileDashboardController` and delegates to `IMobileDashboardService.GetOfflineBundleAsync`. No additional infrastructure (Redis, queues, crons) required — the endpoint is stateless.

**Verify deployed:**
```bash
curl -H "Authorization: Bearer <teacher_jwt>" \
     https://api.your-school.com/api/mobile/offline-bundle
# Expected: 200 with { bundledAt, expiresAt, myClasses, todaysTimetable, pendingLeaveCount, announcements }
```

### 18.4 New Mobile Files

| File | Purpose |
|---|---|
| `mobile/src/offline/marksDraftService.ts` | `saveDraft` / `loadDraft` / `markSubmitted` |
| `mobile/src/offline/bundleLoader.ts` | WiFi-only morning bundle pre-fetch (5–10 AM, 4-hour freshness) |
| `mobile/src/offline/maintenance.ts` | Startup DB cleanup — deletes synced/submitted records |
| `mobile/src/features/diary/hooks/useDiaryEntry.ts` | Online POST or offline queue to `diary_entry_queue` |
| `mobile/src/components/offline/ConflictResolutionSheet.tsx` | Bottom sheet UI for 409 conflict resolution |
| `mobile/app/(teacher)/sync-status.tsx` | Sync status screen accessible from Teacher More menu |

### 18.5 Modified Mobile Files

| File | Change |
|---|---|
| `mobile/src/offline/schema.ts` | Added 3 new table definitions |
| `mobile/src/offline/db.ts` | Added 3 `CREATE TABLE IF NOT EXISTS` blocks |
| `mobile/src/offline/queue.ts` | 409 now stores structured JSON in `errorMessage`; added `getConflictItems` + `resolveConflict` |
| `mobile/app/_layout.tsx` | Calls `performDatabaseMaintenance()` + `loadMorningBundle()` after DB init |
| `mobile/src/features/navigation/hooks/useTeacherMoreItems.ts` | Added "Sync Status" menu item with live pending badge |

### 18.6 No New Dependencies

All functionality uses existing packages:
- `expo-sqlite` + `drizzle-orm` — SQLite operations
- `@react-native-community/netinfo` — WiFi detection for bundle loader
- `@tanstack/react-query` — `useDiaryEntry` mutation

No new npm packages are required. No new EAS build required — all changes are JS-only and can be deployed via OTA update.

### 18.7 Database Size Monitoring

| Threshold | Action |
|---|---|
| > 40 MB SQLite file | Warning log in `performDatabaseMaintenance()` |
| > 50 MB SQLite file | Force maintenance run — delete all `synced` + submitted records regardless of age |

The `offline_bundle_cache` table stores a single row of JSON. The largest blobs are `classes_json` (student lists). For a school with 50 classes × 40 students, each student being ~200 bytes, the maximum bundle JSON is approximately 400 KB — well within the 50 MB limit.

### 18.8 Rollback Considerations

| Scenario | Rollback Action |
|---|---|
| `offline_bundle_cache` table missing | `initDatabase()` uses `CREATE TABLE IF NOT EXISTS` — table is created automatically on next launch |
| Bundle endpoint returns 500 | `loadMorningBundle()` catches the error with `console.warn` — app continues normally without bundle |
| Marks draft saves corrupted | Delete `marks_drafts` row (PK: `${examId}-${classId}-${subjectId}`) via Flipper SQLite plugin |
| Conflict resolution sheet shows wrong data | Force-delete the `offline_queue` row by ID in Flipper and re-submit |
| 409 conflict loop | `resolveConflict('keep_server')` marks the item `synced` — stops the loop |

### 18.9 Quality Gates

```
[ ] pnpm --filter @vitana/mobile typecheck → 0 errors
[ ] pnpm --filter @vitana/mobile lint → 0 warnings
[ ] vitana_offline.db opens in Flipper/expo-sqlite → marks_drafts, diary_entry_queue, offline_bundle_cache tables exist
[ ] marks_drafts row appears after 30s auto-save in marks entry screen
[ ] diary_entry_queue row appears after submitting diary entry while offline
[ ] GET /api/mobile/offline-bundle returns 200 with OfflineBundleResponse shape
[ ] offline_bundle_cache row exists in SQLite after app opens between 5–10 AM on WiFi
[ ] cachedStudentLists updated from bundle data (check class_id rows)
[ ] ConflictResolutionSheet appears when offline_queue item has type:'conflict' errorMessage
[ ] Conflict resolved with 'use_mine' → item status reset to 'pending' → reprocessed on next sync
[ ] Conflict resolved with 'keep_server' → item status set to 'synced'
[ ] Sync status screen shows correct pending/failed/synced counts
[ ] Retry All button resets failed items to pending and triggers processQueue
[ ] performDatabaseMaintenance() deletes submitted marks_drafts rows on startup
[ ] Teacher More menu shows Sync Status item with upload-cloud icon
[ ] Sync Status badge updates to reflect pending count
```

---

*Document version 2.0 — June 2026 — Vitana SMS Platform*  
*Covers: WhatsApp Communication Hub + Full Platform Deployment + PROMPT-11 Mobile API Gaps + PROMPT-02 Auth + PROMPT-03 Parent App + EP-05 Student App + PROMPT-05 Push Notifications + PROMPT-04 Teacher Portal + EP-09 Feature Flag Platform + EP-06 Push Notifications + EP-10 White Label Architecture + EP-12 Advanced Offline Sync + EP-11 Build Automation CI/CD*

---

## EP-11 — CI/CD Build Automation (PROMPT-07)

> Added: June 2026

---

### Required GitHub Repository Secrets

Navigate to: **GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Purpose | Mandatory | Where to Get It |
|---|---|---|---|
| `EXPO_TOKEN` | EAS CLI authentication for all build workflows | ✅ Yes | [expo.dev/accounts/[account]/settings/access-tokens](https://expo.dev/accounts) |
| `APPLE_TEAM_ID` | Apple Developer team identifier (10-char string) | ✅ Yes | [developer.apple.com](https://developer.apple.com) → Membership |
| `ASC_APP_ID` | App Store Connect numeric App ID | ✅ Yes | App Store Connect → App → App Information → Apple ID |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` | Full JSON content of Play Console service account key | ✅ Yes | Google Cloud Console → IAM → Service Accounts |
| `AWS_ACCESS_KEY_ID` | AWS key for school asset downloads + build artifact uploads | ✅ Yes | AWS IAM Console |
| `AWS_SECRET_ACCESS_KEY` | AWS secret for school asset downloads + build artifact uploads | ✅ Yes | AWS IAM Console |
| `SLACK_BOT_TOKEN` | Slack bot token for build notifications to `#mobile-builds` | ✅ Yes | [api.slack.com/apps](https://api.slack.com/apps) → OAuth & Permissions |
| `EAS_PROJECT_ID` | EAS project UUID — used by `app.config.js` `updates.url` | ✅ Yes | Run `eas project:info` inside `mobile/` after `eas project:init` |
| `SENTRY_AUTH_TOKEN` | Used by production workflow to upload source maps | ✅ Yes | [sentry.io](https://sentry.io) → Settings → Auth Tokens |

**Validation:** After adding all secrets, run any workflow that uses EAS and verify it completes without `secret not found` errors.

---

### GitHub Environment: `mobile-production`

The production and school-build workflows require a protected GitHub Environment to enforce manual approval before store submissions.

**Setup steps:**

1. Go to **GitHub → Repository → Settings → Environments → New environment**
2. Name: `mobile-production`
3. Enable **Required reviewers** — add at least 1 reviewer (e.g. Mobile Lead)
4. Enable **Prevent self-review**
5. Under **Deployment branches**, select **Protected branches only** and ensure tags matching `mobile-v*.*.*` are allowed

**Validation:** Push a test tag `mobile-v0.0.1-test` — the production workflow should pause at the `production-release` job with "Waiting for approval".

---

### EAS One-Time Setup (DevOps — run once per environment)

These steps must be completed before any CI pipeline will succeed. Run from the `mobile/` directory.

| Step | Command | Purpose | Mandatory |
|---|---|---|---|
| 1. Login | `eas login` | Authenticate EAS CLI | ✅ Yes |
| 2. Init project | `eas project:init` | Creates EAS project, generates `projectId` | ✅ Yes |
| 3. Update config | Edit `mobile/scripts/school-configs.json` — set `vitana.easProjectId` to the UUID from step 2 | Links OTA update URL | ✅ Yes |
| 4. Set secret | Add `EAS_PROJECT_ID` GitHub secret with the same UUID | Used by `app.config.js` | ✅ Yes |
| 5. Android creds | `eas credentials --platform android` | Sets up managed keystore | ✅ Yes |
| 6. iOS creds | `eas credentials --platform ios` | Sets up distribution cert + provisioning profile | ✅ Yes (macOS only) |

**Validation:**

```bash
# From mobile/ directory — verify EAS project is linked
eas project:info

# Verify credentials are stored remotely
eas credentials --platform android
eas credentials --platform ios
```

---

### Slack Channel Setup

| Requirement | Value |
|---|---|
| Channel name | `#mobile-builds` |
| Notifications sent by | `SLACK_BOT_TOKEN` secret |
| Events notified | Staging build complete, production release complete, school app build complete, OTA update deployed |

Create the `#mobile-builds` Slack channel and invite the bot before the first staging build.

---

### AWS S3 Bucket for Build Artifacts

| Requirement | Value | Mandatory |
|---|---|---|
| Bucket name | `vitana-builds` | ✅ Yes |
| Path structure | `s3://vitana-builds/{school_id}/{version}/*.aab` and `*.ipa` | — |
| IAM permissions | `s3:PutObject`, `s3:GetObject` on `vitana-builds/*` | ✅ Yes |

The production workflow uploads `.aab` and `.ipa` artifacts after a successful build. Create the bucket and attach the IAM policy to the `AWS_ACCESS_KEY_ID` before the first production release.

---

### Rollback Considerations

| Scenario | Rollback Action |
|---|---|
| Bad OTA update on `production` channel | `cd mobile && ./scripts/ota-rollback.sh production` |
| Bad OTA update on `staging` channel | `cd mobile && ./scripts/ota-rollback.sh staging` |
| Bad OTA update — specific group ID | `cd mobile && ./scripts/ota-rollback.sh production <group-id>` |
| Find group ID for rollback | `eas update:list --channel production --limit 5` |
| Broken app store build | Re-submit the previous build from EAS dashboard |
| Production workflow stuck at approval | Reject it in GitHub Actions — no build is triggered |

---

---

## PROMPT-16 / EP-17: Store Deployment & Release Operations

> **Sprint:** 13–14 | **Owner:** DevOps Engineer + Product Manager

---

### Play Console — One-Time Setup

| Requirement | Value / Action | Mandatory | Validation |
|---|---|---|---|
| Google Play Developer Account | Vitana Technologies Pvt. Ltd. — $25 one-time registration | ✅ Yes | Login to play.google.com/console |
| Play Console app created | App name: `Vitana SMS — School App`, package: `com.vitana.sms` | ✅ Yes | App appears in Play Console dashboard |
| Google Play Service Account key | JSON key with "Release Manager" role → saved as `mobile/google-play-service-account.json` (gitignored) and `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` GitHub secret | ✅ Yes | `eas submit --platform android` succeeds |
| Play Console permissions for service account | "Release apps to testing tracks and production" permission granted | ✅ Yes | `eas submit` completes without 403 |
| Google Play App Signing enrolled | Delegated signing — Google re-signs release AAB | ✅ Yes | Play Console → Setup → App integrity → "App signing by Google Play" active |

---

### App Store Connect — One-Time Setup

| Requirement | Value / Action | Mandatory | Validation |
|---|---|---|---|
| Apple Developer Program | Vitana Technologies Pvt. Ltd. — $99/year | ✅ Yes | developer.apple.com/account shows active membership |
| App Store Connect app created | Name: `Vitana SMS`, Bundle ID: `com.vitana.sms`, SKU: `vitana-sms-001` | ✅ Yes | App visible in App Store Connect |
| `APPLE_TEAM_ID` GitHub secret | Team ID from developer.apple.com/account → Membership | ✅ Yes | `eas build` iOS succeeds; no "team not found" error |
| `ASC_APP_ID` GitHub secret | Apple ID of the app — found in App Store Connect → App → General → Apple ID (a 10-digit number) | ✅ Yes | `eas submit --platform ios` succeeds |
| `ASC_APP_ID` EAS secret | Same 10-digit Apple ID set via `eas secret:create --scope project --name ASC_APP_ID` | ✅ Yes | `eas submit` reads the value |
| `APPLE_TEAM_ID` EAS secret | Same Team ID set via `eas secret:create --scope project --name APPLE_TEAM_ID` | ✅ Yes | `eas build --platform ios` succeeds |

---

### Store Listing Assets

| Requirement | Value / Action | Mandatory | Validation |
|---|---|---|---|
| Play Store listing complete | App name, short description (≤80 chars), full description (≤4000 chars) — see `mobile/store-assets/descriptions/play-store.md` | ✅ Yes | Play Console store listing shows green checkmarks |
| App Store listing complete | Name, subtitle (≤30 chars), description, keywords (≤100 chars) — see `mobile/store-assets/descriptions/app-store.md` | ✅ Yes | App Store Connect listing form complete |
| Android screenshots | 6 × 1080×1920 PNG, ≤8 MB each — see `mobile/store-assets/CHECKLIST.md` | ✅ Yes | Uploaded in Play Console; no size/dimension error |
| Android feature graphic | 1024×500 PNG | ✅ Yes | Uploaded in Play Console |
| Play Console icon | 512×512 PNG, no alpha | ✅ Yes | Uploaded in Play Console |
| iOS iPhone 6.7" screenshots | 6 × 1290×2796 PNG | ✅ Yes | Uploaded in App Store Connect |
| iOS iPhone 5.5" screenshots | 6 × 1242×2208 PNG | ✅ Yes | Uploaded in App Store Connect |
| iOS iPad 13" screenshots | 3 × 2064×2752 PNG | ✅ Yes | Uploaded in App Store Connect |
| iOS App Store icon | 1024×1024 PNG, no alpha — sourced from `mobile/assets/school-assets/vitana/app-icon-1024.png` | ✅ Yes | EAS builds icon automatically from `app.config.js` |

---

### Privacy & Compliance

| Requirement | Value / Action | Mandatory | Validation |
|---|---|---|---|
| Privacy policy URL live | https://vitanasms.com/privacy — returns HTTP 200 | ✅ Yes | `curl -I https://vitanasms.com/privacy` → 200 |
| Support URL live | https://vitanasms.com/support — returns HTTP 200 | ✅ Yes | `curl -I https://vitanasms.com/support` → 200 |
| Play Store Data Safety completed | All data types declared in Play Console — see `mobile/store-assets/data-safety.md` Part A | ✅ Yes | Play Console → App Content → Data Safety → "Submitted" |
| Play Store content rating | IARC questionnaire completed; rating: Everyone, target audience: 13+ | ✅ Yes | Play Console → App Content → Content Rating → "Applied" |
| App Store Privacy Nutrition Label | All data types declared — see `mobile/store-assets/data-safety.md` Part B | ✅ Yes | App Store Connect → App Privacy → "Completed" |
| App Review Notes | Demo credentials document uploaded — from `mobile/store-assets/app-review-notes.md` (1Password) | ✅ Yes | App Store Connect → App Review Information section filled |
| `app-review-notes.md` gitignored | Entry present in `.gitignore`: `mobile/store-assets/app-review-notes.md` | ✅ Yes | `git status` does not show the file |
| Credentials stored in 1Password | Vault entry: "Vitana SMS App Review Notes" | ✅ Yes | Team can retrieve credentials from 1Password |

---

### Demo School Permanence

| Requirement | Value / Action | Mandatory | Validation |
|---|---|---|---|
| Demo school active | `demo.vitanasms.com` school permanently seeded in production database | ✅ Yes | Login with all 4 demo accounts returns HTTP 200 |
| Demo credentials never expire | Demo accounts exempt from password expiry policy | ✅ Yes | Login works > 90 days without password reset |
| Demo data populated | Aarav Sharma in Class 8A, attendance records, fee records, exam results visible | ✅ Yes | Parent dashboard shows child data after login |

**Verification:**
```bash
for user in demo.parent demo.teacher demo.student demo.admin; do
  echo -n "$user@demo.vitanasms.com: "
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://api.vitanasms.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$user@demo.vitanasms.com\",\"password\":\"Demo@12345\"}"
done
```

---

### Staged Rollout Configuration

| Requirement | Value / Action | Mandatory | Validation |
|---|---|---|---|
| Android staged rollout | Start at 10% → advance to 25% → 50% → 100% with 24h+ between each step | ✅ Yes | Play Console → Production → Rollout percentage shows 10% |
| Android halt thresholds monitored | Crash rate < 1%, ANR rate < 0.5% | ✅ Yes | Play Console → Android Vitals showing green |
| iOS Phased Release enabled | Checkbox enabled in App Store Connect before submitting for review | ✅ Yes | App Store Connect → Version → "Phased Release" toggle ON |
| iOS phased release monitoring | Day 1 (1%) → manual advancement if healthy; pause immediately if issues | ✅ Yes | App Store Connect → Version → Phased Release status |

---

### Release Runbook

| Requirement | Value / Action | Mandatory | Validation |
|---|---|---|---|
| Release runbook available | `mobile/RELEASE_RUNBOOK.md` committed to repository | ✅ Yes | File exists; team can access it |
| Runbook reviewed by team lead | Engineering Lead has read and approved | ✅ Yes | GitHub PR review comment or Slack confirmation |
| OTA rollback tested in staging | `./scripts/ota-rollback.sh staging` executed successfully | ✅ Yes | EAS update list shows rollback update on staging channel |
| Emergency hotfix path documented | Both OTA and binary paths covered in runbook | ✅ Yes | Section "Emergency Hotfix Decision Tree" in runbook |

---

### Rollback Considerations (PROMPT-16)

| Scenario | Rollback Action |
|---|---|
| Bad OTA on `production` channel | `cd mobile && ./scripts/ota-rollback.sh production` |
| Bad OTA — specific update group | `cd mobile && ./scripts/ota-rollback.sh production <group-id>` |
| Android staged rollout bad binary | Play Console → Production → "Halt rollout" |
| iOS phased release bad binary | App Store Connect → Version → "Pause Phased Release" |
| Immediate iOS fix needed | Submit new patch version → request Expedited Review in App Store Connect |

---

## EP-14: Examinations & Marks Mobile (PROMPT-13)

*Implemented: June 2026*

### Environment Variables

No new environment variables required for this module. All APIs use the existing `NEXT_PUBLIC_API_URL` / backend base URL already configured.

### Infrastructure Requirements

| Requirement | Purpose | Mandatory | Validation |
|---|---|---|---|
| Redis (already deployed) | Idempotency key cache for `POST .../marks` endpoint (24h TTL, key prefix `marks_idem:`) | ✅ Yes | `redis-cli ping` → `PONG`; `redis-cli keys "marks_idem:*"` should be empty initially |
| SQLite on device (expo-sqlite) | `marks_drafts` table stores offline mark drafts per exam+subject | ✅ Yes — already present from PROMPT-12 | App launches without `marks_drafts` migration errors in Sentry |

### Database Migrations

No new server-side migrations. The `marks_drafts` SQLite table was created by PROMPT-12's `initDatabase()` call (`CREATE TABLE IF NOT EXISTS marks_drafts …`). No action needed for existing installations.

### Feature Flags

| Flag | Default | Purpose |
|---|---|---|
| `canEnterMarks` (RBAC permission) | Enabled for `Staff` role | Guards marks entry screens; already in `RolePermissionsDto.CanEnterMarks` |

No new feature flags needed; marks entry is controlled by server-side role assignment in `ExamSetupController.my-assignments`.

### API Endpoint Changes

| Endpoint | Change | Breaking? |
|---|---|---|
| `POST /api/examinations/exam-setup/{id}/subjects/{sid}/marks` | Added optional `X-Idempotency-Key` header + Redis cache check/store | No — header is optional |
| `GET /api/examinations/exam-setup/my-assignments` | No change — already existed | — |
| `GET /api/examinations/exam-setup/{id}/subjects/{sid}/marks` | No change — already existed | — |
| `POST /api/assignments` | No change | — |
| `GET /api/assignments/{id}/submissions` | No change | — |
| `PUT /api/assignments/submissions/{id}/grade` | No change | — |

### Rollback Considerations (PROMPT-13)

| Scenario | Rollback Action |
|---|---|
| Marks submitted twice (idempotency cache miss) | Server-side upsert in `SaveBulkMarksAsync` is idempotent by design (re-writes same marks); no data loss |
| Draft corrupted in SQLite | Clear draft: `marksDraftService.markSubmitted(examSetupId, examSetupSubjectId, '-')` — removes from next load |
| Performance screen crashes | Navigate back with router; marks already saved to server |
| Assignment creation fails | Form shows error toast; no partial state persisted on server |

---

## EP-15: Communication & Messaging (PROMPT-14)

*Implemented: June 2026*

### Environment Variables

No new environment variables required. All communication endpoints are served by the existing backend under the authenticated API base URL.

### Infrastructure Requirements

| Requirement | Purpose | Mandatory | Validation |
|---|---|---|---|
| Push notification service (FCM + APNs) | Deliver `new_message_teacher` / `new_message_parent` pushes within 5 s of message creation | ✅ Yes — already configured via PROMPT-05 | Send a test message; receiving device shows notification within 10 s |
| Existing `/api/communication/messages/*` endpoints | Conversation list, thread, send, mark-read, unread-count | ✅ Yes — provided by backend | `GET /api/communication/messages/conversations` returns HTTP 200 with valid JSON |
| Existing `/api/announcements` endpoint | Teacher announcement creation and retrieval | ✅ Yes | `POST /api/announcements` with valid teacher JWT returns HTTP 201 |
| Existing `/api/communication/messages/recipients` endpoint | Returns list of parents a teacher can message | ✅ Yes | `GET /api/communication/messages/recipients` returns HTTP 200; non-empty for seeded teachers |

### Mobile AsyncStorage Keys

| Key Pattern | Purpose | Lifecycle |
|---|---|---|
| `message_draft_{conversationId}` | Persists unsent message text per conversation | Written on every keystroke (500 ms debounce); deleted on send or manual clear |
| `message_draft_{recipientId}` | Draft for new conversations before conversation ID is known | Deleted when conversation is created |

### Push Notification Types

| Type | Handler | Deep-link destination |
|---|---|---|
| `new_message_teacher` | Invalidates `conversations`, `messages`, `messages-unread` | `/(teacher)/messages/{conversationId}` |
| `new_message_parent` | Invalidates `conversations`, `messages`, `messages-unread` | `/(parent)/messages/{conversationId}` |
| `new_message` | Covered by both handlers via OR check | Role-specific messages screen |

### Query Keys Added

| Key | Screen | refetchInterval |
|---|---|---|
| `['conversations']` | Teacher + Parent conversations list | 30 s |
| `['messages', conversationId]` | Thread screen | 15 s |
| `['teacher-announcements']` | Teacher announcements list | 60 s |
| `['messages-unread']` | More menu badge (both roles) | 60 s |
| `['message-recipients']` | New conversation screen | Cached 5 min, no auto-refetch |

### Feature Flags

No new feature flags. Messaging is available to all teachers and parents by default.

### Rollback Considerations (PROMPT-14)

| Scenario | Rollback Action |
|---|---|
| Messaging screens cause crash loop | OTA rollback: `./scripts/ota-rollback.sh production` |
| Draft AsyncStorage key collision | Clear via `AsyncStorage.removeItem('message_draft_{id}')` in developer menu or app settings |
| `getUnreadCount` endpoint unavailable | Badge shows 0 (safe default); conversations still load |
| Push deep-link navigates to wrong screen | Pre-EP-15 fallback was `/(role)/notifications` — can revert deepLinks.ts entry via hotfix OTA |

---

## EP-16: Analytics & Observability (PROMPT-15)

*Implemented: June 2026*

### Environment Variables

| Variable | Purpose | Mandatory | Where to Get It |
|---|---|---|---|
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry crash reporting DSN — embedded in JS bundle | ✅ Yes | Sentry Dashboard → Project Settings → Client Keys → DSN |
| `EXPO_PUBLIC_AMPLITUDE_API_KEY` | Amplitude product analytics project API key | ✅ Yes | Amplitude → Settings → Projects → API Key |
| `SENTRY_AUTH_TOKEN` | CI-only auth token for source map uploads | ✅ Yes (CI only) | Sentry → Settings → Auth Tokens; store as GitHub secret `SENTRY_AUTH_TOKEN` |

**Note**: `EXPO_PUBLIC_*` values are embedded in the JS bundle and visible to users — never put secrets in these variables. The Sentry DSN and Amplitude API key are intentionally public-facing project identifiers, not secrets.

### Third-Party Service Setup

| Service | Required Action | Mandatory | Validation |
|---|---|---|---|
| **Sentry project** | Create project `vitana-mobile` under org `vitana-technologies` in [sentry.io](https://sentry.io) | ✅ Yes | `EXPO_PUBLIC_SENTRY_DSN` is non-null; test crash reaches Sentry within 30 s |
| **Sentry source maps** | `SENTRY_AUTH_TOKEN` GitHub Actions secret configured | ✅ Yes | Production CI "Upload source maps to Sentry" step exits 0; TypeScript filenames visible in stack traces |
| **Amplitude project** | Create project in [amplitude.com](https://amplitude.com) → copy API Key | ✅ Yes | `login_success` event appears in Amplitude Live Activity within 30 s of login |
| **Amplitude environment separation** | Use separate Amplitude projects (or API keys) for dev/staging/production | ✅ Recommended | Staging events do not pollute production Amplitude charts |

### GitHub Actions Secrets Required

| Secret Name | Value | Mandatory |
|---|---|---|
| `SENTRY_AUTH_TOKEN` | Sentry auth token with `project:releases` and `org:read` scopes | ✅ Yes |

### Privacy & PII Compliance

| Requirement | Enforcement | Validation |
|---|---|---|
| No PII in Sentry events | `beforeSend` hook deletes `Authorization` header from request breadcrumbs | Inspect a Sentry event — no `Authorization` key visible |
| User ID in Sentry is UUID only | `Sentry.setUser({ id: response.user.id })` — UUID string, never email | Check Sentry user context on any event — value matches UUID format |
| No PII in Amplitude events | `sanitize()` function strips keys containing `name`, `email`, `phone`, `aadhaar`, `pan`, `password`, `token` | Run `sanitize({ name: 'Test', role: 'Parent' })` → returns `{ role: 'Parent' }` only |
| Amounts use buckets | `getAmountBucket(amount)` returns `'<5k'` / `'5k-20k'` / `'20k-50k'` / `'>50k'` | `fee_payment_initiated` event has `amount_bucket` property, never raw rupee value |
| No IP tracking in Amplitude | `trackingOptions: { ipAddress: false }` in `initAnalytics()` | Amplitude user profiles show no IP address field |

### Feature Flags

No new feature flags. Sentry and Amplitude are always active when their respective API keys are present. If `EXPO_PUBLIC_SENTRY_DSN` is empty, Sentry silently skips init. If `EXPO_PUBLIC_AMPLITUDE_API_KEY` is empty, `initAnalytics()` returns early.

### Infrastructure Requirements

No new infrastructure. Analytics data flows to Sentry Cloud and Amplitude Cloud SaaS respectively. No self-hosted infrastructure required.

### Rollback Considerations (PROMPT-15)

| Scenario | Rollback Action |
|---|---|
| Sentry causing app crashes | Set `EXPO_PUBLIC_SENTRY_DSN` to empty string → redeploy OTA; `Sentry.init` skips when DSN is falsy |
| Amplitude causing performance issues | Set `EXPO_PUBLIC_AMPLITUDE_API_KEY` to empty string → redeploy OTA; `initAnalytics()` returns early |
| PII accidentally logged | Immediately rotate Sentry project (new DSN); file a privacy incident report; purge affected events via Sentry Data Scrubbing in project settings |
| Source maps not uploading in CI | Missing or expired `SENTRY_AUTH_TOKEN` secret; rotate and re-run workflow; app still functions — only stack traces are unreadable |
