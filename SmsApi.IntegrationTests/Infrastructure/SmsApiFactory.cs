using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmsApi.Data;

namespace SmsApi.IntegrationTests.Infrastructure;

/// <summary>
/// Test host factory that boots the full ASP.NET Core 8 pipeline with:
///   - In-memory EF Core database (no Postgres required, fully isolated per factory instance)
///   - All middleware active: JWT auth, rate-limiting, audit logging, response wrapper
///   - Seeded school + admin user via the app's own SeedEssentialDataAsync
///
/// One factory instance is created per IClassFixture&lt;SmsApiFactory&gt; usage,
/// so each test class gets its own isolated in-memory database.
/// </summary>
public class SmsApiFactory : WebApplicationFactory<Program>
{
    /// <summary>Fixed school ID that SeedEssentialDataAsync seeds.</summary>
    public static readonly Guid TestSchoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

    public const string AdminUsername = "admin";
    public const string AdminPassword  = "TestAdmin@1234!";

    // Unique DB name per factory instance guarantees full test-class isolation.
    private readonly string _databaseName = $"SmsApiIntTest_{Guid.NewGuid():N}";

    /// <summary>
    /// Lazily-initialised admin token task. Evaluated at most once per factory
    /// instance, so the login endpoint is only called once per test class no
    /// matter how many test methods share this fixture.
    /// </summary>
    private readonly Lazy<Task<string>> _adminTokenTask;

    public SmsApiFactory()
    {
        _adminTokenTask = new Lazy<Task<string>>(FetchAdminTokenAsync,
            LazyThreadSafetyMode.ExecutionAndPublication);
    }

    /// <summary>
    /// Returns the cached admin JWT, obtaining it from the login endpoint the
    /// first time it is requested.
    /// </summary>
    public Task<string> GetAdminTokenAsync() => _adminTokenTask.Value;

    private async Task<string> FetchAdminTokenAsync()
    {
        using var client = CreateClient();
        return await AuthHelper.GetAdminTokenAsync(client);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // "Testing" env: IsDevelopment() = false → use our explicit passwords below
        builder.UseEnvironment("Testing");

        // ── Override configuration before services are built ─────────────────
        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // JWT — use the SAME secret as appsettings.json so that JwtBearer validation
                // (which caches the key at service-registration time) and TokenService
                // (which reads from IConfiguration per-request) always agree.
                // appsettings.json has: "dev-only-change-this-secret-before-production-123456789"
                ["JwtSettings:Secret"]              = "dev-only-change-this-secret-before-production-123456789",
                ["JwtSettings:Issuer"]              = "SmsApi",
                ["JwtSettings:Audience"]            = "SmsApiClient",
                ["JwtSettings:ExpirationInMinutes"] = "60",

                // Admin credentials that SeedEssentialDataAsync will hash + store
                ["DefaultAdmin:Username"] = AdminUsername,
                ["DefaultAdmin:Password"] = AdminPassword,

                // Required non-development passwords (prevents startup throw in SeedEssentialDataAsync)
                ["SUPERADMIN_PASSWORD"]   = "test-superadmin-pass-123!",
                ["DEMO_STAFF_PASSWORD"]   = "test-staff-pass-123!",
                ["DEMO_PARENT_PASSWORD"]  = "test-parent-pass-123!",

                // Skip relational migrations — in-memory DB doesn't support MigrateAsync()
                ["SkipMigrations"] = "true",

                // Empty Redis connection → AddCachingInfrastructure falls back to in-memory cache
                // This keeps RedisLoginAttemptService functional via IDistributedCache
                ["ConnectionStrings:Redis"] = "",

                // Rate-limit: keep the existing policies but they reset per factory instance
                // so each test class starts with a fresh counter (auth policy = 10/min)
            });
        });

        // ── Replace DbContext with InMemory after main Program.cs registers it ─
        builder.ConfigureServices(services =>
        {
            // Remove the Npgsql-based DbContextOptions registered by DatabaseExtensions.AddDatabase
            var existingOptions = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (existingOptions != null)
                services.Remove(existingOptions);

            // Register InMemory database
            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
                // Suppress warning: InMemory doesn't support transactions — that's expected
                options.ConfigureWarnings(w =>
                    w.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            });

            // ── Add OnChallenge/OnAuthFailed logging to diagnose 401 causes ─
            services.PostConfigure<Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerOptions>(
                Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme,
                options =>
                {
                    var existing = options.Events ?? new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents();
                    options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
                    {
                        OnAuthenticationFailed = async ctx =>
                        {
                            Console.Error.WriteLine($"[JWT-DIAG] OnAuthenticationFailed: {ctx.Exception}");
                            if (existing.OnAuthenticationFailed != null)
                                await existing.OnAuthenticationFailed(ctx);
                        },
                        OnChallenge = async ctx =>
                        {
                            Console.Error.WriteLine($"[JWT-DIAG] OnChallenge: error={ctx.Error}, desc={ctx.ErrorDescription}");
                            if (existing.OnChallenge != null)
                                await existing.OnChallenge(ctx);
                        },
                        OnMessageReceived = async ctx =>
                        {
                            Console.Error.WriteLine($"[JWT-DIAG] OnMessageReceived: token present={!string.IsNullOrEmpty(ctx.Token)}");
                            if (existing.OnMessageReceived != null)
                                await existing.OnMessageReceived(ctx);
                        },
                    };
                });
        });
    }
}
