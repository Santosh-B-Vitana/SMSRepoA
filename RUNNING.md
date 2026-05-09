# Running the SMS API Backend

This guide explains how to run the SMS API backend locally.

## Prerequisites

- **.NET 8.0 SDK** — [Download](https://dotnet.microsoft.com/download)
- **PostgreSQL 14+** — Running on `localhost:5432`
- **Redis** (optional) — For caching (defaults to in-memory in dev mode)

## Database Setup

Ensure PostgreSQL is running and create the test database:

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres

# Create the test database (if not exists)
CREATE DATABASE "Test-Sch";
```

Default credentials in `appsettings.Development.json`:
- **Host**: localhost
- **Database**: Test-Sch
- **Username**: postgres
- **Password**: sa

Update these if your PostgreSQL setup differs.

## Running the Backend

### Option 1: Using VS Code Task (Recommended)

1. Open the workspace folder in VS Code
2. Run the predefined task: `Run sms-api project`
   - **Keyboard**: `Ctrl+Shift+D` → Select "Run sms-api project"
   - Or: **Terminal** → **Run Task** → **Run sms-api project**

### Option 2: Command Line

```bash
cd "c:\Vitana\Vitana Group\SMSRepoA"
dotnet run
```

### Option 3: With Docker Compose (Infrastructure)

```bash
# Start PostgreSQL + Redis
docker-compose up -d

# Then run the app
dotnet run
```

## Access the API

Once running, the backend will be available at:

- **API Base**: `http://localhost:5092`
- **Health Check**: `http://localhost:5092/health`
- **Health UI**: `http://localhost:5092/health-ui`
- **Swagger/OpenAPI**: `http://localhost:5092/swagger` (if enabled in Program.cs)

## Default Credentials

From `appsettings.Development.json`:

```json
{
  "DefaultAdmin": {
    "Username": "admin",
    "Password": "admin-dev-change-me"
  }
}
```

## Configuration

Key settings in `appsettings.Development.json`:

| Setting | Purpose | Default |
|---------|---------|---------|
| `SkipMigrations` | Skip EF migrations (uses EnsureCreatedAsync) | `true` |
| `DatabaseProvider` | Database system: PostgreSQL or SqlServer | `PostgreSQL` |
| `ConnectionStrings.DefaultConnection` | PostgreSQL connection | `Host=localhost;Database=Test-Sch;Username=postgres;Password=sa` |
| `Cors.AllowedOrigins` | CORS-enabled frontend origins | `localhost:3000, localhost:5173` |

### Database Provider Switching

To use **SQL Server** instead of PostgreSQL:

```bash
# Set environment variable
set DatabaseProvider=SqlServer

# Update connection string for SQL Server
# Edit appsettings.Development.json:
# "DefaultConnection": "Server=.;Database=Test-Sch;Integrated Security=true;"

# Then run
dotnet run
```

## Migrations

### Generating New Migrations

When you modify EF Core entities/mappings:

```bash
# Add migration (PostgreSQL — default)
dotnet ef migrations add YourMigrationName

# Add migration for SQL Server
set DatabaseProvider=SqlServer
dotnet ef migrations add YourMigrationName
```

### Applying Migrations

Migrations are applied **automatically at startup** (in `Program.cs`):

```csharp
await db.Database.MigrateAsync();
```

To skip migrations (e.g., in tests), set `SkipMigrations: true` in appsettings.

## Troubleshooting

### `Connection refused` on Port 5092

- The port may already be in use. Check with:
  ```bash
  netstat -ano | findstr :5092
  ```
- Or pass a custom port:
  ```bash
  dotnet run --urls "http://localhost:5093"
  ```

### `Cannot open database connection` / PostgreSQL errors

- Verify PostgreSQL is running:
  ```bash
  psql -h localhost -U postgres -c "SELECT 1"
  ```
- Check credentials in `appsettings.Development.json`
- Ensure database `Test-Sch` exists

### Entity Framework Migration Errors

- Delete `Migrations/` folder and regenerate:
  ```bash
  rm -r Migrations
  dotnet ef migrations add InitialCreate
  dotnet ef database update
  ```

## Development Mode Features

- **Serilog structured logging** → Console + File (`logs/`)
- **OpenTelemetry tracing** → OTLP exporter (configurable in `Program.cs`)
- **Health checks** → `/health` endpoint
- **CORS enabled** for local dev frontends

## Production Deployment

For production, ensure:

1. **Environment**: Set `ASPNETCORE_ENVIRONMENT=Production`
2. **appsettings.Production.json**: Configure real database, S3, Cashfree keys
3. **Disable debug logs**: Set Serilog level to `Warning` or higher
4. **Database migrations**: Apply with `dotnet ef database update`
5. **SSL/TLS**: Use HTTPS and configure certificate

See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for full production setup.

## Tips

- **Live reload during development**: Use `dotnet watch run`
- **Format code**: `dotnet format`
- **Run tests**: `dotnet test`
- **View logs in real-time**: Tail `logs/sms-api.txt`

---

**Last Updated**: May 8, 2026
