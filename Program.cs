using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MediatR;
using SmsApi.Data;
using SmsApi.Application.Common.Behaviors;
using SmsApi.Services;
using SmsApi.Middleware;
using FluentValidation;
using System.Text;
using System.Threading.RateLimiting;
using Serilog;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using SmsApi.Extensions;
using SmsApi.Infrastructure.Performance;
using SmsApi.Infrastructure.Resilience;

// ── Serilog bootstrap logger (captures startup/config errors) ──────────
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}{NewLine}  {Message:lj}{NewLine}{Exception}")
    .WriteTo.File("logs/sms-api-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext} | CorrelationId:{CorrelationId} | {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

// Runtime Serilog is configured below inside builder.Host.UseSerilog()
// so that it can read Seq:ServerUrl from appsettings.json

try
{

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog((ctx, services, config) =>
{
    config
        .ReadFrom.Configuration(ctx.Configuration)
        .ReadFrom.Services(services)
        .MinimumLevel.Override("Microsoft.AspNetCore", Serilog.Events.LogEventLevel.Warning)
        .MinimumLevel.Override("Microsoft.EntityFrameworkCore", Serilog.Events.LogEventLevel.Warning)
        .Enrich.FromLogContext()
        .Enrich.WithMachineName()
        .Enrich.WithEnvironmentName()
        .WriteTo.Console(outputTemplate:
            "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}{NewLine}  {Message:lj}{NewLine}{Exception}")
        .WriteTo.File("logs/sms-api-.log",
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 30,
            outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext} | CorrelationId:{CorrelationId} | {Message:lj}{NewLine}{Exception}");

    // Seq: centralized log aggregation (set Seq:ServerUrl in appsettings or env)
    var seqUrl = ctx.Configuration["Seq:ServerUrl"];
    if (!string.IsNullOrEmpty(seqUrl))
        config.WriteTo.Seq(seqUrl);
});

// ── Kestrel server limits ─────────────────────────────────────────────────
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 10 * 1024 * 1024; // 10 MB
    serverOptions.Limits.MaxRequestHeadersTotalSize = 32 * 1024; // 32 KB
    serverOptions.Limits.MaxConcurrentConnections = 200;
    serverOptions.Limits.MaxConcurrentUpgradedConnections = 200;
    serverOptions.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);
    serverOptions.Limits.KeepAliveTimeout = TimeSpan.FromSeconds(120);
});
// Configure configuration sources - IMPORTANT: Load from environment variables for production secrets
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables()
    .AddUserSecrets<Program>(optional: !builder.Environment.IsProduction());

// ── Connection string (provider-aware: PostgreSQL default, SQL Server optional) ───
var connectionString = SmsApi.Extensions.DatabaseExtensions.ResolveConnectionString(builder.Configuration);
builder.AddDatabase(connectionString);

// ── All business services ────────────────────────────────────────────────────────
builder.Services.AddApplicationServices(builder.Configuration, builder.Environment);


// ── Caching (Redis in prod, in-memory in dev) ─────────────────────────────────────
builder.Services.AddCachingInfrastructure(builder.Configuration);

// ── Health checks (provider-agnostic EF Core CanConnectAsync + Redis) ────────────
builder.Services.AddHealthCheckInfrastructure(builder.Configuration);

// ── OpenTelemetry distributed tracing + metrics ───────────────────────────────────
builder.Services.AddObservability(builder.Configuration, builder.Environment);

// ── Response compression (Brotli + GZip) ─────────────────────────────────────────
builder.Services.AddProductionResponseCompression();
builder.Services.AddProductionHttpsSecurity(builder.Environment);

// ── Rate limiting (auth / global / uploads / reports / bulk / search / export) ───
builder.Services.AddApiRateLimiting();

// ── Controllers + ProblemDetails RFC 7807 ────────────────────────────────────────
builder.Services.AddControllersInfrastructure();

// ── API versioning + Swagger + JWT Swagger support ────────────────────────────────
builder.Services.AddApiInfrastructure();

// ── CORS ─────────────────────────────────────────────────────────────────────────
builder.Services.AddApplicationCors(builder.Configuration, builder.Environment);

// ── JWT authentication + SuperAdmin claims transformer + authorization policies ───
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddAuthorizationPolicies();

var app = builder.Build();

// ── Ensure DB schema is up to date before seeding ─────────────────────────
await ApplyDatabaseMigrationsAsync(app);

// ── Startup seeding: ensure school + admin user exist ──────────────────────
await SeedEssentialDataAsync(app);

// ── Test data seeding: students, staff, parents, fees, transport, exams ────
await SeedTestDataAsync(app);

// ── Backfill: assign system roles to existing staff logins that have none ──
{
    using var scope = app.Services.CreateScope();
    var staffSvc = scope.ServiceProvider.GetRequiredService<SmsApi.Services.IStaffService>();
    var demoSchoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");
    await staffSvc.BulkAutoAssignRolesAsync(demoSchoolId);
}

// Performance monitoring (logs slow requests > 500ms, SLA breach > 2000ms)
app.UsePerformanceMonitoring();

// Add global logging + error handling middleware (must be first in pipeline)
app.UseMiddleware<SmsApi.Middleware.ErrorHandlingMiddleware>();

// Security headers (OWASP-recommended — early so they appear on all responses)
app.UseMiddleware<SmsApi.Middleware.SecurityHeadersMiddleware>();

// Correlation ID for distributed tracing (early in pipeline)
app.UseMiddleware<SmsApi.Middleware.CorrelationIdMiddleware>();

// Serilog request logging (structured, enriched with correlation ID)
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("UserId", httpContext.User?.FindFirst("UserId")?.Value ?? "anonymous");
        diagnosticContext.Set("SchoolId", httpContext.User?.FindFirst("SchoolId")?.Value ?? "none");
        diagnosticContext.Set("CorrelationId", httpContext.Items["CorrelationId"]?.ToString() ?? "none");
    };
});

// Extract academic year from request headers for use throughout pipeline
app.UseAcademicYearContext();

// Response compression (before any content is written)
app.UseResponseCompression();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Use CORS - must be early in pipeline
app.UseCors(app.Environment.IsDevelopment() ? "AllowAll" : "AllowSpecificOrigins");

// Serve uploaded files at /files/* (path-traversal-safe: served only from configured uploads dir)
var uploadsPath = Path.GetFullPath(
    app.Configuration["FileStorage:BasePath"]
    ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads"));
if (!Directory.Exists(uploadsPath))
    Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/files"
});

// HSTS: tell browsers to always use HTTPS (production only — skip in dev/test)
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing"))
{
    app.UseHttpsRedirection();
    app.UseHsts();
}

// Rate limiting
app.UseRateLimiter();

// Use Authentication and Authorization
app.UseAuthentication();
app.UseAuthorization();

// Use School Feature Access Middleware (after authentication)
app.UseMiddleware<SmsApi.Middleware.SchoolFeatureAccessMiddleware>();

// Audit logging: records POST/PUT/PATCH/DELETE to AuditLogs table (after auth, before response wrapper)
app.UseMiddleware<SmsApi.Middleware.AuditLoggingMiddleware>();

// Standardized API response envelope (wraps all successful JSON responses)
app.UseMiddleware<SmsApi.Middleware.ApiResponseWrapperMiddleware>();

// Health check endpoints — /health, /health/live, /health/ready (K8s-ready)
app.MapHealthCheckEndpoints();

app.MapControllers();

app.Run();

}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
return;

static async Task ApplyDatabaseMigrationsAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Logging.ILogger<Program>>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    // Skip relational migrations when running on an in-memory provider (integration tests)
    if (config.GetValue<bool>("SkipMigrations", false))
    {
        logger.LogInformation("SkipMigrations=true: skipping database migration (in-memory / test mode).");
        await db.Database.EnsureCreatedAsync();
        return;
    }

    try
    {
        await db.Database.MigrateAsync();
        logger.LogInformation("Database migrations applied successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to apply database migrations at startup.");
        throw;
    }
}

// ── Essential data seeding (idempotent) ───────────────────────────────────
static async Task SeedEssentialDataAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Logging.ILogger<Program>>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var environment = scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>();

    try
    {
        // Fixed school ID used across all seeds and frontend mock data
        var schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");

        // 1. Ensure default school exists
        if (!await db.Schools.AnyAsync(s => s.Id == schoolId))
        {
            db.Schools.Add(new SmsApi.Models.Entities.School
            {
                Id = schoolId,
                Name = "Demo School",
                SchoolCode = "DEMO001",
                Email = "info@demoschool.edu",
                Phone = "+91-9000000000",
                Address = "123 School Lane, City, State",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded default school (Id: {SchoolId})", schoolId);
        }

        // 2. Ensure admin user exists in DB with correct email
        var adminUsername = config.GetValue<string>("DefaultAdmin:Username") ?? "admin";
        var adminPassword = config.GetValue<string>("DefaultAdmin:Password")
            ?? config["DEFAULT_ADMIN_PASSWORD"]
            ?? (environment.IsDevelopment() ? "admin-dev-change-me" : null);

        if (string.IsNullOrWhiteSpace(adminPassword))
            throw new InvalidOperationException("Default admin password is required in non-development environments. Set DefaultAdmin:Password or DEFAULT_ADMIN_PASSWORD.");
        var adminEmail = "admin@vitanaschools.edu";

        var adminUser = await db.UserLogins.FirstOrDefaultAsync(u =>
            u.Username == adminUsername && u.SchoolId == schoolId && !u.IsDeleted);

        if (adminUser == null)
        {
            db.UserLogins.Add(new SmsApi.Models.Entities.UserLogin
            {
                Id = Guid.NewGuid(),
                Username = adminUsername,
                Email = adminEmail,
                FirstName = "Admin",
                LastName = "User",
                Role = "Admin",
                Status = "active",
                SchoolId = schoolId,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword, workFactor: 12),
                PasswordChangedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            });
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded admin user '{Username}' for school {SchoolId}", adminUsername, schoolId);
        }
        else if (adminUser.Email != adminEmail)
        {
            // Update email if it's different
            adminUser.Email = adminEmail;
            adminUser.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            logger.LogInformation("Updated admin user email to {Email}", adminEmail);
        }

        // 3. Ensure SuperAdmin exists (platform admin - belongs to a platform pseudo-school)
        var platformSchoolId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        if (!await db.Schools.AnyAsync(s => s.Id == platformSchoolId))
        {
            db.Schools.Add(new SmsApi.Models.Entities.School
            {
                Id = platformSchoolId,
                Name = "Vitana Platform",
                SchoolCode = "PLATFORM",
                Email = "platform@vitana.in",
                IsActive = false, // Hidden from school lists
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var superAdminPassword = config["SUPERADMIN_PASSWORD"] ?? (environment.IsDevelopment() ? "SuperAdmin@123" : throw new InvalidOperationException("SUPERADMIN_PASSWORD is required in non-development environments."));
        var superAdmin = await db.UserLogins.FirstOrDefaultAsync(u =>
            u.Username == "superadmin" && !u.IsDeleted);

        if (superAdmin == null)
        {
            db.UserLogins.Add(new SmsApi.Models.Entities.UserLogin
            {
                Id = Guid.NewGuid(),
                Username = "superadmin",
                Email = "superadmin@vitana.in",
                FirstName = "Super",
                LastName = "Admin",
                Role = "SuperAdmin",
                Status = "active",
                SchoolId = platformSchoolId,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(superAdminPassword, workFactor: 12),
                PasswordChangedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            });
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded superadmin user");
        }
        else
        {
            // Always sync password from config and ensure account is unlocked
            superAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(superAdminPassword, workFactor: 12);
            superAdmin.Status = "active";
            superAdmin.LockedUntil = null;
            superAdmin.FailedLoginAttempts = 0;
            superAdmin.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            logger.LogInformation("Superadmin password synced from configuration");
        }

        // 3b. Seed demo staff & parent users for the main school
        var staffEmail = "suresh.n@demo.edu";
        if (!await db.UserLogins.AnyAsync(u => u.Email == staffEmail && !u.IsDeleted))
        {
            db.UserLogins.Add(new SmsApi.Models.Entities.UserLogin
            {
                Id = Guid.NewGuid(),
                Username = "suresh.nair",
                Email = staffEmail,
                FirstName = "Suresh",
                LastName = "Nair",
                Role = "Staff",
                Status = "active",
                SchoolId = schoolId,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                    config["DEMO_STAFF_PASSWORD"] ?? (environment.IsDevelopment() ? "staff-dev-change-me" : throw new InvalidOperationException("DEMO_STAFF_PASSWORD is required in non-development environments.")),
                    workFactor: 12),
                PasswordChangedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            });
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded demo staff user '{Email}'", staffEmail);
        }

        var parentEmail = "aj@gmail.com";
        var parentPassword = config["DEMO_PARENT_PASSWORD"] ?? (environment.IsDevelopment() ? "Veda#834Nh7J" : throw new InvalidOperationException("DEMO_PARENT_PASSWORD is required in non-development environments."));
        var parentPasswordHash = BCrypt.Net.BCrypt.HashPassword(parentPassword, workFactor: 12);
        var now = DateTime.UtcNow;

        // Soft-delete the legacy parent@demo.edu row if it still exists (we keep aj@gmail.com instead).
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE [dbo].[UserLogins] SET [IsDeleted] = 1, [UpdatedAt] = {now} WHERE [Email] = N'parent@demo.edu' AND [SchoolId] = {schoolId}");

        // Update the aj@gmail.com row in-place (bypasses EF soft-delete filter); INSERT only if absent.
        var rowsUpdated = await db.Database.ExecuteSqlInterpolatedAsync(
            $@"UPDATE [dbo].[UserLogins]
               SET [PasswordHash] = {parentPasswordHash},
                   [Status] = N'active',
                   [IsDeleted] = 0,
                   [LockedUntil] = NULL,
                   [FailedLoginAttempts] = 0,
                   [UpdatedAt] = {now}
               WHERE [Email] = {parentEmail} AND [SchoolId] = {schoolId}");
        if (rowsUpdated == 0)
        {
            db.UserLogins.Add(new SmsApi.Models.Entities.UserLogin
            {
                Id = Guid.NewGuid(),
                Username = "aj.parent",
                Email = parentEmail,
                FirstName = "Ajith",
                LastName = "Hasthi",
                Role = "Parent",
                Status = "active",
                SchoolId = schoolId,
                PasswordHash = parentPasswordHash,
                PasswordChangedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
                IsDeleted = false
            });
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded demo parent user '{Email}'", parentEmail);
        }
        else
        {
            logger.LogInformation("Demo parent credentials synced to '{Email}'", parentEmail);
        }

        // 4. Seed default school settings (idempotent: only adds missing keys)
        var defaultSettings = new List<(string Key, string Value, string Type, string Category, string Desc)>
        {
            // General
            ("school_name",          "Demo School",             "string",  "General",       "Display name of the school"),
            ("school_tagline",       "Excellence in Education", "string",  "General",       "School motto or tagline"),
            ("school_timezone",      "Asia/Kolkata",            "string",  "General",       "School timezone (IANA format)"),
            ("school_currency",      "INR",                     "string",  "General",       "Default currency code (ISO 4217)"),
            ("school_language",      "en",                      "string",  "General",       "Default UI language"),
            ("school_country",       "India",                   "string",  "General",       "Country of operation"),
            ("school_phone",         "+91-9000000000",          "string",  "General",       "Primary contact number"),
            ("school_email",         "info@demoschool.edu",     "string",  "General",       "Primary contact email"),
            ("school_website",       "https://demoschool.edu",  "string",  "General",       "School website URL"),
            ("school_address",       "123 School Lane, City, State", "string", "General",   "Full postal address"),

            // Academic
            ("academic_year_start",  "2025-06-01",              "date",    "Academic",      "Start date of current academic year"),
            ("academic_year_end",    "2026-03-31",              "date",    "Academic",      "End date of current academic year"),
            ("academic_year_label",  "2025-26",                 "string",  "Academic",      "Academic year label shown in UI"),
            ("working_days_per_week","5",                       "number",  "Academic",      "Working days per week (5 or 6)"),
            ("class_duration_mins",  "45",                      "number",  "Academic",      "Default class period duration in minutes"),
            ("periods_per_day",      "8",                       "number",  "Academic",      "Number of periods per school day"),
            ("grading_system",       "percentage",              "string",  "Academic",      "Grading system: percentage, gpa, grade"),
            ("passing_percentage",   "35",                      "number",  "Academic",      "Minimum passing percentage"),
            ("attendance_required",  "75",                      "number",  "Academic",      "Minimum attendance % required"),
            ("promotion_policy",     "strict",                  "string",  "Academic",      "Promotion policy: strict, lenient, flexible"),

            // Financial
            ("fee_due_day",          "10",                      "number",  "Financial",     "Day of month fees are due"),
            ("late_fee_percentage",  "2",                       "number",  "Financial",     "Late fee as % of outstanding per month"),
            ("late_fee_grace_days",  "5",                       "number",  "Financial",     "Grace days before late fee applies"),
            ("enable_online_payment","true",                    "boolean", "Financial",     "Whether online fee payment is enabled"),
            ("payment_gateway",      "razorpay",                "string",  "Financial",     "Active payment gateway provider"),
            ("invoice_prefix",       "INV",                     "string",  "Financial",     "Prefix for fee invoice numbers"),
            ("receipt_footer",       "Thank you for timely payment.", "string", "Financial","Text shown on fee receipts"),

            // Communication
            ("enable_sms",           "false",                   "boolean", "Communication", "Enable SMS notifications"),
            ("enable_email",         "true",                    "boolean", "Communication", "Enable email notifications"),
            ("enable_push",          "true",                    "boolean", "Communication", "Enable push notifications"),
            ("notify_fee_due",       "true",                    "boolean", "Communication", "Send reminder when fee is due"),
            ("notify_attendance",    "true",                    "boolean", "Communication", "Send daily attendance digest to parents"),
            ("notify_results",       "true",                    "boolean", "Communication", "Notify parents when results are published"),

            // Appearance
            ("primary_color",        "#1976D2",                 "string",  "Appearance",    "Primary brand colour (hex)"),
            ("logo_url",             "",                        "string",  "Appearance",    "URL of school logo image"),
            ("theme",                "light",                   "string",  "Appearance",    "Default UI theme: light or dark"),

            // Security
            ("session_timeout_mins", "480",                     "number",  "Security",      "Inactivity timeout in minutes (8 hours)"),
            ("max_login_attempts",   "5",                       "number",  "Security",      "Max failed login attempts before lockout"),
            ("password_min_length",  "8",                       "number",  "Security",      "Minimum password length policy"),
            ("require_2fa_admin",    "false",                   "boolean", "Security",      "Require 2FA for Admin role"),
        };

        var existingKeys = await db.SchoolSettings
            .Where(s => s.SchoolId == schoolId)
            .Select(s => s.SettingKey)
            .ToListAsync();

        var toInsert = defaultSettings
            .Where(s => !existingKeys.Contains(s.Key))
            .Select(s => new SmsApi.Models.Entities.SchoolSettings
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                SettingKey = s.Key,
                SettingValue = s.Value,
                DataType = s.Type,
                Category = s.Category,
                Description = s.Desc,
                IsEncrypted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            }).ToList();

        if (toInsert.Count > 0)
        {
            db.SchoolSettings.AddRange(toInsert);
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded {Count} default school settings", toInsert.Count);
        }

        // 5. Seed Classes, Sections, Subjects, Students, Guardians
        await SeedAcademicsAndStudentsAsync(db, schoolId, logger);

        // 6. Seed Fees, Hostel, Transport, Grades (separate idempotent guards)
        await SeedOperationalDataAsync(db, schoolId, logger);

        // 7. Seed timetable periods (idempotent: skipped if timetables already exist)
        var seeder = scope.ServiceProvider.GetRequiredService<SmsApi.Services.IDbSeeder>();
        await seeder.SeedAllAsync();

        // 8. Seed leave types for the Demo School (idempotent)
        if (!await db.LeaveTypes.AnyAsync(l => l.SchoolId == schoolId && l.ApplicableTo == "Staff"))
        {
            db.LeaveTypes.AddRange(new[]
            {
                new SmsApi.Models.Entities.LeaveType { Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Casual Leave",     Description = "For personal or family matters",                  ApplicableTo = "Staff",    MaxDaysPerYear = 12,  RequiresApproval = true,  RequiresDocument = false, MinNoticeDays = 1,  IsCarryForward = false, IsPaid = true,  IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new SmsApi.Models.Entities.LeaveType { Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Sick Leave",       Description = "Medical leave with doctor's certificate",          ApplicableTo = "Staff",    MaxDaysPerYear = 10,  RequiresApproval = true,  RequiresDocument = true,  MinNoticeDays = 0,  IsCarryForward = false, IsPaid = true,  IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new SmsApi.Models.Entities.LeaveType { Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Earned Leave",     Description = "Leave earned through service",                     ApplicableTo = "Staff",    MaxDaysPerYear = 15,  RequiresApproval = true,  RequiresDocument = false, MinNoticeDays = 3,  IsCarryForward = true,  IsPaid = true,  IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new SmsApi.Models.Entities.LeaveType { Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Maternity Leave",  Description = "Maternity leave as per Maternity Benefit Act",     ApplicableTo = "Staff",    MaxDaysPerYear = 180, RequiresApproval = true,  RequiresDocument = true,  MinNoticeDays = 30, IsCarryForward = false, IsPaid = true,  IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new SmsApi.Models.Entities.LeaveType { Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Paternity Leave",  Description = "Paternity leave for new fathers",                  ApplicableTo = "Staff",    MaxDaysPerYear = 15,  RequiresApproval = true,  RequiresDocument = false, MinNoticeDays = 7,  IsCarryForward = false, IsPaid = true,  IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new SmsApi.Models.Entities.LeaveType { Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Compensatory Off", Description = "Leave in lieu of working on holidays or weekends",  ApplicableTo = "Staff",    MaxDaysPerYear = 12,  RequiresApproval = true,  RequiresDocument = false, MinNoticeDays = 1,  IsCarryForward = false, IsPaid = true,  IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new SmsApi.Models.Entities.LeaveType { Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Loss of Pay",      Description = "Unpaid leave when all paid leaves are exhausted",   ApplicableTo = "Staff",    MaxDaysPerYear = 30,  RequiresApproval = true,  RequiresDocument = false, MinNoticeDays = 2,  IsCarryForward = false, IsPaid = false, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            });
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded staff leave types for Demo School");
        }
        if (!await db.LeaveTypes.AnyAsync(l => l.SchoolId == schoolId && (l.ApplicableTo == "Student" || l.ApplicableTo == "All")))
        {
            db.LeaveTypes.AddRange(new[]
            {
                new SmsApi.Models.Entities.LeaveType { Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Medical Leave",   Description = "Student is unwell and needs rest",      ApplicableTo = "Student", MaxDaysPerYear = 15, RequiresApproval = true,  RequiresDocument = false, MinNoticeDays = 0, IsCarryForward = false, IsPaid = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new SmsApi.Models.Entities.LeaveType { Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Casual Leave",    Description = "For personal or family matters",        ApplicableTo = "Student", MaxDaysPerYear = 10, RequiresApproval = true,  RequiresDocument = false, MinNoticeDays = 1, IsCarryForward = false, IsPaid = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new SmsApi.Models.Entities.LeaveType { Id = Guid.NewGuid(), SchoolId = schoolId, Name = "Family Function", Description = "Leave for family events or ceremonies",  ApplicableTo = "Student", MaxDaysPerYear = 5,  RequiresApproval = true,  RequiresDocument = false, MinNoticeDays = 2, IsCarryForward = false, IsPaid = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            });
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded student leave types for Demo School");
        }

        // 9. Backfill health records for existing students that don't have one
        var studentsWithoutHealth = await db.Students
            .Where(s => s.SchoolId == schoolId && !s.IsDeleted &&
                        !db.HealthRecords.Any(h => h.SchoolId == schoolId && h.StudentId == s.Id))
            .ToListAsync();

        if (studentsWithoutHealth.Count > 0)
        {
            var healthRecords = studentsWithoutHealth.Select(s => new SmsApi.Models.Entities.HealthRecord
            {
                Id = Guid.NewGuid(),
                SchoolId = s.SchoolId,
                StudentId = s.Id,
                CheckupDate = DateTime.UtcNow,
                BloodGroup = s.BloodGroup,
                Allergies = s.Allergies,
                ChronicConditions = s.ChronicConditions,
                Medications = s.Medications,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }).ToList();

            db.HealthRecords.AddRange(healthRecords);
            await db.SaveChangesAsync();
            logger.LogInformation("Backfilled {Count} health records for existing students", healthRecords.Count);
        }

        // 10. Sync system role permissions to match current code definition on every startup.
        //     This adds missing permissions (e.g. Assignments added to Teacher role) and
        //     removes revoked ones (e.g. Attendance.Create/Edit removed from Teacher role).
        var permService = scope.ServiceProvider.GetRequiredService<SmsApi.Services.IPermissionsService>();
        await permService.EnsureSystemRolesAsync(schoolId);
        logger.LogInformation("Synced system role permissions for school {SchoolId}", schoolId);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error during essential data seeding");
    }
}

static async Task SeedAcademicsAndStudentsAsync(
    SmsApi.Data.AppDbContext db, Guid schoolId, Microsoft.Extensions.Logging.ILogger logger)
{
    // ── 5a. Classes (Grade 1 – 10) ────────────────────────────────────────
    if (await db.Classes.AnyAsync(c => c.SchoolId == schoolId))
        return; // already seeded — idempotent guard

    var classData = new[]
    {
        ("Class 1","CL1"),("Class 2","CL2"),("Class 3","CL3"),("Class 4","CL4"),("Class 5","CL5"),
        ("Class 6","CL6"),("Class 7","CL7"),("Class 8","CL8"),("Class 9","CL9"),("Class 10","CL10"),
    };

    var classes = classData.Select(c => new SmsApi.Models.Entities.Class
    {
        Id = Guid.NewGuid(), SchoolId = schoolId,
        Name = c.Item1, Code = c.Item2, Capacity = 40, Status = "active",
        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsDeleted = false
    }).ToList();
    db.Classes.AddRange(classes);
    await db.SaveChangesAsync();
    logger.LogInformation("Seeded {Count} classes", classes.Count);

    // ── 5b. Sections A & B for each class ────────────────────────────────
    var sections = new List<SmsApi.Models.Entities.Section>();
    foreach (var cls in classes)
    {
        foreach (var sName in new[] { "A", "B" })
        {
            sections.Add(new SmsApi.Models.Entities.Section
            {
                Id = Guid.NewGuid(), SchoolId = schoolId, ClassId = cls.Id,
                Name = sName, Capacity = 40, StudentsCount = 0, Status = "active",
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsDeleted = false
            });
        }
    }
    db.Sections.AddRange(sections);
    await db.SaveChangesAsync();
    logger.LogInformation("Seeded {Count} sections", sections.Count);

    // ── 5c. Subjects ──────────────────────────────────────────────────────
    var subjectData = new[]
    {
        ("Mathematics","MATH","Core",100,35),
        ("English Language","ENG","Core",100,35),
        ("Hindi","HIN","Core",100,35),
        ("Science","SCI","Core",100,35),
        ("Social Studies","SST","Core",100,35),
        ("Computer Science","CS","Elective",100,35),
        ("Physical Education","PE","Activity",50,18),
        ("Arts & Crafts","ART","Activity",50,18),
    };
    var subjects = subjectData.Select(s => new SmsApi.Models.Entities.Subject
    {
        Id = Guid.NewGuid(), SchoolId = schoolId,
        Name = s.Item1, Code = s.Item2, Type = s.Item3,
        MaxMarks = s.Item4, PassMarks = s.Item5, Status = "active",
        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsDeleted = false
    }).ToList();
    db.Subjects.AddRange(subjects);
    await db.SaveChangesAsync();
    logger.LogInformation("Seeded {Count} subjects", subjects.Count);

    // ── 5d. Students (20 students across Class 1–5) ───────────────────────
    var class1 = classes[0]; var class2 = classes[1];
    var class3 = classes[2]; var class4 = classes[3]; var class5 = classes[4];
    var sec1A = sections.First(s => s.ClassId == class1.Id && s.Name == "A");
    var sec2A = sections.First(s => s.ClassId == class2.Id && s.Name == "A");
    var sec3A = sections.First(s => s.ClassId == class3.Id && s.Name == "A");
    var sec4A = sections.First(s => s.ClassId == class4.Id && s.Name == "A");
    var sec5A = sections.First(s => s.ClassId == class5.Id && s.Name == "A");

    var studentSeed = new[]
    {
        // (Name, FirstName, LastName, AdmNo, Class, ClassId, Section, SectionId, DOB, Gender, Category, GuardianName, GuardianPhone, Email)
        ("Aarav Sharma",     "Aarav",    "Sharma",    "2025001", "Class 1", class1.Id, "A", sec1A.Id, "2019-04-10", "Male",   "General", "Ramesh Sharma",    "+91-9811001001", "aarav.s@demo.edu"),
        ("Priya Patel",      "Priya",    "Patel",     "2025002", "Class 1", class1.Id, "A", sec1A.Id, "2019-07-22", "Female", "OBC",     "Suresh Patel",     "+91-9811001002", "priya.p@demo.edu"),
        ("Arjun Singh",      "Arjun",    "Singh",     "2025003", "Class 2", class2.Id, "A", sec2A.Id, "2018-03-15", "Male",   "General", "Vikram Singh",     "+91-9811001003", "arjun.s@demo.edu"),
        ("Ananya Gupta",     "Ananya",   "Gupta",     "2025004", "Class 2", class2.Id, "A", sec2A.Id, "2018-11-05", "Female", "General", "Anil Gupta",       "+91-9811001004", "ananya.g@demo.edu"),
        ("Rohan Kumar",      "Rohan",    "Kumar",     "2025005", "Class 3", class3.Id, "A", sec3A.Id, "2017-06-18", "Male",   "SC",      "Mohan Kumar",      "+91-9811001005", "rohan.k@demo.edu"),
        ("Sneha Joshi",      "Sneha",    "Joshi",     "2025006", "Class 3", class3.Id, "A", sec3A.Id, "2017-09-30", "Female", "General", "Dinesh Joshi",     "+91-9811001006", "sneha.j@demo.edu"),
        ("Karan Mehta",      "Karan",    "Mehta",     "2025007", "Class 4", class4.Id, "A", sec4A.Id, "2016-01-25", "Male",   "General", "Rajesh Mehta",     "+91-9811001007", "karan.m@demo.edu"),
        ("Kavya Nair",       "Kavya",    "Nair",      "2025008", "Class 4", class4.Id, "A", sec4A.Id, "2016-08-12", "Female", "OBC",     "Sunil Nair",       "+91-9811001008", "kavya.n@demo.edu"),
        ("Vikash Yadav",     "Vikash",   "Yadav",     "2025009", "Class 5", class5.Id, "A", sec5A.Id, "2015-05-08", "Male",   "OBC",     "Ramakant Yadav",   "+91-9811001009", "vikash.y@demo.edu"),
        ("Divya Verma",      "Divya",    "Verma",     "2025010", "Class 5", class5.Id, "A", sec5A.Id, "2015-12-20", "Female", "General", "Ashok Verma",      "+91-9811001010", "divya.v@demo.edu"),
        ("Aditya Pandey",    "Aditya",   "Pandey",    "2025011", "Class 1", class1.Id, "A", sec1A.Id, "2019-02-14", "Male",   "General", "Suresh Pandey",    "+91-9811001011", "aditya.p@demo.edu"),
        ("Meera Iyer",       "Meera",    "Iyer",      "2025012", "Class 2", class2.Id, "A", sec2A.Id, "2018-09-01", "Female", "General", "Venkat Iyer",      "+91-9811001012", "meera.i@demo.edu"),
        ("Rahul Das",        "Rahul",    "Das",       "2025013", "Class 3", class3.Id, "A", sec3A.Id, "2017-04-27", "Male",   "SC",      "Bijoy Das",        "+91-9811001013", "rahul.d@demo.edu"),
        ("Pooja Mishra",     "Pooja",    "Mishra",    "2025014", "Class 4", class4.Id, "A", sec4A.Id, "2016-11-11", "Female", "General", "Om Prakash Mishra","+91-9811001014", "pooja.m@demo.edu"),
        ("Nikhil Tiwari",    "Nikhil",   "Tiwari",    "2025015", "Class 5", class5.Id, "A", sec5A.Id, "2015-07-03", "Male",   "General", "Jitendra Tiwari",  "+91-9811001015", "nikhil.t@demo.edu"),
        ("Riya Kapoor",      "Riya",     "Kapoor",    "2025016", "Class 1", class1.Id, "A", sec1A.Id, "2019-10-16", "Female", "General", "Sanjay Kapoor",    "+91-9811001016", "riya.k@demo.edu"),
        ("Ayush Bose",       "Ayush",    "Bose",      "2025017", "Class 2", class2.Id, "A", sec2A.Id, "2018-05-21", "Male",   "General", "Subhash Bose",     "+91-9811001017", "ayush.b@demo.edu"),
        ("Tanvi Choudhary",  "Tanvi",    "Choudhary", "2025018", "Class 3", class3.Id, "A", sec3A.Id, "2017-08-09", "Female", "OBC",     "Mahesh Choudhary", "+91-9811001018", "tanvi.c@demo.edu"),
        ("Siddharth Rao",    "Siddharth","Rao",       "2025019", "Class 4", class4.Id, "A", sec4A.Id, "2016-03-30", "Male",   "General", "Prasad Rao",       "+91-9811001019", "sid.r@demo.edu"),
        ("Ishaan Ghosh",     "Ishaan",   "Ghosh",     "2025020", "Class 5", class5.Id, "A", sec5A.Id, "2015-01-17", "Male",   "ST",      "Tapan Ghosh",      "+91-9811001020", "ishaan.g@demo.edu"),
    };

    var students = studentSeed.Select(s => new SmsApi.Models.Entities.Student
    {
        Id = Guid.NewGuid(),
        SchoolId = schoolId,
        Name = s.Item1,
        FirstName = s.Item2,
        LastName = s.Item3,
        AdmissionNumber = s.Item4,
        Class = s.Item5,
        Section = s.Item8.ToString(),   // section name stored as string on entity
        DateOfBirth = DateTime.Parse(s.Item9),
        Gender = s.Item10,
        Category = s.Item11,
        GuardianName = s.Item12,
        GuardianPhone = s.Item13,
        Email = s.Item14,
        Address = "Demo Address, City, State",
        AdmissionDate = new DateTime(2025, 6, 1),
        Status = "active",
        IsActive = true,
        BloodGroup = "B+",
        Nationality = "Indian",
        PhotoConsent = true,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        IsDeleted = false
    }).ToList();

    // Fix: Section field on Student entity is a string (the name), not a FK
    // Re-map using section name instead of ID
    foreach (var (s, i) in students.Select((s, i) => (s, i)))
    {
        s.Section = studentSeed[i].Item8.ToString() == sec1A.Id.ToString() ? "A" : "A";
    }
    // Simpler: all are section "A" for this seed — already set in the Name field above

    db.Students.AddRange(students);
    await db.SaveChangesAsync();
    logger.LogInformation("Seeded {Count} students", students.Count);

    // ── 5e. Guardians (one per student) ───────────────────────────────────
    var guardians = studentSeed.Select((s, i) => new SmsApi.Models.Entities.StudentGuardian
    {
        Id = Guid.NewGuid(),
        StudentId = students[i].Id,
        SchoolId = schoolId,
        Name = s.Item12,
        Relation = "father",
        Phone = s.Item13,
        Email = $"parent{i + 1}@demo.edu",
        Occupation = "Professional",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        IsDeleted = false
    }).ToList();

    db.StudentGuardians.AddRange(guardians);
    await db.SaveChangesAsync();
    logger.LogInformation("Seeded {Count} guardians", guardians.Count);

    // ── 6. Staff (5 teachers) ─────────────────────────────────────────────
    var staffSeed = new[]
    {
        ("EMP001","Ravi","Shankar", "ravi.s@demo.edu",  "+91-9900001001","Mathematics","Teacher","Male",   "2000-07-01"),
        ("EMP002","Suman","Reddy",  "suman.r@demo.edu", "+91-9900001002","English",    "Teacher","Female",  "2002-03-15"),
        ("EMP003","Amit","Kapoor",  "amit.k@demo.edu",  "+91-9900001003","Science",    "Teacher","Male",   "2005-11-20"),
        ("EMP004","Lakshmi","Iyer", "lakshmi.i@demo.edu","+91-9900001004","Social Studies","Teacher","Female","2010-06-01"),
        ("EMP005","Suresh","Nair",  "suresh.n@demo.edu", "+91-9900001005","Hindi",     "Principal","Male", "1995-01-10"),
    };

    var staff = staffSeed.Select(s => new SmsApi.Models.Entities.Staff
    {
        Id = Guid.NewGuid(), SchoolId = schoolId,
        EmployeeId = s.Item1, FirstName = s.Item2, LastName = s.Item3,
        Name = $"{s.Item2} {s.Item3}",
        Email = s.Item4, Phone = s.Item5,
        Department = s.Item6, Designation = s.Item7,
        Gender = s.Item8, DateOfBirth = DateTime.Parse(s.Item9),
        JoiningDate = new DateTime(2023, 6, 1),
        Address = "Staff Quarters, City, State",
        EmploymentType = "permanent",
        Salary = 45000m,
        Status = "active", IsActive = true,
        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsDeleted = false
    }).ToList();

    db.StaffMembers.AddRange(staff);
    await db.SaveChangesAsync();
    logger.LogInformation("Seeded {Count} staff", staff.Count);

    // ── 7. Announcements ─────────────────────────────────────────────────
    var principalStaff = staff.First(s => s.Designation == "Principal");
    var announcements = new[]
    {
        ("School Reopens June 2025",         "School will reopen for the new academic year 2025-26 on 2nd June 2025. All students to report by 8:00 AM in full uniform.",  "High",   "All"),
        ("Annual Sports Day – 15 August",    "Annual Sports Day will be held on 15th August. Students interested in participating should register with their class teacher by 30 July.", "Normal",  "Students"),
        ("Parent-Teacher Meeting – 20 April","Parent-Teacher Meeting is scheduled for 20th April 2026 from 10 AM to 1 PM. Parents of all classes are requested to attend.", "High",   "All"),
    }.Select(a => new SmsApi.Models.Entities.Announcement
    {
        Id = Guid.NewGuid(), SchoolId = schoolId,
        Title = a.Item1, Content = a.Item2,
        Priority = a.Item3, TargetAudience = a.Item4,
        CreatedByStaffId = principalStaff.Id,
        PublishedDate = DateTime.UtcNow.AddDays(-7),
        ExpiryDate = DateTime.UtcNow.AddDays(30),
        IsActive = true, IsPinned = false,
        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
    }).ToList();

    db.Announcements.AddRange(announcements);
    await db.SaveChangesAsync();
    logger.LogInformation("Seeded {Count} announcements", announcements.Count);

    // ── 8. Library Books ──────────────────────────────────────────────────
    var bookSeed = new[]
    {
        ("Mathematics Textbook Grade 5",    "NCERT",       "978-8174504876","Textbook",    "NCERT",           2023, 5),
        ("English Grammar and Composition", "Wren & Martin","978-9352535200","Reference",  "S.Chand",         2020, 3),
        ("Science Explorer Grade 6",        "NCERT",       "978-8174506573","Textbook",    "NCERT",           2022, 4),
        ("India - A History",               "John Keay",   "978-0006387770","Non-Fiction", "HarperCollins",   2010, 2),
        ("Wings of Fire",                   "APJ Abdul Kalam","978-8173711466","Biography","Universities Press",2014,3),
        ("The Jungle Book",                 "Rudyard Kipling","978-0140367225","Fiction",  "Penguin",         1994, 4),
        ("The Discovery of India",          "Jawaharlal Nehru","978-0195623598","Non-Fiction","Oxford UP",    1989, 2),
        ("My Experiments with Truth",       "M.K. Gandhi", "978-0807059098","Biography",  "Beacon Press",    2012, 3),
        ("Computer Fundamentals",           "P.K.Sinha",   "978-8176566123","Reference",  "BPB Publications",2018, 5),
        ("General Knowledge 2025-26",       "Manohar Pandey","978-9389931075","Reference","Arihant",         2024,10),
    };

    var books = bookSeed.Select(b => new SmsApi.Models.Entities.Book
    {
        Id = Guid.NewGuid(), SchoolId = schoolId,
        Title = b.Item1, Author = b.Item2, ISBN = b.Item3,
        Category = b.Item4, Publisher = b.Item5, PublishedYear = b.Item6,
        TotalCopies = b.Item7, AvailableCopies = b.Item7,
        Status = "available",
        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsDeleted = false
    }).ToList();

    db.Books.AddRange(books);
    await db.SaveChangesAsync();
    logger.LogInformation("Seeded {Count} library books", books.Count);
}

static async Task SeedOperationalDataAsync(
    SmsApi.Data.AppDbContext db, Guid schoolId, Microsoft.Extensions.Logging.ILogger logger)
{
    // ── 9. Fee Structures ─────────────────────────────────────────────────
    if (!await db.FeeStructures.AnyAsync(f => f.SchoolId == schoolId))
    {
    var feeStructures = new[]
    {
        ("Primary Fee Structure",     "Class 1",  "2025-26", 12000m, 8000m,  500m, 800m,  500m, 400m, 1800m),
        ("Primary Fee Structure",     "Class 2",  "2025-26", 12000m, 8000m,  500m, 800m,  500m, 400m, 1800m),
        ("Primary Fee Structure",     "Class 3",  "2025-26", 12000m, 8000m,  500m, 800m,  500m, 400m, 1800m),
        ("Middle School Fee",         "Class 6",  "2025-26", 16000m, 11000m, 500m, 1000m, 600m, 500m, 2400m),
        ("Middle School Fee",         "Class 7",  "2025-26", 16000m, 11000m, 500m, 1000m, 600m, 500m, 2400m),
        ("Secondary Fee Structure",   "Class 9",  "2025-26", 20000m, 14000m, 500m, 1200m, 800m, 600m, 2900m),
        ("Secondary Fee Structure",   "Class 10", "2025-26", 20000m, 14000m, 500m, 1200m, 800m, 600m, 2900m),
    }.Select(f => new SmsApi.Models.Entities.FeeStructure
    {
        Id = Guid.NewGuid(), SchoolId = schoolId,
        Name = f.Item1, Class = f.Item2, AcademicYear = f.Item3,
        TotalAmount = f.Item4, TuitionFee = f.Item5, AdmissionFee = f.Item6,
        ExamFee = f.Item7,
        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsDeleted = false
    }).ToList();
        db.FeeStructures.AddRange(feeStructures);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} fee structures", feeStructures.Count);
    }

    // ── 9b. Top-up: Fee Structures for Class 4 and Class 5 ───────────────
    if (!await db.FeeStructures.AnyAsync(f => f.SchoolId == schoolId && f.Class == "Class 4"))
    {
        var missing = new[]
        {
            ("Primary Fee Structure", "Class 4", "2025-26", 12000m, 8000m, 500m, 800m),
            ("Primary Fee Structure", "Class 5", "2025-26", 12000m, 8000m, 500m, 800m),
        }.Select(f => new SmsApi.Models.Entities.FeeStructure
        {
            Id = Guid.NewGuid(), SchoolId = schoolId,
            Name = f.Item1, Class = f.Item2, AcademicYear = f.Item3,
            TotalAmount = f.Item4, TuitionFee = f.Item5, AdmissionFee = f.Item6,
            ExamFee = f.Item7,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsDeleted = false
        }).ToList();
        db.FeeStructures.AddRange(missing);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded missing Class 4/5 fee structures");
    }

    // ── 10. Hostel Rooms ──────────────────────────────────────────────────
    if (!await db.HostelRooms.AnyAsync(r => r.SchoolId == schoolId))
    {
        var hostelRooms = new[]
        {
            ("101", "Boys",  4, 1200m, "Ground"), ("102", "Boys",  4, 1200m, "Ground"),
            ("103", "Boys",  4, 1200m, "Ground"), ("201", "Girls", 4, 1200m, "First"),
            ("202", "Girls", 4, 1200m, "First"),  ("301", "Staff", 2, 800m,  "Second"),
        }.Select(r => new SmsApi.Models.Entities.HostelRoom
        {
            Id = Guid.NewGuid(), SchoolId = schoolId,
            RoomNumber = r.Item1, RoomType = r.Item2,
            Capacity = r.Item3, RentPerBed = r.Item4,
            Floor = r.Item5, Occupied = 0, Status = "available",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsDeleted = false
        }).ToList();
        db.HostelRooms.AddRange(hostelRooms);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} hostel rooms", hostelRooms.Count);
    }

    // ── 11. Transport Routes ──────────────────────────────────────────────
    if (!await db.TransportRoutes.AnyAsync(r => r.SchoolId == schoolId))
    {
        var routes = new[]
        {
            ("Route - North Zone", "RT01", "DL 1CA 1234", "Ramesh Kumar",  "+91-9900002001", "06:45", "07:45", 800m,  30),
            ("Route - East Zone",  "RT02", "DL 1CA 5678", "Sunil Singh",   "+91-9900002002", "07:00", "08:00", 900m,  30),
            ("Route - South Zone", "RT03", "DL 1CA 9101", "Anil Verma",    "+91-9900002003", "06:30", "07:30", 1000m, 40),
            ("Route - West Zone",  "RT04", "DL 1CA 1122", "Deepak Sharma", "+91-9900002004", "07:15", "08:15", 850m,  35),
        }.Select(r => new SmsApi.Models.Entities.TransportRoute
        {
            Id = Guid.NewGuid(), SchoolId = schoolId,
            RouteName = r.Item1, RouteNumber = r.Item2, VehicleNumber = r.Item3,
            DriverName = r.Item4, DriverPhone = r.Item5,
            StartTime = TimeSpan.Parse(r.Item6), EndTime = TimeSpan.Parse(r.Item7),
            Fare = r.Item8, MonthlyFee = r.Item8, Capacity = r.Item9,
            StudentsAssigned = 0, Status = "active",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsDeleted = false
        }).ToList();
        db.TransportRoutes.AddRange(routes);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} transport routes", routes.Count);
    }

    // ── 12. Grade Categories ──────────────────────────────────────────────
    if (!await db.GradeCategories.AnyAsync(g => g.SchoolId == schoolId))
    {
        var gradeCategories = new[]
        {
            ("Formative Assessment", "FA", 40m, "Continuous internal assessment (unit tests, projects, activities)"),
            ("Summative Assessment", "SA", 60m, "Term-end examinations"),
        }.Select(g => new SmsApi.Models.Entities.GradeCategory
        {
            Id = Guid.NewGuid(), SchoolId = schoolId,
            Name = g.Item1, Code = g.Item2, Weightage = g.Item3, Description = g.Item4,
            Status = "active",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsDeleted = false
        }).ToList();
        db.GradeCategories.AddRange(gradeCategories);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} grade categories", gradeCategories.Count);
    }

    // ── 13. Fee Records (one per student based on their class fee structure) ───
    if (!await db.FeeRecords.IgnoreQueryFilters().AnyAsync(f => f.SchoolId == schoolId && !f.IsDeleted))
    {
        var students = await db.Students
            .Where(s => s.SchoolId == schoolId && !s.IsDeleted)
            .ToListAsync();

        var structures = await db.FeeStructures
            .Where(f => f.SchoolId == schoolId && f.AcademicYear == "2025-26" && !f.IsDeleted)
            .ToListAsync();

        // Map class → fee structure (use first match)
        var structureByClass = structures
            .GroupBy(s => s.Class)
            .ToDictionary(g => g.Key, g => g.First());

        var feeRecords = new List<SmsApi.Models.Entities.FeeRecord>();
        var payments = new List<SmsApi.Models.Entities.PaymentTransaction>();

        var rnd = new Random(42);
        foreach (var student in students)
        {
            var classKey = student.Class ?? "Class 1";
            if (!structureByClass.TryGetValue(classKey, out var structure)) continue;

            var totalAmount = structure.TotalAmount;
            // Vary paid amount: paid / partial / pending
            decimal paidAmount = rnd.Next(0, 3) switch
            {
                0 => totalAmount,                       // fully paid
                1 => Math.Round(totalAmount * 0.5m, 2), // half paid
                _ => 0m                                  // unpaid
            };
            var status = paidAmount >= totalAmount ? "paid"
                       : paidAmount > 0 ? "partial"
                       : "pending";

            var feeRecord = new SmsApi.Models.Entities.FeeRecord
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                StudentId = student.Id,
                FeeStructureId = structure.Id,
                DueDate = new DateTime(2025, 6, 30),
                TotalAmount = totalAmount,
                PaidAmount = paidAmount,
                DiscountAmount = 0,
                LateFeeAmount = 0,
                PendingAmount = totalAmount - paidAmount,
                AcademicYear = "2025-26",
                Status = status,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false,
            };
            feeRecords.Add(feeRecord);

            // Add a payment transaction if fee was paid or partially paid
            if (paidAmount > 0)
            {
                feeRecord.LastPaymentDate = new DateTime(2025, 4, rnd.Next(1, 28));
                payments.Add(new SmsApi.Models.Entities.PaymentTransaction
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    StudentId = student.Id,
                    FeeRecordId = feeRecord.Id,
                    Amount = paidAmount,
                    Method = rnd.Next(0, 3) switch { 0 => "cash", 1 => "online", _ => "cheque" },
                    Status = "completed",
                    Date = feeRecord.LastPaymentDate!.Value,
                    ReceiptNumber = $"REC-2025-{rnd.Next(1000, 9999)}",
                    AcademicYear = "2025-26",
                    ProcessedBy = "admin",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false,
                });
            }
        }

        db.FeeRecords.AddRange(feeRecords);
        await db.SaveChangesAsync();
        if (payments.Count > 0)
        {
            db.PaymentTransactions.AddRange(payments);
            await db.SaveChangesAsync();
        }
        logger.LogInformation("Seeded {Count} fee records and {Payments} payments", feeRecords.Count, payments.Count);
    }

    // ── 13b. Top-up: Fee Records for Class 4 and Class 5 ─────────────────
    {
        var class45Students = await db.Students
            .Where(s => s.SchoolId == schoolId && !s.IsDeleted &&
                        (s.Class == "Class 4" || s.Class == "Class 5"))
            .ToListAsync();
        var existingStudentIds = await db.FeeRecords
            .IgnoreQueryFilters()
            .Where(f => f.SchoolId == schoolId && !f.IsDeleted)
            .Select(f => f.StudentId)
            .ToListAsync();
        var missing45 = class45Students
            .Where(s => !existingStudentIds.Contains(s.Id))
            .ToList();
        if (missing45.Count > 0)
        {
            var structures45 = await db.FeeStructures
                .Where(f => f.SchoolId == schoolId && (f.Class == "Class 4" || f.Class == "Class 5") && !f.IsDeleted)
                .ToListAsync();
            var structureByClass45 = structures45.GroupBy(s => s.Class).ToDictionary(g => g.Key, g => g.First());
            var records45 = new List<SmsApi.Models.Entities.FeeRecord>();
            var payments45 = new List<SmsApi.Models.Entities.PaymentTransaction>();
            var rnd45 = new Random(77);
            foreach (var s in missing45)
            {
                if (!structureByClass45.TryGetValue(s.Class ?? "", out var str)) continue;
                var total = str.TotalAmount;
                var paid = rnd45.Next(0, 3) switch { 0 => total, 1 => Math.Round(total * 0.5m, 2), _ => 0m };
                var status = paid >= total ? "paid" : paid > 0 ? "partial" : "pending";
                var rec = new SmsApi.Models.Entities.FeeRecord
                {
                    Id = Guid.NewGuid(), SchoolId = schoolId, StudentId = s.Id, FeeStructureId = str.Id,
                    DueDate = new DateTime(2025, 6, 30), TotalAmount = total, PaidAmount = paid,
                    DiscountAmount = 0, LateFeeAmount = 0, PendingAmount = total - paid,
                    AcademicYear = "2025-26", Status = status,
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsDeleted = false,
                };
                records45.Add(rec);
                if (paid > 0)
                {
                    rec.LastPaymentDate = new DateTime(2025, 4, rnd45.Next(1, 28));
                    payments45.Add(new SmsApi.Models.Entities.PaymentTransaction
                    {
                        Id = Guid.NewGuid(), SchoolId = schoolId, StudentId = s.Id, FeeRecordId = rec.Id,
                        Amount = paid, Method = "online", Status = "completed",
                        Date = rec.LastPaymentDate!.Value,
                        ReceiptNumber = $"REC-2025-{rnd45.Next(1000, 9999)}",
                        AcademicYear = "2025-26", ProcessedBy = "admin",
                        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsDeleted = false,
                    });
                }
            }
            if (records45.Count > 0)
            {
                db.FeeRecords.AddRange(records45);
                await db.SaveChangesAsync();
                if (payments45.Count > 0) { db.PaymentTransactions.AddRange(payments45); await db.SaveChangesAsync(); }
                logger.LogInformation("Seeded {Count} Class 4/5 fee records", records45.Count);
            }
        }
    }

    // ── 14. Exams + Results ───────────────────────────────────────────────
    // Backfill: exams seeded without AcademicYear won't match any year filter — fix them.
    var examsWithNullYear = await db.Examinations
        .Where(e => e.SchoolId == schoolId && e.AcademicYear == null && !e.IsDeleted)
        .ToListAsync();
    if (examsWithNullYear.Count > 0)
    {
        foreach (var ex in examsWithNullYear)
            ex.AcademicYear = "2025-2026";
        await db.SaveChangesAsync();
        logger.LogInformation("Backfilled AcademicYear on {Count} existing exams", examsWithNullYear.Count);
    }

    if (!await db.Examinations.AnyAsync(e => e.SchoolId == schoolId))
    {
        var subjects = new[] { "Mathematics", "English", "Science", "Social Studies", "Hindi" };
        var examDate = new DateTime(2025, 3, 15);
        var exams = new List<SmsApi.Models.Entities.Exam>();

        // Create one exam per subject for Class 1 and Class 5
        foreach (var cls in new[] { "1", "5" })
        {
            foreach (var subject in subjects)
            {
                exams.Add(new SmsApi.Models.Entities.Exam
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    Name = $"Annual Exam 2024-25 - {subject}",
                    Class = cls,
                    Section = "A",
                    Subject = subject,
                    ExamDate = examDate.AddDays(subjects.ToList().IndexOf(subject)),
                    TotalMarks = 100,
                    PassingMarks = 35,
                    AcademicYear = "2025-2026",
                    Description = "Annual examination",
                    Status = "completed",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false,
                });
            }
        }
        db.Examinations.AddRange(exams);
        await db.SaveChangesAsync();

        // Seed results for Class 1 and Class 5 students
        var class1Students = await db.Students
            .Where(s => s.SchoolId == schoolId && s.Class == "Class 1" && !s.IsDeleted)
            .ToListAsync();
        var class5Students = await db.Students
            .Where(s => s.SchoolId == schoolId && s.Class == "Class 5" && !s.IsDeleted)
            .ToListAsync();

        var rnd2 = new Random(99);
        var results = new List<SmsApi.Models.Entities.ExamResult>();
        foreach (var exam in exams)
        {
            var studentList = exam.Class == "1" ? class1Students : class5Students;
            foreach (var student in studentList)
            {
                var marks = rnd2.Next(35, 98);
                var percentage = (decimal)marks;
                var grade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B+" :
                            percentage >= 60 ? "B" : percentage >= 50 ? "C" : percentage >= 35 ? "D" : "F";
                results.Add(new SmsApi.Models.Entities.ExamResult
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    ExamId = exam.Id,
                    StudentId = student.Id,
                    Subject = exam.Subject,
                    MarksObtained = marks,
                    TotalMarks = exam.TotalMarks,
                    Percentage = percentage,
                    Grade = grade,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false,
                });
            }
        }
        db.ExamResults.AddRange(results);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded {Count} exams and {Results} results", exams.Count, results.Count);
    }
}

// ── Test data seeder wrapper (delegates to the rich SeedOperationalData+Academics already in place) ──
static async Task SeedTestDataAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db     = scope.ServiceProvider.GetRequiredService<SmsApi.Data.AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Logging.ILogger<Program>>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    if (config.GetValue<bool>("SkipMigrations", false)) return; // skip in test mode

    var schoolId = Guid.Parse("550E8400-E29B-41D4-A716-446655440000");
    logger.LogInformation("[TestDataSeeder] Starting comprehensive test data seeding for school {SchoolId}", schoolId);

    await SeedAcademicsAndStudentsAsync(db, schoolId, logger);
    await SeedOperationalDataAsync(db, schoolId, logger);

    logger.LogInformation("[TestDataSeeder] Test data seeding complete.");
}

/// <summary>Exposed as a partial class so WebApplicationFactory&lt;Program&gt; can reference it in integration tests.</summary>
public partial class Program { }
