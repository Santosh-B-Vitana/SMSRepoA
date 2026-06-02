using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SmsApi.Data;
using System.Security.Claims;
using System.Text;

namespace SmsApi.Extensions;

/// <summary>
/// JWT authentication, CORS, and authorization policy registrations.
/// </summary>
public static class AuthExtensions
{
    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var jwtSettings = configuration.GetSection("JwtSettings");
        var secret = configuration["JwtSettings:Secret"]
            ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
            ?? throw new InvalidOperationException(
                "JWT Secret not configured. Set environment variable JWT_SECRET_KEY " +
                "or add JwtSettings:Secret to appsettings.Development.json.");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings.GetValue<string>("Issuer"),
                ValidAudience = jwtSettings.GetValue<string>("Audience"),
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                ClockSkew = TimeSpan.Zero // No tolerance — honour expiry exactly
            };

            options.Events = new JwtBearerEvents
            {
                // Reject any request whose account has been deactivated or suspended,
                // even if the JWT itself is still within its expiry window.
                OnTokenValidated = async context =>
                {
                    var userIdClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    if (!Guid.TryParse(userIdClaim, out var userId)) return;

                    var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();

                    var login = await db.UserLogins
                        .Where(u => u.Id == userId && !u.IsDeleted)
                        .Select(u => new { u.Status, u.LinkedEntityId, u.LinkedEntityType, u.Role, u.SchoolId, u.Email })
                        .FirstOrDefaultAsync();

                    if (login == null || login.Status is "inactive" or "suspended")
                    {
                        context.Fail("Account is inactive or suspended.");
                        return;
                    }

                    // Billing policy for school admin sessions:
                    // - Inactive/Suspended billing blocks access.
                    // - Expired beyond 14 days grace auto-transitions to Suspended and blocks access.
                    var normalizedRole = login.Role?.Trim().ToLowerInvariant();
                    var isAdminRole = normalizedRole is "admin" or "administrator" or "schooladmin" or "school_admin" or "school admin";
                    if (isAdminRole && login.SchoolId != Guid.Empty)
                    {
                        var school = await db.Schools
                            .IgnoreQueryFilters()
                            .FirstOrDefaultAsync(s => s.Id == login.SchoolId && !s.IsDeleted);

                        if (school == null)
                        {
                            context.Fail("School account not found.");
                            return;
                        }

                        if (!school.IsActive)
                        {
                            context.Fail("School account is inactive.");
                            return;
                        }

                        var billingStatus = (school.BillingStatus ?? "Active").Trim().ToLowerInvariant();
                        var nowUtc = DateTime.UtcNow;

                        if (school.BillingExpiryDate.HasValue)
                        {
                            var graceCutoff = school.BillingExpiryDate.Value.Date.AddDays(14);
                            if (nowUtc.Date > graceCutoff)
                            {
                                if (billingStatus is not "inactive" and not "suspended")
                                {
                                    school.BillingStatus = "Suspended";
                                    school.UpdatedAt = nowUtc;
                                    await db.SaveChangesAsync();
                                    billingStatus = "suspended";
                                }

                                context.Fail("Subscription expired beyond grace period.");
                                return;
                            }
                        }

                        if (billingStatus is "inactive" or "suspended")
                        {
                            context.Fail("School subscription is inactive or suspended.");
                            return;
                        }
                    }

                    // For staff/teacher roles: also verify the linked StaffMember is still active.
                    // This blocks existing sessions immediately when a staff member is deactivated,
                    // even if the UserLogin.Status has not yet been updated.
                    var isStaffRole =
                        string.Equals(login.LinkedEntityType, "staff", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(login.Role, "staff", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(login.Role, "teacher", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(login.Role, "principal", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(login.Role, "hrmanager", StringComparison.OrdinalIgnoreCase);

                    if (isStaffRole)
                    {
                        string? staffStatus = null;

                        if (login.LinkedEntityId.HasValue)
                        {
                            staffStatus = await db.StaffMembers
                                .IgnoreQueryFilters()
                                .Where(s => s.Id == login.LinkedEntityId.Value && s.SchoolId == login.SchoolId)
                                .Select(s => (string?)s.Status)
                                .FirstOrDefaultAsync();
                        }

                        if (staffStatus == null && !string.IsNullOrEmpty(login.Email))
                        {
                            staffStatus = await db.StaffMembers
                                .IgnoreQueryFilters()
                                .Where(s => s.Email.ToLower() == login.Email.ToLower() && s.SchoolId == login.SchoolId)
                                .Select(s => (string?)s.Status)
                                .FirstOrDefaultAsync();
                        }

                        if (staffStatus == "inactive")
                            context.Fail("Account is inactive. Contact your administrator.");
                    }
                },
                OnAuthenticationFailed = context =>
                {
                    if (context.Exception is SecurityTokenExpiredException)
                        context.Response.Headers["Token-Expired"] = "true";
                    return Task.CompletedTask;
                }
            };
        });

        // SuperAdmin claims transformer: grants all school-level roles to SuperAdmin
        // so that [Authorize(Roles = "Admin,Principal,...")] checks pass everywhere.
        services.AddSingleton<Microsoft.AspNetCore.Authentication.IClaimsTransformation,
            SmsApi.Services.SuperAdminClaimsTransformer>();

        return services;
    }

    public static IServiceCollection AddAuthorizationPolicies(
        this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy("SchoolAccess", policy => policy.RequireClaim("SchoolId"));
            options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin", "SuperAdmin"));
            options.AddPolicy("TeacherOrAdmin", policy =>
                policy.RequireRole("Teacher", "Admin", "SuperAdmin"));
        });

        return services;
    }

    public static IServiceCollection AddApplicationCors(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("AllowSpecificOrigins", policy =>
            {
                var configured = configuration
                    .GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
                var fallback = configuration
                    .GetSection("Cors:FallbackOrigins").Get<string[]>() ?? Array.Empty<string>();

                var valid = configured
                    .Where(o => !string.IsNullOrWhiteSpace(o) && !o.StartsWith("${"))
                    .ToArray();

                var origins = valid.Length > 0 ? valid : fallback;

                if (origins.Length > 0)
                {
                    policy.WithOrigins(origins)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials()
                          .WithExposedHeaders("Token-Expired", "Content-Disposition", "X-Pagination");
                }
                else
                {
                    policy.SetIsOriginAllowed(_ => true)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials()
                          .WithExposedHeaders("Token-Expired", "Content-Disposition", "X-Pagination");
                }
            });

            options.AddPolicy("AllowAll", policy =>
            {
                policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
            });
        });

        return services;
    }
}
