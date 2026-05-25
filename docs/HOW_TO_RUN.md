# How to Run Backend & Frontend — SMS API

> **Quick Start Guide** | Last Updated: May 25, 2026

---

## ⚡ Quick Start (5 minutes)

### Prerequisites
- **.NET SDK 8.0** or later installed
- **Node.js 18+** and npm
- **SQL Server** connection (AWS RDS configured in `appsettings.json`)

### Run Backend

```bash
cd "c:\Vitana\Vitana Group\SMSRepoA"
dotnet run --no-build -c Debug
```

**Expected output:**
```
Using launch settings from ...\Properties\launchSettings.json...
[HH:MM:SS INF] Configuring database provider: SqlServer
[HH:MM:SS INF] Using local file storage
[HH:MM:SS INF] Using in-memory distributed cache (dev only)
[HH:MM:SS WRN] Microsoft.EntityFrameworkCore...  (warnings are normal)
...
Now listening on: http://localhost:5092
```

**Verify backend is running:**
```bash
Invoke-WebRequest -Uri "http://localhost:5092/health" -UseBasicParsing
# Returns status 200
```

### Run Frontend

```bash
cd "c:\Vitana\Vitana Group\SMSRepoA\ui"
npm run dev
```

**Expected output:**
```
  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:8080/
  ➜  press h to show help
```

**Access the app:**
- Open browser to **http://localhost:8080**
- Login as staff: `suresh.nair` / `Staff@123` or admin: `admin` / `Admin1234!`
- School code: `DEMO001`

**Current login entry points:**
- School unified login: `http://localhost:8080/login` (Admin / Staff / Parent)
- Dedicated super admin login: `http://localhost:8080/super-admin-login`

---

## 🏗️ Detailed Backend Setup

### 1. Restore Dependencies

```bash
cd "c:\Vitana\Vitana Group\SMSRepoA"
dotnet restore SmsApi.csproj
```

### 2. Apply Database Migrations

```bash
dotnet ef database update --context AppDbContext
```

> This applies any pending migrations to the SQL Server database configured in `appsettings.json`.

### 3. Build the Project

```bash
dotnet build SmsApi.csproj -c Debug
# Zero errors expected; warnings are OK
```

### 4. Run the Server

#### Option A: Development (recommended)
```bash
dotnet run -c Debug
```
- Hot reload enabled (code changes restart the app)
- Detailed logging and error pages
- Default port: `5092`

#### Option B: No Build (faster if already built)
```bash
dotnet run --no-build -c Debug
```

#### Option C: Custom Port
```bash
dotnet run --urls "http://localhost:5092"
```

#### Option D: Production Mode (local testing)
```bash
dotnet run -c Release
```

### 5. Verify Backend is Running

```bash
# Via PowerShell
Invoke-WebRequest -Uri "http://localhost:5092/health" -UseBasicParsing

# Via curl
curl http://localhost:5092/health

# Expected response: HTTP 200 OK
```

### 6. Access Swagger Documentation

Navigate to: **http://localhost:5092/swagger/index.html**

> Shows all API endpoints, request/response schemas, and try-it-out capability

---

## 🎨 Detailed Frontend Setup

### 1. Install Dependencies

```bash
cd "c:\Vitana\Vitana Group\SMSRepoA\ui"
npm install
```

> This reads `package.json` and installs all dependencies into `node_modules/`.  
> First run may take 2–3 minutes.

### 2. Build TypeScript (optional, done automatically by Vite)

```bash
npm run build  # Compiles for production
```

### 3. Run Development Server

```bash
npm run dev
```

**Environment defaults:**
- **Port:** 8080 (configurable in `vite.config.ts`)
- **API:** Connects to `http://localhost:5092` (see `src/services/api/apiClient.ts`)
- **Hot reload:** Enabled on every file save

### 4. Access the App

```
http://localhost:8080
```

**Login credentials:**

| Role | Username | Password | School Code |
|------|----------|----------|------------|
| Admin | `admin` | `Admin1234!` | `DEMO001` |
| Teacher | `suresh.nair` | `Staff@123` | `DEMO001` |
| Parent | `aj@gmail.com` | `Parent@123` | `DEMO001` |

> See [DEFAULT_CREDENTIALS.md](./DEFAULT_CREDENTIALS.md) for all test accounts.

### 5. Build for Production

```bash
npm run build
# Outputs optimized files to: ui/dist/
```

---

## 🐳 Docker (Optional)

### Run Both Services with Docker Compose

```bash
cd "c:\Vitana\Vitana Group\SMSRepoA"
docker-compose up --build
```

**Services launched:**
- Backend API: **http://localhost:5092**
- Frontend UI: **http://localhost:8080**
- Dockerfile: Builds .NET image
- docker-compose.yml: Orchestrates both

**To stop:**
```bash
docker-compose down
```

---

## 🛑 Stopping the Servers

### Stop Backend (PowerShell)

```bash
Stop-Process -Name dotnet -Force
```

### Stop Frontend

Press `Ctrl+C` in the terminal running `npm run dev`

---

## 🔍 Troubleshooting

### ❌ Backend won't start (port 5092 in use)

```bash
# Find process on port 5092
netstat -ano | Select-String ":5092"

# Kill by PID
Stop-Process -Id <PID> -Force

# Or use a different port
dotnet run --urls "http://localhost:5093"
```

### ❌ Frontend can't reach backend (API errors)

**Check:**
1. Backend is running: `Invoke-WebRequest http://localhost:5092/health`
2. API client config: `ui/src/services/api/apiClient.ts` uses correct backend URL
3. CORS enabled: Check `Program.cs` for CORS policy

**Quick test:**
```bash
curl http://localhost:5092/api/notifications/my \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### ❌ Database connection fails

**Check `appsettings.json`:**
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=sms-db.cdgksmeuaw13.ap-south-1.rds.amazonaws.com;Database=SMS_Sch3;User Id=sms_app_admin;Password=VitanaSMSApp1;TrustServerCertificate=true;"
}
```

**Verify connection:**
```bash
sqlcmd -S "sms-db.cdgksmeuaw13.ap-south-1.rds.amazonaws.com" -d "SMS_Sch3" -U "sms_app_admin" -P "VitanaSMSApp1" -Q "SELECT @@VERSION"
```

### ❌ Build fails with missing dependencies

```bash
dotnet restore SmsApi.csproj
dotnet clean SmsApi.csproj
dotnet build SmsApi.csproj -c Debug
```

### ❌ Frontend stuck on login screen

- **Clear browser cache:** `Ctrl+Shift+Delete`
- **Check console:** Press `F12` → Console tab for errors
- **Verify JWT token:** Check `localStorage['auth_token']` in DevTools
- **Restart both services:** Stop and restart backend and frontend

---

## 📋 Full Startup Sequence (Fresh Machine)

```bash
# 1. Clone/navigate to project
cd "c:\Vitana\Vitana Group\SMSRepoA"

# 2. Backend setup
dotnet restore SmsApi.csproj
dotnet build SmsApi.csproj -c Debug
dotnet run -c Debug &  # Run in background or new terminal

# 3. Wait for backend (5 seconds)
Start-Sleep -Seconds 5

# 4. Frontend setup (new terminal)
cd ui
npm install
npm run dev

# 5. Open browser
# http://localhost:8080
```

---

## 🚀 Development Workflow

### Make Changes to Backend Code

1. Edit C# files in `Controllers/`, `Services/`, or `Models/`
2. Save file → **dotnet hot reload** automatically restarts the app (1–2 sec)
3. Frontend API calls still work (no page refresh needed if token valid)

### Make Changes to Frontend Code

1. Edit React/TypeScript files in `ui/src/`
2. Save file → **Vite hot reload** instantly updates in browser (< 1 sec)
3. All unsaved form data is preserved (Vite's HMR feature)

### When Backend Dependencies Change

```bash
# After adding/removing NuGet packages
dotnet restore SmsApi.csproj
dotnet build SmsApi.csproj
# Re-run: dotnet run -c Debug
```

### When Frontend Dependencies Change

```bash
# After adding/removing npm packages
cd ui
npm install
# Re-run: npm run dev
```

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────┐
│  React 19 Frontend (port 8080)      │
│  http://localhost:8080/             │
│  - src/, components, pages          │
│  - Communicates via JWT auth        │
└──────────────┬──────────────────────┘
               │ REST API + JWT
┌──────────────▼──────────────────────┐
│  .NET 8 Backend (port 5092)         │
│  http://localhost:5092/             │
│  - Controllers, Services, Models    │
│  - JWT validation, role-based auth  │
└──────────────┬──────────────────────┘
               │ EF Core ORM
┌──────────────▼──────────────────────┐
│  SQL Server (AWS RDS)               │
│  sms-db.cdgksmeuaw13.ap-south-1     │
│  Database: SMS_Sch3                 │
└─────────────────────────────────────┘
```

---

## 📚 Additional Resources

- **Backend docs:** [TECHNICAL_DOCUMENT.md](./TECHNICAL_DOCUMENT.md)
- **Frontend guide:** [CODING_AGENT_GUIDELINES.md](./CODING_AGENT_GUIDELINES.md)
- **Deployment:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Testing:** [TESTING_INFRASTRUCTURE.md](./TESTING_INFRASTRUCTURE.md)
- **Default credentials:** [DEFAULT_CREDENTIALS.md](./DEFAULT_CREDENTIALS.md)

---

**Last Updated:** May 14, 2026 | **Project:** SMSRepoA (Release Candidate)
