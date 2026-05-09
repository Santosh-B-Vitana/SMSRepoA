# Default Credentials — SMS API

**Last Updated:** May 8, 2026 | **Status:** Development / Seeded Database  
**Framework:** ASP.NET Core 8 | **Project:** SMSRepoA

---

## SECURITY NOTICE

These are **development-only credentials** created during database seeding.

| Rule | Requirement |
|------|-------------|
| ❌ | NEVER use default credentials in production |
| ❌ | NEVER commit real credentials to version control |
| ✅ | Use environment variables for all secrets |
| ✅ | Rotate all passwords immediately after first production deployment |
| ✅ | Enable 2FA for all administrative accounts |
| ✅ | Use AWS Secrets Manager or HashiCorp Vault in production |

---

## Development Credentials

### Admin User

| Field | Value |
|-------|-------|
| **Username** | `admin@vitanaschools.edu` |
| **Password** | `Admin1234!` |
| **Role** | Admin |
| **School** | Test School (seeded) |
| **Access** | Full system access |

### Super Admin

| Field | Value |
|-------|-------|
| **Username** | `superadmin@vitana.com` |
| **Password** | `SuperAdmin1234!` |
| **Role** | super_admin |
| **Access** | Multi-school management |

---

## JWT Configuration

### Development (`appsettings.json`)

```json
{
  "JwtSettings": {
    "Issuer": "SmsApi",
    "Audience": "SmsApiClient",
    "Secret": "dev-only-change-this-secret-before-production-123456789",
    "ExpirationInMinutes": 60
  }
}
```

### Production (environment variables only)

```bash
export JWT_ISSUER="smsapi-prod"
export JWT_AUDIENCE="smsapi-prod-client"
export JWT_SECRET="$(openssl rand -base64 48)"
export JWT_EXPIRATION_MINUTES="120"
```

Generate a secure secret:
```bash
openssl rand -base64 48
```

---

## Integration Test Configuration

When running `dotnet test SmsApi.IntegrationTests`:

| Component | Value | Notes |
|-----------|-------|-------|
| **Environment** | `Testing` | Triggers special in-memory configuration |
| **Database** | In-Memory (EF Core) | Isolated per test class — no PostgreSQL needed |
| **Admin User** | `admin@vitanaschools.edu` / `Admin1234!` | Auto-seeded by `SmsApiFactory` |
| **JWT Secret** | `integration-test-secret-key-minimum-32-chars!` | Set in `appsettings.Testing.json` if present |

### SmsApiFactory Fixed IDs

```csharp
// SmsApi.IntegrationTests/Infrastructure/SmsApiFactory.cs
public static readonly Guid TestSchoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");
public const string AdminUsername = "admin@vitanaschools.edu";
public const string AdminPassword  = "Admin1234!";
```

---

## Database Connection Strings

### Development (SQLite — zero-install)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=SmsDb.db"
  }
}
```

### Development (PostgreSQL)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=sms_dev;Username=postgres;Password=postgres"
  }
}
```

### Production (environment variable)

```bash
export ConnectionStrings__DefaultConnection="Host=db.prod.example.com;Database=sms_prod;Username=sms_user;Password=<vault-secret>;SSL Mode=Require"
```

---

**Related:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | [TESTING_INFRASTRUCTURE.md](./TESTING_INFRASTRUCTURE.md)
