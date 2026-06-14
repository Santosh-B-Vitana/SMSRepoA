# Vitana SMS — Developer Onboarding Guide

Complete setup guide for a new developer getting the full stack running on a new machine.

---

## Architecture Overview

```
SMSRepoA/                        ← Monorepo root
├── SmsApi.csproj                 ← Backend: .NET 8 REST API
├── ui/                           ← Web CRM: React 19 + Vite + Tailwind
├── mobile/                       ← iOS/Android app: React Native (Expo SDK 56)
├── packages/
│   ├── shared-types/             ← TypeScript types shared across packages
│   └── shared-utils/             ← Shared utility functions
└── pnpm-workspace.yaml           ← pnpm monorepo config
```

**Tech Stack Summary:**

| Layer | Technology | Version |
|---|---|---|
| Backend API | .NET / C# (ASP.NET Core) | 8.0 |
| Database | SQL Server (AWS RDS) | — |
| Cache | Redis | — |
| Web CRM | React + Vite + TypeScript | React 19, Vite 6.4 |
| Mobile | React Native + Expo | SDK 56, RN 0.85.3 |
| Package manager | pnpm | 11.x |
| Node.js | — | 22.x |
| EAS (mobile builds) | Expo Application Services | — |

---

## Prerequisites

Install these before anything else.

### 1. Node.js 22+
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 22
nvm use 22
node --version   # should print v22.x.x
```

### 2. pnpm 11+
```bash
npm install -g pnpm@latest
pnpm --version   # should print 11.x.x
```

### 3. .NET 8 SDK
Download from: https://dotnet.microsoft.com/download/dotnet/8.0

```bash
dotnet --version   # should print 8.0.x
```

### 4. Git
```bash
git --version   # should print 2.x.x
```

### 5. EAS CLI (for mobile builds only)
```bash
npm install -g eas-cli
eas --version
```

---

## Step 1: Clone the Repository

```bash
git clone <your-git-remote-url> SMSRepoA
cd SMSRepoA
```

> Ask a team member for the repository URL and access permissions.

---

## Step 2: Install All Dependencies

Run this **once from the monorepo root** — it installs dependencies for all packages (backend node deps, mobile app, web CRM, shared packages):

```bash
pnpm install
```

This will:
- Install all npm packages for `mobile/`, `ui/`, `packages/shared-types/`, `packages/shared-utils/`
- Run the `postinstall` script that patches `expo-modules-jsi` for Swift 6 compatibility (needed for iOS builds)

---

## Step 3: Backend (.NET API)

### 3.1 Configure the environment

The backend connects to an **AWS RDS SQL Server** database. Copy the example secrets:

```bash
cp appsettings.Development.json appsettings.Local.json
```

Edit `appsettings.Local.json` and fill in:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=sms-db.cdgksmeuaw13.ap-south-1.rds.amazonaws.com;Database=SMS_Sch3;User Id=sms_dev;Password=<ask team>;TrustServerCertificate=true",
    "CRMConnection": "Server=sms-db.cdgksmeuaw13.ap-south-1.rds.amazonaws.com;Database=SMS_CRM;User Id=sms_crm_user;Password=<ask team>;TrustServerCertificate=true"
  },
  "DefaultAdmin": {
    "Username": "admin",
    "Password": "admin-dev-change-me"
  }
}
```

> **Never commit `appsettings.Local.json`** — it is gitignored.
> Ask a team lead for the DB credentials.

### 3.2 Run database migrations

```bash
dotnet ef database update
```

This applies all migrations to the connected database. On first run it also auto-seeds:
- Default school
- Admin user (`admin` / `admin-dev-change-me`)
- Demo teachers, students, parents
- Classes, subjects, sections, fee records

### 3.3 Start the backend

```bash
dotnet run
```

The API starts at `http://localhost:5092`

Verify it works:
```bash
curl http://localhost:5092/api/health
# → { "status": "healthy" }
```

> **Note:** For mobile app access from iPhone on the same WiFi, use your Mac's LAN IP (e.g. `http://192.168.x.x:5092`) instead of localhost.

---

## Step 4: Web CRM (React)

```bash
cd ui
pnpm dev
```

Opens at `http://localhost:5173`

The CRM connects to the backend API. It reads the API base URL from:
- `ui/.env` (create if it doesn't exist)

```bash
# ui/.env
VITE_API_BASE_URL=http://localhost:5092
```

> Login credentials: `admin` / `admin-dev-change-me`

---

## Step 5: Mobile App

### 5.1 Configure environment

```bash
cd mobile
cp .env.example .env
```

Edit `mobile/.env`:

```bash
# Replace with your Mac's LAN IP address
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:5092/api
EXPO_PUBLIC_ENV=development
EAS_PROJECT_ID=757d1dba-18d3-42c3-abb5-c9261487fce9
```

Find your Mac's IP:
```bash
ipconfig getifaddr en0
```

### 5.2 Install the dev client on your iPhone

The mobile app requires a **custom development build** (not Expo Go) because it uses native modules (LiveKit, Skia, etc.).

The latest development build is available at:
```
https://expo.dev/accounts/laynaik/projects/vitana-sms
```

On your **iPhone in Safari**, open the link above → tap the latest Development build → **Install**.

Enable Developer Mode on iPhone: **Settings → Privacy & Security → Developer Mode → ON** (requires restart).

### 5.3 Start Metro bundler

```bash
cd mobile
npx expo start --dev-client
```

Open the Vitana SMS app on iPhone → it auto-connects (or enter the URL manually).

### 5.4 Log in

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin-dev-change-me` |
| Teacher | `amit.kapoor` | `Teacher@123` |
| Parent | `aj@gmail.com` | `Veda#834Nh7J` |
| SuperAdmin | `superadmin` | `SuperAdmin@123` |

When prompted for "School Domain" on first open, enter: `vitanasms.com`

---

## Step 6: Running Everything Together

Open **3 terminals**:

```bash
# Terminal 1 — Backend
cd SMSRepoA
dotnet run

# Terminal 2 — Web CRM
cd SMSRepoA/ui
pnpm dev

# Terminal 3 — Mobile Metro
cd SMSRepoA/mobile
npx expo start --dev-client
```

---

## When You Need a New Mobile Build

Most code changes (JavaScript/TypeScript) hot-reload via Metro — **no new build needed**.

You need a new EAS build when:
- Adding a new **native npm package**
- Changing `app.config.js` plugins
- Changing `newArchEnabled`
- Releasing to production

```bash
cd mobile

# Development build (install on provisioned devices via QR)
eas build --profile development --platform ios

# Production build
eas build --profile production --platform ios --platform android
```

After a build completes, install it from:
```
https://expo.dev/accounts/laynaik/projects/vitana-sms
```

---

## Project Structure Reference

```
SMSRepoA/
│
├── ── BACKEND (.NET 8) ────────────────────────────────
│   ├── Controllers/            REST API controllers (Auth, Students, Staff, etc.)
│   ├── Services/               Business logic
│   ├── Models/                 Entity models + DTOs
│   ├── Data/                   AppDbContext (Entity Framework)
│   ├── Migrations/             EF database migrations
│   ├── Middleware/             Auth, tenant, rate limiting
│   ├── Program.cs              App startup, DI, seeding
│   ├── appsettings.json        Base config (commit safe — no secrets)
│   ├── appsettings.Development.json   Dev config (no secrets)
│   └── appsettings.Local.json  ← LOCAL ONLY, gitignored (put secrets here)
│
├── ── WEB CRM (React + Vite) ──────────────────────────
│   └── ui/
│       ├── src/
│       │   ├── pages/          Page components
│       │   ├── components/     Shared UI components
│       │   └── services/api/   API client functions
│       ├── package.json        React 19, Vite 6.4, TypeScript 5.8
│       └── .env                API base URL (gitignored)
│
├── ── MOBILE (Expo SDK 56) ────────────────────────────
│   └── mobile/
│       ├── app/                Expo Router screens
│       │   ├── (auth)/         Login, school domain
│       │   ├── (admin)/        Admin portal
│       │   ├── (teacher)/      Teacher portal
│       │   ├── (parent)/       Parent portal
│       │   └── (student)/      Student portal
│       ├── src/
│       │   ├── api/            API clients and endpoints
│       │   ├── stores/         Zustand state (auth, school)
│       │   ├── components/     Shared components
│       │   ├── notifications/  Push notification handlers
│       │   ├── offline/        SQLite offline queue (Drizzle ORM)
│       │   └── shared-types/   Inlined type definitions
│       ├── app.config.js       Expo config (plugins, permissions)
│       ├── eas.json            EAS Build profiles
│       ├── .env                LOCAL env vars (gitignored)
│       └── .env.example        Template — copy to .env
│
├── ── SHARED PACKAGES ─────────────────────────────────
│   └── packages/
│       ├── shared-types/       TypeScript interfaces used by backend+mobile
│       └── shared-utils/       formatINR, formatRelativeTime, validators, etc.
│
└── ── ROOT ────────────────────────────────────────────
    ├── scripts/
    │   └── fix-expo-modules-jsi.js   Swift 6 patch (auto-runs on pnpm install)
    ├── pnpm-workspace.yaml    Monorepo package config
    └── package.json           Root scripts
```

---

## Key Configuration Files

### Backend secrets (never commit these)
```
appsettings.Local.json     ← DB connection strings, JWT secret
secrets.json               ← .NET user secrets (alternative)
```

### Mobile env vars (never commit)
```
mobile/.env                ← API URL, EAS project ID
mobile/GoogleService-Info.plist   ← Firebase iOS config (optional in dev)
mobile/google-services.json       ← Firebase Android config (optional in dev)
```

### Safe to commit
```
appsettings.json                  ← Non-secret base config
appsettings.Development.json      ← Dev config without credentials
mobile/.env.example               ← Template for .env
mobile/app.config.js              ← Expo app config
mobile/eas.json                   ← EAS build profiles
```

---

## Common Issues & Fixes

### `pnpm install` fails with lockfile mismatch
```bash
rm pnpm-lock.yaml && pnpm install
```

### Backend won't connect to DB
- Check DB credentials in `appsettings.Local.json`
- Ensure your IP is whitelisted in AWS RDS security group
- Test: `telnet sms-db.cdgksmeuaw13.ap-south-1.rds.amazonaws.com 1433`

### Mobile app shows "No internet connection"
- Check your Mac's IP hasn't changed: `ipconfig getifaddr en0`
- Update `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env`
- iPhone and Mac must be on the same WiFi

### Metro bundler crashes with Babel parse error
```bash
cd mobile && npx expo start --dev-client --clear
```

### iOS build fails with Swift 6 errors
The `postinstall` script fixes this automatically. To manually re-apply:
```bash
cd SMSRepoA && pnpm install
```

### `eas build` fails with lockfile mismatch
```bash
# Regenerate lockfile
rm pnpm-lock.yaml && pnpm install
git add pnpm-lock.yaml && git commit -m "chore: regenerate lockfile"
```

### New developer needs access to EAS
```bash
eas login    # use Expo account credentials from team
```

---

## Environment Variables Reference

### Backend (`appsettings.Local.json`)

| Key | Description | Required |
|---|---|---|
| `ConnectionStrings.DefaultConnection` | Main DB (SQL Server) | ✅ |
| `ConnectionStrings.CRMConnection` | CRM DB | ✅ |
| `ConnectionStrings.Redis` | Redis cache | Optional |
| `JwtSettings.Secret` | JWT signing key | ✅ |
| `DefaultAdmin.Password` | Admin login password | ✅ |
| `Aws.AccessKey` / `SecretKey` | S3 file storage | Optional |
| `Firebase.ServiceAccountJson` | Push notifications | Optional |
| `LiveKit.ApiKey` / `ApiSecret` | Online classes | Optional |

### Mobile (`mobile/.env`)

| Variable | Description | Required |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Backend API URL | ✅ |
| `EXPO_PUBLIC_ENV` | `development` / `staging` / `production` | ✅ |
| `EAS_PROJECT_ID` | `757d1dba-18d3-42c3-abb5-c9261487fce9` | ✅ |
| `GOOGLE_SERVICES_PLIST` | Path to Firebase iOS plist | Optional |
| `GOOGLE_SERVICES_JSON` | Path to Firebase Android JSON | Optional |

---

## Useful Commands

```bash
# ── Backend ─────────────────────────────────────────────────
dotnet run                          # Start API
dotnet ef migrations add <Name>     # Create a new migration
dotnet ef database update           # Apply migrations
dotnet build                        # Build only

# ── Web CRM ─────────────────────────────────────────────────
cd ui && pnpm dev                   # Start dev server (localhost:5173)
cd ui && pnpm build                 # Production build
cd ui && pnpm lint                  # Lint

# ── Mobile ──────────────────────────────────────────────────
cd mobile && npx expo start --dev-client            # Start Metro
cd mobile && npx expo start --dev-client --clear    # Start with cache clear
cd mobile && eas build --profile development --platform ios    # iOS dev build
cd mobile && eas build --profile development --platform android # Android dev build
cd mobile && eas update --channel development --message "..."  # OTA update
cd mobile && npx expo install --fix                 # Fix package versions

# ── Monorepo ─────────────────────────────────────────────────
pnpm install                        # Install all packages
pnpm -F mobile <script>             # Run script in mobile package
pnpm -F vite_react_shadcn_ts <script>  # Run script in UI package
```

---

## Git Workflow

```bash
# Create a feature branch
git checkout -b feature/my-feature

# After changes
git add .
git commit -m "feat: description of change"
git push origin feature/my-feature

# Open a PR to main
```

**Commit message convention:**
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance (deps, config)
- `docs:` — documentation
- `refactor:` — code cleanup

---

*Last updated: June 2026*
*Maintained by: Vitana Development Team*
