# Deployment Guide — SMS API

**Last Updated:** May 8, 2026 | **Status:** Production Release Candidate  
**.NET Version:** 8.0 | **Database:** PostgreSQL 14+ | **Project:** SMSRepoA

---

## Pre-Deployment Checklist

### 1–2 Weeks Before

- [ ] All pending PRs merged to `main`
- [ ] Full test suite passes: `dotnet test SmsApi.Tests`
- [ ] No compiler warnings: `dotnet build`
- [ ] All hardcoded secrets moved to environment variables
- [ ] Database migration tested on staging: `dotnet ef database update`
- [ ] Staging environment smoke-tested
- [ ] Production database backed up
- [ ] Stakeholders notified of deployment window

### Deployment Day

- [ ] Enable maintenance mode
- [ ] `git pull origin main`
- [ ] `dotnet ef database update --context AppDbContext`
- [ ] `dotnet build -c Release`
- [ ] Smoke test against staging
- [ ] Deploy to production (blue-green recommended)
- [ ] Verify health endpoint: `GET /health`
- [ ] Disable maintenance mode
- [ ] Monitor logs for 15 minutes post-deploy

---

## Local Development Setup

### Prerequisites

- .NET 8 SDK
- Docker Desktop (for PostgreSQL + Redis)
- Node.js 18+ / pnpm (for frontend)

### Quick Start

```bash
# Clone and navigate
git clone <repo-url>
cd SMSRepoA

# Start infrastructure
docker-compose up -d

# Apply migrations
dotnet ef database update

# Run API (port 5092)
dotnet run

# Run frontend (port 5173)
cd ui
pnpm install
pnpm dev
```

| Service | URL |
|---------|-----|
| API | `http://localhost:5092` |
| Swagger | `http://localhost:5092/swagger` |
| Health UI | `http://localhost:5092/health-ui` |
| Frontend | `http://localhost:5173` |
| Seq Logs | `http://localhost:5341` |

---

## Docker Deployment

### Build Image

```bash
# Build from project root
docker build -f Dockerfile -t sms-api:1.0.0 .

# Tag and push to registry
docker tag sms-api:1.0.0 your-registry.azurecr.io/sms-api:1.0.0
docker push your-registry.azurecr.io/sms-api:1.0.0
```

### Dockerfile (Multistage)

**File:** `Dockerfile`

```dockerfile
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore SmsApi.csproj
RUN dotnet build SmsApi.csproj -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish SmsApi.csproj -c Release -o /app/publish

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=publish /app/publish .
EXPOSE 5092
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:5092
ENTRYPOINT ["dotnet", "SmsApi.dll"]
```

### docker-compose (Local)

```yaml
version: '3.9'
services:
  sms-api:
    build: .
    ports:
      - "5092:5092"
    environment:
      ASPNETCORE_ENVIRONMENT: Development
      ConnectionStrings__DefaultConnection: "Host=postgres;Database=sms_dev;Username=postgres;Password=postgres"
      JwtSettings__Secret: ${JWT_SECRET}
    depends_on:
      - postgres

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: sms_dev
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## Cloud Deployment

### Azure App Service

```bash
az group create --name sms-rg --location eastus

az appservice plan create \
  --name sms-plan \
  --resource-group sms-rg \
  --sku B2 \
  --is-linux

az webapp create \
  --resource-group sms-rg \
  --plan sms-plan \
  --name sms-api-prod \
  --runtime "DOTNETCORE:8.0"

az webapp config appsettings set \
  --name sms-api-prod \
  --resource-group sms-rg \
  --settings \
    ASPNETCORE_ENVIRONMENT=Production \
    "ConnectionStrings__DefaultConnection=Host=your-db.database.windows.net;Database=sms_prod;..." \
    "JwtSettings__Secret=${JWT_SECRET}" \
    "Redis__ConnectionString=${REDIS_CONNECTION_STRING}"
```

### AWS Elastic Beanstalk

```bash
eb create sms-api-prod
eb setenv \
  ASPNETCORE_ENVIRONMENT=Production \
  ConnectionStrings__DefaultConnection="..." \
  JwtSettings__Secret="$(openssl rand -base64 48)"
eb deploy
eb open
```

### Google Cloud Run

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/sms-api:1.0.0

gcloud run deploy sms-api \
  --image gcr.io/PROJECT_ID/sms-api:1.0.0 \
  --platform managed \
  --region asia-south1 \
  --set-env-vars "ASPNETCORE_ENVIRONMENT=Production" \
  --allow-unauthenticated
```

---

## Environment Variables (Production)

```bash
# Database
export ConnectionStrings__DefaultConnection="Host=db.example.com;Database=sms_prod;Username=sms_user;Password=<vault>;SSL Mode=Require"

# JWT
export JwtSettings__Secret="$(openssl rand -base64 48)"
export JwtSettings__ExpirationInMinutes="120"

# Redis
export Redis__ConnectionString="redis-prod.example.com:6379,password=<vault>"

# AWS S3 (file storage)
export Aws__AccessKey="AKIAIOSFODNN7EXAMPLE"
export Aws__SecretKey="<vault>"
export Aws__BucketName="sms-files-prod"
export Aws__Region="ap-south-1"

# Cashfree Payments
export Cashfree__MerchantId="<vault>"
export Cashfree__SecretKey="<vault>"
export Cashfree__Mode="PROD"

# Observability
export Seq__ServerUrl="https://seq.example.com"
export OpenTelemetry__OtlpEndpoint="https://otel.example.com"

# Runtime
export ASPNETCORE_ENVIRONMENT="Production"
export ASPNETCORE_URLS="http://+:5092"
```

---

## Database Migration Strategy

### Apply Migrations

```bash
# Development
dotnet ef database update

# Staging / Production (with explicit connection)
dotnet ef database update --context AppDbContext \
  --connection "Host=staging-db.example.com;Database=sms_staging;..."

# Generate migration script (review before running on prod)
dotnet ef migrations script --idempotent -o migration.sql
```

### Zero-Downtime Deployment (Blue-Green)

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼────────┐         ┌──────────▼───────┐
    │   Blue (v1.0)    │         │   Green (v1.1)   │
    │   Current live   │         │  New deployment  │
    └──────────────────┘         └──────────────────┘

Steps:
  1. Deploy v1.1 to Green (no traffic yet)
  2. Run migrations (backward-compatible)
  3. Smoke test Green
  4. Switch load balancer → Green
  5. Monitor for 15 min
  6. Decommission Blue
```

### Rollback

```bash
# Roll back to specific migration
dotnet ef database update <PreviousMigrationName>

# Or restore database from backup (fastest, safest)
pg_restore -d sms_prod backup_pre_deploy.dump
```

---

## Health Verification

After deployment:

```bash
# API health
curl https://your-domain.com/health

# Expected response
{
  "status": "Healthy",
  "checks": {
    "database": "Healthy",
    "redis": "Healthy"
  }
}

# Swagger (dev/staging only — disable in production)
open https://your-domain.com/swagger
```

---

## Monitoring & Observability

| Tool | Purpose | Endpoint |
|------|---------|----------|
| Health UI | Visual health dashboard | `/health-ui` |
| Swagger | API explorer | `/swagger` |
| Seq | Structured log viewer | Port 5341 |
| OpenTelemetry | Distributed traces | OTLP endpoint |

---

**Related:** [CODING_AGENT_GUIDELINES.md](./CODING_AGENT_GUIDELINES.md) | [DEFAULT_CREDENTIALS.md](./DEFAULT_CREDENTIALS.md)
