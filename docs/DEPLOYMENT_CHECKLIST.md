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

## 8. Mobile App Deployment (Future — Phase 4 per roadmap)

Based on the mobile architecture docs, when the mobile app is ready, these additional variables and steps will be required.

### New Environment Variables for Mobile

#### Firebase (Push Notifications)

```json
"Firebase": {
  "ProjectId": "",
  "ServiceAccountKeyPath": "",
  "ServiceAccountKeyJson": ""
}
```

| Variable | Description | How To Get |
|---|---|---|
| `Firebase__ProjectId` | Firebase project ID | Firebase Console → Project Settings → General |
| `Firebase__ServiceAccountKeyJson` | Full JSON of service account key (base64 encoded) | Firebase Console → Project Settings → Service Accounts → Generate Key |

> **Alternative (recommended):** Store the Firebase service account key file in AWS Secrets Manager as JSON. Load at startup: `builder.Configuration.AddSecretsManager()`.

#### Apple Push Notifications (APNS)

```json
"Apns": {
  "TeamId": "",
  "KeyId": "",
  "PrivateKeyPath": "",
  "BundleId": "com.vitana.sms"
}
```

| Variable | Description | How To Get |
|---|---|---|
| `Apns__TeamId` | Apple Developer Team ID | developer.apple.com → Membership |
| `Apns__KeyId` | APNs auth key ID | Certificates, IDs & Profiles → Keys |
| `Apns__PrivateKeyPath` | Path to .p8 private key file | Download when creating the key — only available once |
| `Apns__BundleId` | App bundle identifier | `com.vitana.sms` (shared app) |

#### Expo EAS (Build & OTA)

```bash
# .env.eas (for CI/CD — gitignored)
EXPO_TOKEN=            # EAS personal access token
EAS_PROJECT_ID=        # From eas.json or expo.dev
```

#### Mobile Frontend (.env.production in mobile/)

```bash
# mobile/.env.production
EXPO_PUBLIC_API_BASE_URL=https://api.vitanaschools.in
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_SENTRY_DSN=
```

### Mobile Deployment Checklist (when ready)

```
□  Firebase project created and service account key generated
□  FCM server key added to Firebase project
□  Apple Developer account enrolled ($99/year)
□  APNs auth key (.p8) created and stored securely
□  Google Play Developer account created ($25 one-time)
□  App signing keystore created and stored in AWS Secrets Manager
□  Expo EAS project configured (eas.json)
□  EAS Build profiles: development / preview / production
□  MobileDeviceTokens DB table created (migration pending)
□  NotificationDeliveryLog table created
□  UserNotificationPreferences table created
□  FirebaseAdmin NuGet package added
□  PushNotificationService implemented (per doc 09)
□  Device token registration endpoint: POST /api/mobile/device-tokens
□  Push notification preferences endpoint: PUT /api/mobile/notification-preferences
□  Integration between WhatsApp queue and push fallback:
   If WhatsApp disabled/blocked → fall back to push notification
```

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

*Document version 1.0 — June 2026 — Vitana SMS Platform*  
*Covers: WhatsApp Communication Hub + Full Platform Deployment*
