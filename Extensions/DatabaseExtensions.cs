using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using SmsApi.Data;
using Serilog;

namespace SmsApi.Extensions;

/// <summary>
/// Database provider abstraction — supports PostgreSQL (default) and SQL Server (AWS RDS).
/// Switch via appsettings.json: "DatabaseProvider": "SqlServer" | "PostgreSQL"
///
/// Migration commands:
///   PostgreSQL : dotnet ef migrations add ... --context AppDbContext
///   SQL Server : set DatabaseProvider=SqlServer && dotnet ef migrations add ...
///
/// AWS RDS:
///   PostgreSQL : set DB_HOST, DB_NAME, DB_USER, DB_PASSWORD  (RDS endpoint = DB_HOST)
///   SQL Server : set DB_HOST, DB_NAME, DB_USER, DB_PASSWORD + DatabaseProvider=SqlServer
///                Use SQL Auth; prefer IAM auth via IRSA in production.
/// </summary>
public static class DatabaseExtensions
{
    public static WebApplicationBuilder AddDatabase(
        this WebApplicationBuilder builder,
        string connectionString)
    {
        var provider = builder.Configuration.GetValue<string>("DatabaseProvider")
                       ?? "PostgreSQL";

        Log.Information("Configuring database provider: {Provider}", provider);

        if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        {
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    // Retry on transient failures (network, connection pool)
                    sqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(5),
                        errorNumbersToAdd: null);
                    sqlOptions.CommandTimeout(30);

                    // Migrations table: use dbo schema (SQL Server convention)
                    sqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "dbo");
                }));
        }
        else
        {
            // Default: PostgreSQL (local dev + AWS RDS for PostgreSQL)
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(5),
                        errorCodesToAdd: null);
                    npgsqlOptions.CommandTimeout(30);
                }));
        }

        return builder;
    }

    /// <summary>
    /// Adds a provider-agnostic database health check using EF Core's CanConnectAsync.
    /// Works with both PostgreSQL and SQL Server without provider-specific packages.
    /// </summary>
    public static IHealthChecksBuilder AddDatabaseHealthCheck(
        this IHealthChecksBuilder builder)
    {
        // Register the health check implementation as scoped (AppDbContext is scoped).
        builder.Services.AddScoped<EfCoreDatabaseHealthCheck>();
        return builder.AddCheck<EfCoreDatabaseHealthCheck>(
            name: "database",
            failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
            tags: new[] { "db", "ready" });
    }

    /// <summary>
    /// Resolves a connection string from either Docker env vars (DB_HOST etc.)
    /// or the standard ConnectionStrings:DefaultConnection setting.
    ///
    /// Supports both PostgreSQL and SQL Server connection string formats:
    ///   PostgreSQL:  Host=...;Database=...;Username=...;Password=...
    ///   SQL Server:  Server=...;Database=...;User Id=...;Password=...;TrustServerCertificate=True
    /// </summary>
    public static string ResolveConnectionString(IConfiguration configuration)
    {
        var provider = configuration.GetValue<string>("DatabaseProvider") ?? "PostgreSQL";
        var dbHost = configuration["DB_HOST"];
        var dbName = configuration["DB_NAME"];
        var dbUser = configuration["DB_USER"];
        var dbPassword = configuration["DB_PASSWORD"];

        if (!string.IsNullOrEmpty(dbHost) && !string.IsNullOrEmpty(dbName)
            && !string.IsNullOrEmpty(dbUser) && !string.IsNullOrEmpty(dbPassword))
        {
            Log.Information("Using DB connection from environment variables (Host={Host}, Provider={Provider})",
                dbHost, provider);

            // Build provider-appropriate connection string from env vars
            if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
            {
                var dbPort = configuration["DB_PORT"] ?? "1433";
                var trustCert = configuration.GetValue<bool>("DB_TRUST_SERVER_CERTIFICATE", true);
                return $"Server={dbHost},{dbPort};Database={dbName};User Id={dbUser};Password={dbPassword};TrustServerCertificate={trustCert}";
            }
            else
            {
                var dbPort = configuration["DB_PORT"] ?? "5432";
                return $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword}";
            }
        }

        var cs = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrEmpty(cs))
            throw new InvalidOperationException(
                "Database connection string not found. " +
                "Set DB_HOST/DB_NAME/DB_USER/DB_PASSWORD environment variables, " +
                "or configure ConnectionStrings:DefaultConnection in appsettings.json.");

        return cs;
    }
}

/// <summary>
/// Provider-agnostic EF Core health check. Uses CanConnectAsync so it works
/// with both PostgreSQL and SQL Server without extra NuGet packages.
/// </summary>
internal sealed class EfCoreDatabaseHealthCheck(AppDbContext db) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var ok = await db.Database.CanConnectAsync(cancellationToken);
            return ok
                ? HealthCheckResult.Healthy("Database connection successful.")
                : HealthCheckResult.Unhealthy("Database connection failed.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Database health check threw an exception.", ex);
        }
    }
}
