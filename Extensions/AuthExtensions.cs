using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
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
