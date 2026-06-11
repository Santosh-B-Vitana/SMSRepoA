using Microsoft.Extensions.Diagnostics.HealthChecks;
using Asp.Versioning;
using Microsoft.OpenApi.Models;
using SmsApi.Data;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;

namespace SmsApi.Extensions;

/// <summary>
/// Infrastructure wiring: caching, health checks, API versioning, Swagger, controllers.
/// </summary>
public static class InfrastructureExtensions
{
    /// <summary>
    /// Initializes Firebase Admin SDK for FCM push delivery.
    /// Skipped gracefully when credentials are not configured (dev/test environments).
    /// </summary>
    public static IServiceCollection AddFirebaseInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        try
        {
            // Accept service account JSON inline or as a file path
            var serviceAccountJson = configuration["Firebase:ServiceAccountJson"];
            var serviceAccountPath = configuration["Firebase:ServiceAccountPath"];

            if (!string.IsNullOrWhiteSpace(serviceAccountJson))
            {
                FirebaseApp.Create(new AppOptions
                {
                    Credential = GoogleCredential.FromJson(serviceAccountJson)
                });
                Serilog.Log.Information("Firebase Admin SDK initialized from inline JSON");
            }
            else if (!string.IsNullOrWhiteSpace(serviceAccountPath)
                     && System.IO.File.Exists(serviceAccountPath))
            {
                FirebaseApp.Create(new AppOptions
                {
                    Credential = GoogleCredential.FromFile(serviceAccountPath)
                });
                Serilog.Log.Information("Firebase Admin SDK initialized from file: {Path}", serviceAccountPath);
            }
            else
            {
                Serilog.Log.Warning("Firebase credentials not configured — push notifications will be skipped");
            }
        }
        catch (Exception ex)
        {
            // Never prevent app startup due to Firebase configuration issues
            Serilog.Log.Warning(ex, "Firebase Admin SDK initialization failed — push notifications will be skipped");
        }

        return services;
    }

    /// <summary>
    /// Redis (production) or in-memory (dev) distributed cache.
    /// Used by: brute-force lockout, cache-aside queries, session data.
    /// </summary>
    public static IServiceCollection AddCachingInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var redisConnection = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrEmpty(redisConnection))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnection;
                options.InstanceName = configuration.GetValue<string>("Redis:InstanceName") ?? "sms-api:";
            });
            Serilog.Log.Information("Redis distributed cache configured");
        }
        else
        {
            services.AddDistributedMemoryCache();
            Serilog.Log.Information("Using in-memory distributed cache (dev only)");
        }

        return services;
    }

    /// <summary>
    /// Health checks: provider-agnostic DB + Redis (if configured) + self.
    /// Uses EF Core's CanConnectAsync — works with PostgreSQL and SQL Server.
    /// Endpoints: /health, /health/live, /health/ready
    /// Note: Health Checks UI dashboard is disabled on production (unnecessary overhead on IIS).
    /// </summary>
    public static IServiceCollection AddHealthCheckInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var hcBuilder = services.AddHealthChecks()
            .AddDatabaseHealthCheck()   // provider-agnostic via EF Core CanConnectAsync
            .AddCheck("self", () => HealthCheckResult.Healthy("Application is running"),
                tags: new[] { "self", "live" });

        var redisConnection = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrEmpty(redisConnection))
        {
            hcBuilder.AddRedis(
                redisConnection,
                name: "redis",
                failureStatus: HealthStatus.Degraded,
                tags: new[] { "cache", "redis", "ready" });
        }

        // Health Checks UI dashboard — only register in development (overhead on IIS)
        if (environment.IsDevelopment())
        {
            services.AddHealthChecksUI(setup =>
            {
                setup.AddHealthCheckEndpoint("API", "/health");
                setup.SetEvaluationTimeInSeconds(60);
                setup.MaximumHistoryEntriesPerEndpoint(50);
            }).AddInMemoryStorage();
        }

        return services;
    }

    /// <summary>
    /// API versioning (URL param + header, default v1.0) + Swagger with JWT support.
    /// </summary>
    public static IServiceCollection AddApiInfrastructure(this IServiceCollection services)
    {
        services.AddApiVersioning(options =>
        {
            options.DefaultApiVersion = new ApiVersion(1, 0);
            options.AssumeDefaultVersionWhenUnspecified = true;
            options.ReportApiVersions = true;
        });

        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "SMS API",
                Version = "v1",
                Description = "School Management System API — multi-tenant, India-compliant"
            });

            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description = "JWT Authorization. Enter your token (without 'Bearer' prefix).",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT"
            });

            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });

        return services;
    }

    /// <summary>
    /// MVC controllers with camelCase JSON + logging action filter.
    /// Problem details RFC 7807 is included here.
    /// </summary>
    public static IServiceCollection AddControllersInfrastructure(this IServiceCollection services)
    {
        services.AddProblemDetails();

        services.AddControllers(options =>
        {
            options.Filters.Add<SmsApi.Middleware.LoggingActionFilter>();
        })
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy =
                System.Text.Json.JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.DictionaryKeyPolicy =
                System.Text.Json.JsonNamingPolicy.CamelCase;
        });

        return services;
    }
}
