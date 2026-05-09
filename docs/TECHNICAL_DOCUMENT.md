# sms-api — Technical Document

> **Version 2.1** · ASP.NET Core 8 · .NET 8 · React 19 · PostgreSQL · **Release Candidate**  
> **Last Updated:** May 8, 2026 | **Project:** SMSRepoA

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React 19 SPA (ui/)                       │
│  React Router v6 · TanStack Query v5 · react-hook-form · Zod   │
│  shadcn/ui · Tailwind CSS · Recharts · Framer Motion · jsPDF   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / REST + JWT
┌────────────────────────▼────────────────────────────────────────┐
│              ASP.NET Core 8 Web API (sms-api.csproj)            │
│  42+ Controllers · JWT Auth · Redis · Rate Limiting · OTLP      │
└────────────────────────┬────────────────────────────────────────┘
                         │ EF Core 8
┌────────────────────────▼────────────────────────────────────────┐
│                  PostgreSQL (via Npgsql)                         │
│  Soft delete · Audit trails · India-specific columns            │
└─────────────────────────────────────────────────────────────────┘
        │                       │                      │
   Redis Cache           S3/MinIO Storage        Cashfree PG
  (Brute-force,         (Documents, Photos,       (Fee payments,
  Login attempts)        ID cards, Reports)        Refunds)
```

---

## 2. Backend Stack

| Layer | Technology |
|---|---|
| Runtime | .NET 8 / ASP.NET Core 8 |
| ORM | Entity Framework Core 8 + Npgsql |
| Auth | JWT Bearer + Redis-backed brute-force protection |
| Cache | `ICacheService` → Redis (`StackExchange.Redis`) with fallback |
| File storage | `IFileStorageService` → AWS S3 / MinIO / local disk |
| Payments | Cashfree Payments v2 (create orders, webhooks, refunds) |
| Observability | OpenTelemetry (OTLP exporter) + Serilog + Seq sink |
| Health | `Microsoft.Extensions.Diagnostics.HealthChecks.UI` |
| API docs | Swagger / OpenAPI (Swashbuckle) |
| Testing | xUnit + 724 passing unit tests |
| Containerisation | Docker + docker-compose.yml |

---

## 3. Frontend Stack

| Layer | Technology |
|---|---|
| Framework | React 19.2.5 |
| Routing | React Router v6 (lazy-loaded routes) |
| Data fetching | TanStack Query v5.83 |
| Form handling | react-hook-form + @hookform/resolvers/zod + Zod |
| UI primitives | shadcn/ui (Radix UI) + Tailwind CSS |
| Charts | Recharts |
| Animation | Framer Motion |
| PDF export | jsPDF |
| Toast | sonner |
| Testing | Vitest + React Testing Library |

---

## 4. Project Structure

```
sms-api/
├── Controllers/         # 42+ ASP.NET Core controllers
├── Models/              # Domain entities (EF Core)
├── Services/            # Business logic services
├── Data/                # DbContext + repositories
├── Migrations/          # EF Core migrations
├── Middleware/          # Auth, error, CORS middleware
├── Validators/          # FluentValidation validators
├── Infrastructure/      # Redis, S3, Cashfree services
├── Application/         # CQRS handlers / features
├── Utils/               # Helpers (masking, date utils, etc.)
├── SmsApi.Tests/        # 724 unit tests (xUnit)
├── Program.cs           # App bootstrap (DI, middleware)
├── appsettings.json     # Base configuration
├── appsettings.Development.json
├── appsettings.Production.json
├── Dockerfile
├── docker-compose.yml
└── ui/                  # React 19 SPA
    └── src/
        ├── pages/       # 60+ lazy-loaded pages
        ├── components/  # Feature + UI components
        ├── services/    # API clients (TanStack Query)
        ├── schemas/     # Zod validation schemas
        ├── contexts/    # React context providers
        ├── hooks/       # Custom hooks
        └── lib/         # Utilities (cn, formatters)
```

---

## 5. Backend Modules

### 5.1 Authentication & Security
- JWT Bearer tokens (configurable expiry)
- Redis-backed login attempt tracking (5 attempts → 15 min lockout)
- Rate limiting via ASP.NET Core middleware
- RBAC: `super_admin`, `admin`, `staff`, `student`, `parent`
- Aadhaar masking (first 8 digits replaced with `****`)
- PAN masking (middle 5 chars masked)

### 5.2 Academic Management
| Feature | Endpoints |
|---|---|
| Classes & Sections | `/api/academics/classes`, `/sections` |
| Subjects & Curriculum | `/api/academics/subjects` |
| Timetable | `/api/academics/timetable` |
| Assignments | `/api/assignments` |
| Examinations | `/api/examinations` |
| Grades & CCE | `/api/grades`, `/api/cce` |
| Attendance | `/api/attendance`, `/api/staffattendance` |

### 5.3 Student & Staff Management
- Student lifecycle: admission → enrollment → profile → TC
- Staff employment: contract, permanent, guest, probation
- PF, ESI, UAN compliance fields
- Emergency contacts + medical information
- Bank account details (encrypted at rest)

### 5.4 Finance Management
- Double-entry accounts (ASSET, LIABILITY, EQUITY, INCOME, EXPENSE)
- Income sources: Fee, Store, Donation, Other
- Expense categories with budget allocation
- Petty cash workflow (request → approve/reject)
- Store sales tracking
- Monthly trend reports + budget utilization analytics

### 5.5 Fee Management
- Fee structures per class/academic year
- Cashfree integration (create payment link → webhook → status update)
- RTE fee concessions (income-based eligibility)
- Partial payments + installments
- PDF receipt generation (jsPDF on frontend)

### 5.6 India-Specific Features
| Feature | Detail |
|---|---|
| Aadhaar validation | 12-digit numeric, masked in display |
| PAN validation | Standard regex `[A-Z]{5}[0-9]{4}[A-Z]{1}` |
| IFSC validation | 11-char, first 4 alpha + 5th `0` |
| RTE Concessions | Annual income threshold check |
| Indian states | Full dropdown in admission & address forms |
| Category fields | General / OBC / SC / ST / EWS |
| PF/ESI/UAN | Payroll compliance fields |
| Cash on hand | INR currency formatting throughout |

---

## 6. Frontend Architecture

### 6.1 Route Structure
```
/ (Login)
/dashboard          → role-based dashboard redirect
/admissions         → 5-step admission wizard
/students           → student management
/staff              → staff management
/academics          → classes, subjects, timetable
/attendance         → attendance management
/examinations       → exams, results
/grades             → gradebook
/fees               → fee management
/finance            → finance dashboard (income, expenses, budget)
/library            → library management
/transport          → transport management
/hostel             → hostel management
/communication      → messaging & announcements
/security           → security dashboard (login attempts, Redis)
/reports/*          → exam, marks, class analysis reports
/analytics          → school analytics charts
/superadmin/*       → school management, user management
```

### 6.2 Form Architecture (Production Grade)
All major forms use the following pattern:
```tsx
useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onChange",
  defaultValues: { ... },
})
```

Multi-step wizards with per-step validation:
```tsx
const handleNext = async () => {
  const stepKeys = Object.keys(STEP_SCHEMAS[step].shape) as (keyof FormData)[];
  const valid = await form.trigger(stepKeys);
  if (valid) setStep(s => s + 1);
};
```

### 6.3 API Integration Pattern
```typescript
// Services use apiClient (axios instance with JWT interceptor)
export const financeApi = {
  getStats: () => apiClient.get<FinanceStatsDto>('/finance/stats').then(r => r.data),
  // ...
};

// Components use TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ['finance-stats'],
  queryFn: financeApi.getStats,
});

const mutation = useMutation({
  mutationFn: financeApi.addIncome,
  onSuccess: () => { toast.success('Income recorded'); queryClient.invalidateQueries(...); },
});
```

---

## 7. Database Schema (Key Tables)

```sql
-- Core entities
Students (Id, FirstName, LastName, DateOfBirth, AadharNumber[masked], Gender,
          Category, ClassId, SectionId, ParentId, AcademicYearId, ...)
Staff    (Id, FirstName, LastName, Designation, Department, AadharNumber[masked],
          PanNumber[masked], BankAccountNumber[encrypted], PfNumber, EsiNumber, ...)
Classes  (Id, Name, SectionCount, AcademicYearId)
Sections (Id, ClassId, Name, MaxStrength)

-- Finance
FinanceAccounts    (Id, Name, Type[ASSET/LIABILITY/...], Balance)
FinanceTransactions(Id, AccountId, CategoryId, Amount, Type[DEBIT/CREDIT], Date, ...)
FinanceCategories  (Id, Name, Type[INCOME/EXPENSE], Budget)
PettyCashEntries   (Id, Amount, Purpose, Status[PENDING/APPROVED/REJECTED], ...)
StoreSales         (Id, Amount, ItemsCount, PaymentMethod, InvoiceNumber, ...)

-- Fees
FeeStructures    (Id, ClassId, AcademicYearId, Amount, DueDate)
FeePayments      (Id, StudentId, Amount, Status, CashfreeOrderId, ...)
FeeConcessions   (Id, StudentId, Type[RTE/MERIT/...], DiscountAmount)

-- Academic
Examinations  (Id, Name, ClassId, SubjectId, MaxMarks, PassMarks, ...)
ExamResults   (Id, ExaminationId, StudentId, MarksObtained, Grade)
Attendance    (Id, StudentId, Date, Status[Present/Absent/Late])
```

---

## 8. Observability & Infrastructure

### 8.1 Logging
```
Serilog → Console → File (logs/*.log) → Seq (OTLP)
  structured JSON logs
  enriched with: TraceId, UserId, SchoolId, Method, StatusCode
```

### 8.2 Health Checks
- `/health` — liveness probe
- `/health/ready` — readiness (DB + Redis)
- `/health-ui` — dashboard UI

### 8.3 Docker
```yaml
# docker-compose.yml
services:
  sms-api:   ASP.NET Core 8 API (port 5092)
  postgres:  PostgreSQL 16 (port 5432)
  redis:     Redis 7 (port 6379)
  seq:       Seq log aggregator (port 5341)
```

---

## 9. Testing

| Layer | Location | Count | Status |
|-------|----------|-------|--------|
| Unit Tests | `SmsApi.Tests/` | 724 | ✅ All passing |
| Integration Tests | `SmsApi.IntegrationTests/` | 8/26 | 🟡 JWT factory limitation |
| Frontend | `ui/src/tests/` | 10 | ✅ Passing |

**Run all tests:**
```bash
dotnet test SmsApi.Tests
dotnet test SmsApi.IntegrationTests
```

For detailed test architecture, known issues, and templates see [TESTING_INFRASTRUCTURE.md](./TESTING_INFRASTRUCTURE.md).

---

## 10. Documentation Index

| Document | Purpose |
|----------|---------|
| [TECHNICAL_DOCUMENT.md](./TECHNICAL_DOCUMENT.md) | Architecture, stack, database schema |
| [FUNCTIONAL_DOCUMENT.md](./FUNCTIONAL_DOCUMENT.md) | Feature reference for all modules |
| [API_DOCS.md](./API_DOCS.md) | REST API reference with examples |
| [CODING_AGENT_GUIDELINES.md](./CODING_AGENT_GUIDELINES.md) | Patterns for developers and AI agents |
| [DEFAULT_CREDENTIALS.md](./DEFAULT_CREDENTIALS.md) | Development credentials and JWT config |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Docker, cloud, migration, env vars |
| [TESTING_INFRASTRUCTURE.md](./TESTING_INFRASTRUCTURE.md) | Test setup, patterns, known issues |
| [MODULE_STATUS.md](./MODULE_STATUS.md) | Production readiness per module |

---

## 10. Configuration Reference

```json
// appsettings.json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=smsdb;Username=postgres;Password=..."
  },
  "JwtSettings": {
    "Secret": "...",
    "Issuer": "SmsApi",
    "Audience": "SmsApiClient",
    "ExpirationInMinutes": 60
  },
  "Redis": {
    "ConnectionString": "localhost:6379"
  },
  "Storage": {
    "Provider": "S3",  // or "Local"
    "S3": {
      "BucketName": "sms-uploads",
      "Region": "ap-south-1",
      "AccessKey": "...",
      "SecretKey": "..."
    }
  },
  "Cashfree": {
    "AppId": "...",
    "SecretKey": "...",
    "BaseUrl": "https://api.cashfree.com/pg"
  },
  "Serilog": {
    "WriteTo": [
      { "Name": "Console" },
      { "Name": "File", "Args": { "path": "logs/log-.txt", "rollingInterval": "Day" } },
      { "Name": "Seq", "Args": { "serverUrl": "http://localhost:5341" } }
    ]
  }
}
```

---

## 11. Running Locally

```bash
# 1. Start infrastructure
docker-compose up -d postgres redis seq

# 2. Run migrations
cd sms-api
dotnet ef database update

# 3. Start API
dotnet run

# 4. Start frontend (in separate terminal)
cd ui
pnpm install
pnpm dev
```

Default URL: API → `http://localhost:5092`, UI → `http://localhost:5173`

---

## 12. Deployment

```bash
# Build production Docker image
docker build -t sms-api:latest .

# Run all services
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f sms-api
```
