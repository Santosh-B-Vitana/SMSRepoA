using FluentValidation;
using MediatR;
using SmsApi.Application.Common.Behaviors;
using SmsApi.Infrastructure.Resilience;
using SmsApi.Services;
using SmsApi.Services.Cashfree;

namespace SmsApi.Extensions;

/// <summary>
/// All business service DI registrations extracted from Program.cs.
/// Add new services here rather than directly in Program.cs.
/// </summary>
public static class ApplicationServicesExtensions
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        // ── Multi-tenancy ──────────────────────────────────────────────────
        services.AddHttpContextAccessor();
        services.AddScoped<ITenantContext, TenantContextAccessor>();

        // ── Core auth / token services ─────────────────────────────────────
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IReceiptService, ReceiptService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        services.AddScoped<ITwoFactorService, TwoFactorService>();
        services.AddScoped<IResourceAuthorizationService, ResourceAuthorizationService>();

        // ── Resilience (Polly) ─────────────────────────────────────────────
        services.AddResiliencePatterns();

        // ── Academic core ──────────────────────────────────────────────────
        services.AddScoped<IStudentService, StudentService>();
        services.AddScoped<V1MigrationService>();
        services.AddScoped<IStaffService, StaffService>();
        services.AddScoped<IAttendanceService, AttendanceService>();
        services.AddScoped<IExaminationService, ExaminationService>();
        services.AddScoped<IExaminationReportService, ExaminationReportService>();
        services.AddScoped<IAcademicsService, AcademicsService>();
        services.AddScoped<IAcademicYearContextService, AcademicYearContextService>();
        services.AddScoped<IBoardConfigurationService, BoardConfigurationService>();
        services.AddScoped<ITimetableService, TimetableService>();
        services.AddScoped<IHolidayService, HolidayService>();
        services.AddScoped<IAssignmentService, AssignmentService>();
        services.AddScoped<IGradeService, GradeService>();

        // ── Fees & finance ─────────────────────────────────────────────────
        services.AddScoped<IFeeService, FeeService>();
        services.AddScoped<IFeeCalculationEngine, FeeCalculationEngine>();
        services.AddScoped<IFeeConcessionService, FeeConcessionService>();
        services.AddScoped<IFinanceService, FinanceService>();

        // ── Admissions ─────────────────────────────────────────────────────
        services.AddScoped<IAdmissionService, AdmissionService>();

        // ── Campus modules ─────────────────────────────────────────────────
        services.AddScoped<ILibraryService, LibraryService>();
        services.AddScoped<ITransportService, TransportService>();
        services.AddScoped<IHostelService, HostelService>();
        services.AddScoped<IHealthService, HealthService>();
        services.AddScoped<IPayrollService, PayrollService>();

        // ── Communication & notifications ──────────────────────────────────
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IAnnouncementService, AnnouncementService>();
        services.AddScoped<ICommunicationService, CommunicationService>();

        // ── Outbound channel messaging (MSG91: SMS + WhatsApp + Email) ───────
        services.AddNotificationServices(environment);

        // ── Documents (chain-of-responsibility access policies) ────────────
        services.AddScoped<IDocumentService, DocumentService>();
        services.AddScoped<IDocumentAccessPolicyService, DocumentAccessPolicyService>();
        services.AddScoped<IDocumentAccessPolicy, PublicDocumentAccessPolicy>();
        services.AddScoped<IDocumentAccessPolicy, SuperAdminDocumentAccessPolicy>();
        services.AddScoped<IDocumentAccessPolicy, AdminDocumentAccessPolicy>();
        services.AddScoped<IDocumentAccessPolicy, UploaderDocumentAccessPolicy>();
        services.AddScoped<IDocumentAccessPolicy, StaffDocumentAccessPolicy>();
        services.AddScoped<IDocumentAccessPolicy, ClassDocumentAccessPolicy>();
        services.AddScoped<IDocumentAccessPolicy, SectionDocumentAccessPolicy>();
        services.AddScoped<IDocumentAccessPolicy, DefaultDocumentAccessPolicy>();

        // ── Reporting & analytics ──────────────────────────────────────────
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();
        services.AddScoped<ICertificateService, CertificateService>();

        // ── Extended features ──────────────────────────────────────────────
        services.AddScoped<IStoreService, StoreService>();
        services.AddScoped<ISchoolConnectService, SchoolConnectService>();
        services.AddScoped<ILeaveManagementService, LeaveManagementService>();
        services.AddScoped<IVisitorManagementService, VisitorManagementService>();
        services.AddScoped<IVisitorService, VisitorService>();
        services.AddScoped<IAlumniService, AlumniService>();

        // ── Settings & compliance ──────────────────────────────────────────
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<IPermissionsService, PermissionsService>();
        services.AddScoped<ISchoolFeaturePermissionService, SchoolFeaturePermissionService>();

        // ── Payments (Cashfree India) ──────────────────────────────────────
        services.AddHttpClient("Cashfree");
        services.AddScoped<ICashfreeClient, CashfreeClient>();
        services.AddScoped<IPaymentGatewayService, PaymentGatewayService>();

        // ── India-specific compliance ──────────────────────────────────────
        services.AddScoped<IPFESIManagementService, PFESIManagementService>();
        services.AddScoped<IOfflineAttendanceService, OfflineAttendanceService>();

        // ── Security & validation ──────────────────────────────────────────
        services.AddScoped<IFileValidationService, FileValidationService>();
        services.AddScoped<IPaymentValidationService, PaymentValidationService>();
        services.AddScoped<IHtmlSanitizer, HtmlSanitizationService>();

        // ── Redis-backed brute-force protection ────────────────────────────
        services.AddScoped<ILoginAttemptService, RedisLoginAttemptService>();

        // ── Cache service abstraction ──────────────────────────────────────
        services.AddScoped<ICacheService, RedisCacheService>();

        // ── File storage (S3 in prod, local in dev) ────────────────────────
        services.AddFileStorage(configuration);

        // ── Database seeder ────────────────────────────────────────────────
        services.AddScoped<IDbSeeder, DbSeeder>();

        // ── FluentValidation (all validators from this assembly) ───────────
        services.AddValidatorsFromAssemblyContaining<Program>();

        // ── Hybrid CQRS with MediatR + validation pipeline ─────────────────
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        // ── Performance monitoring helper ──────────────────────────────────
        services.AddScoped<SmsApi.Infrastructure.Performance.CachingStrategy>();

        return services;
    }

    private static IServiceCollection AddFileStorage(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<SmsApi.Models.AwsSettings>(configuration.GetSection("Aws"));
        var awsConfig = configuration.GetSection("Aws").Get<SmsApi.Models.AwsSettings>();

        if (awsConfig != null && !string.IsNullOrEmpty(awsConfig.BucketName)
            && !string.IsNullOrEmpty(awsConfig.AccessKey))
        {
            var s3Config = new Amazon.S3.AmazonS3Config
            {
                RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(awsConfig.Region)
            };
            if (!string.IsNullOrEmpty(awsConfig.ServiceUrl))
            {
                s3Config.ServiceURL = awsConfig.ServiceUrl;
                s3Config.ForcePathStyle = awsConfig.ForcePathStyle;
            }
            var s3Creds = new Amazon.Runtime.BasicAWSCredentials(awsConfig.AccessKey, awsConfig.SecretKey);
            services.AddSingleton<Amazon.S3.IAmazonS3>(new Amazon.S3.AmazonS3Client(s3Creds, s3Config));
            services.AddScoped<IFileStorageService, S3FileStorageService>();
            Serilog.Log.Information("S3 file storage configured (bucket: {Bucket}, region: {Region})",
                awsConfig.BucketName, awsConfig.Region);
        }
        else
        {
            services.AddScoped<IFileStorageService, LocalFileStorageService>();
            Serilog.Log.Information("Using local file storage");
        }

        return services;
    }
}
