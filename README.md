# sms-api — School Management System

> Production-grade ERP for Indian K-12 schools · ASP.NET Core 8 · React 19 · PostgreSQL  
> **Release Candidate** — May 2026

[![Tests](https://img.shields.io/badge/tests-724%20passing-brightgreen)](SmsApi.Tests/)
[![.NET](https://img.shields.io/badge/.NET-8.0-blue)](https://dotnet.microsoft.com)
[![React](https://img.shields.io/badge/React-19.2.5-61dafb)](ui/)
[![Status](https://img.shields.io/badge/status-release%20candidate-orange)](docs/MODULE_STATUS.md)

---

## Features

### Backend
- **42+ REST Controllers** covering all school management domains
- **JWT Authentication** with Redis-backed brute-force protection (5 attempts → 15 min lockout)
- **Role-Based Access Control**: super_admin, admin, staff, student, parent
- **PostgreSQL** via Entity Framework Core 8 (soft delete, audit trails)
- **Redis Cache** via `ICacheService` abstraction (brute-force, session caching)
- **S3/MinIO File Storage** via `IFileStorageService` abstraction
- **Cashfree Payment Gateway** (create orders, webhooks, refunds)
- **OpenTelemetry** (OTLP exporter) + Serilog + Seq structured logging
- **Health Checks UI** (`/health-ui`)
- **Docker + docker-compose** for one-command local setup
- **724 passing unit tests** (xUnit)

### Frontend (React 19 SPA)
- **60+ lazy-loaded routes** with React Router v6
- **Production-grade forms**: react-hook-form + Zod + shadcn/ui FormField
- **Multi-step wizards**: 5-step admission, 6-step staff registration
- **Finance Dashboard**: income, expenses, petty cash, budget utilization + Recharts
- **TanStack Query v5** for all data fetching / mutations
- **Vitest + RTL** unit tests

### India-Specific
- Aadhaar number validation & masking
- PAN number validation & masking
- IFSC code validation
- RTE fee concession workflow
- Category fields (General/OBC/SC/ST/EWS)
- PF, ESI, UAN compliance fields
- Cashfree (Indian payment methods: UPI, NetBanking, Card, Wallet)

---

## Quick Start

```bash
# Start infrastructure
docker-compose up -d

# Apply migrations
dotnet ef database update

# Run API
dotnet run

# Run frontend
cd ui
pnpm install
pnpm dev
```

API: `http://localhost:5092`  
Frontend: `http://localhost:5173`  
Swagger: `http://localhost:5092/swagger`  
Health UI: `http://localhost:5092/health-ui`  
Seq Logs: `http://localhost:5341`

---

## Documentation

| Document | Description |
|---|---|
| [docs/TECHNICAL_DOCUMENT.md](docs/TECHNICAL_DOCUMENT.md) | Architecture, stack, database schema, configuration |
| [docs/FUNCTIONAL_DOCUMENT.md](docs/FUNCTIONAL_DOCUMENT.md) | Complete feature reference for all modules |
| [docs/API_DOCS.md](docs/API_DOCS.md) | REST API reference with request/response examples |
| [docs/CODING_AGENT_GUIDELINES.md](docs/CODING_AGENT_GUIDELINES.md) | Patterns for developers and AI coding agents |
| [docs/DEFAULT_CREDENTIALS.md](docs/DEFAULT_CREDENTIALS.md) | Dev credentials, JWT config, test factory setup |
| [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Docker, cloud deployment, env vars, migrations |
| [docs/TESTING_INFRASTRUCTURE.md](docs/TESTING_INFRASTRUCTURE.md) | Test setup, unit/integration patterns, known issues |
| [docs/MODULE_STATUS.md](docs/MODULE_STATUS.md) | Production readiness status per module |

---

## Testing

```bash
# Backend
dotnet test

# Frontend
cd ui
pnpm test
```

---

## Default Credentials

| Role | Username | Password |
|---|---|---|
| Super Admin | superadmin | Admin@123 |
| Admin | admin | Admin@123 |
| Staff | staff1 | Staff@123 |
| Parent | parent1 | Parent@123 |
| Student | student1 | Student@123 |


#### GET /api/sms
Get all SMS messages.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
[
  {
    "id": 1,
    "recipient": "+1234567890",
    "message": "Hello World",
    "sentAt": "2025-11-09T03:09:35.503Z"
  }
]
```

#### POST /api/sms
Send a new SMS message.

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Request:**
```json
{
  "recipient": "+1234567890",
  "message": "Hello World"
}
```

**Response:**
```json
{
  "id": 1234,
  "recipient": "+1234567890",
  "message": "Hello World",
  "status": "Sent",
  "sentAt": "2025-11-09T04:09:35.503Z"
}
```

## Authentication Flow

1. Call `/api/auth/login` with valid credentials to receive a JWT token
2. Include the token in the `Authorization` header for subsequent requests: `Bearer <token>`
3. The token expires after the configured time (default: 60 minutes)

## CORS Configuration

CORS is configured to allow requests from:
- `http://localhost:3000` (React development server)
- `http://localhost:4200` (Angular development server)

To add more allowed origins, update the `Cors:AllowedOrigins` array in `appsettings.json`.

## Security Notes

- Default demo credentials: `admin@vitanaschools.edu` / `admin-dev-change-me`
- These credentials are for demonstration/testing only
- In production, implement proper user authentication with hashed passwords and a database
- Keep your JWT secret key secure and never commit it to source control
- Use HTTPS in production environments

## Project Structure

```
sms-api/
├── Controllers/
│   ├── AuthController.cs    # Authentication endpoints
│   └── SmsController.cs      # SMS endpoints (protected)
├── Models/
│   ├── JwtSettings.cs        # JWT configuration model
│   ├── LoginRequest.cs       # Login request model
│   └── LoginResponse.cs      # Login response model
├── Program.cs                # Application startup and configuration
├── appsettings.json          # Application settings
└── SmsApi.csproj            # Project file
```

## Technologies Used

- ASP.NET Core 8.0
- JWT Bearer Authentication
- Microsoft.AspNetCore.Authentication.JwtBearer
- Swagger/OpenAPI

## License

This project is created for demonstration purposes.

