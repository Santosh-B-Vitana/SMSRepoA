using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.DTOs;
using SmsApi.Models.Entities;

namespace SmsApi.Services
{
    public interface IMobileAppConfigService
    {
        /// <summary>
        /// Returns the full app configuration for a school+user combination.
        /// Cached in Redis for 5 minutes per schoolId+userId.
        /// </summary>
        Task<AppConfigResponse> GetAppConfigAsync(Guid schoolId, Guid userId, string role, string academicYear);

        /// <summary>
        /// Returns the merged branding response for GET /api/mobile/branding.
        /// Merges MobileAppBranding overrides over SchoolSettings base values.
        /// </summary>
        Task<BrandingResponse> GetMobileBrandingAsync(Guid schoolId);

        /// <summary>
        /// Upserts the MobileAppBranding row for a school.
        /// Called by PUT /api/mobile/branding (Admin/Principal only).
        /// </summary>
        Task UpdateMobileBrandingAsync(Guid schoolId, UpdateBrandingRequest request, Guid updatedBy);
    }

    public class MobileAppConfigService : IMobileAppConfigService
    {
        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

        private readonly AppDbContext _db;
        private readonly ICacheService _cache;
        private readonly ILogger<MobileAppConfigService> _logger;

        public MobileAppConfigService(
            AppDbContext db,
            ICacheService cache,
            ILogger<MobileAppConfigService> logger)
        {
            _db = db;
            _cache = cache;
            _logger = logger;
        }

        public async Task<AppConfigResponse> GetAppConfigAsync(
            Guid schoolId, Guid userId, string role, string academicYear)
        {
            var cacheKey = $"mobile:app-config:{schoolId}:{userId}";
            return await _cache.GetOrSetAsync(
                cacheKey,
                () => BuildConfigAsync(schoolId, userId, role, academicYear),
                CacheTtl) ?? await BuildConfigAsync(schoolId, userId, role, academicYear);
        }

        private async Task<AppConfigResponse> BuildConfigAsync(
            Guid schoolId, Guid userId, string role, string academicYear)
        {
            var school = await _db.Schools
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == schoolId);

            var settings = await _db.SchoolSettings
                .AsNoTracking()
                .Where(s => s.SchoolId == schoolId && s.Category == "Branding")
                .ToListAsync();

            var modules = await _db.SchoolFeaturePermissions
                .AsNoTracking()
                .Where(p => p.SchoolId == schoolId)
                .ToListAsync();

            var mobileFlags = await _db.MobileFeatureFlags
                .AsNoTracking()
                .Where(f => f.SchoolId == schoolId)
                .ToListAsync();

            var versionConfig = await _db.MobileAppConfigurations
                .AsNoTracking()
                .Where(c => c.SchoolId == schoolId && c.IsActive)
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync();

            return new AppConfigResponse
            {
                SchoolId = schoolId,
                AcademicYear = academicYear,
                Branding = BuildBranding(school, settings),
                Modules = BuildModules(modules),
                MobileFeatures = BuildMobileFeatures(mobileFlags),
                RolePermissions = BuildRolePermissions(role),
                RemoteConfig = new RemoteConfigDto(),
                VersionRequirements = BuildVersionRequirements(versionConfig)
            };
        }

        private static AppBrandingDto BuildBranding(School? school, List<SchoolSettings> settings)
        {
            static string? Setting(List<SchoolSettings> s, string key) =>
                s.FirstOrDefault(x => x.SettingKey == key)?.SettingValue;

            return new AppBrandingDto
            {
                SchoolName = school?.Name ?? string.Empty,
                LogoUrl = Setting(settings, "LogoUrl") ?? school?.Logo,
                PrimaryColor = Setting(settings, "PrimaryColor"),
                AccentColor = Setting(settings, "AccentColor"),
                SplashScreenUrl = Setting(settings, "SplashScreenUrl"),
                AppIconUrl = Setting(settings, "AppIconUrl")
            };
        }

        private static Dictionary<string, bool> BuildModules(List<SchoolFeaturePermission> permissions)
        {
            var map = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
            foreach (var p in permissions)
            {
                if (!string.IsNullOrWhiteSpace(p.ModuleName))
                    map[p.ModuleName.ToLowerInvariant()] = p.IsEnabled;
            }
            return map;
        }

        private static Dictionary<string, bool> BuildMobileFeatures(List<MobileFeatureFlag> flags)
        {
            var map = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
            foreach (var f in flags)
                map[f.FlagKey] = f.IsEnabled;

            // Sensible defaults for flags not yet configured for the school
            map.TryAdd("mobile.attendance.offline", true);
            map.TryAdd("mobile.attendance.biometric", false);
            map.TryAdd("mobile.fees.online_payment", true);
            map.TryAdd("mobile.fees.wallet", false);
            map.TryAdd("mobile.exams.online_exam_portal", false);
            map.TryAdd("mobile.parent.multi_child", true);

            // Online Classes module flags (default: enabled for teacher/student, parent view off)
            map.TryAdd("mobile.online_classes.instant_class", true);
            map.TryAdd("mobile.online_classes.recordings", true);
            map.TryAdd("mobile.online_classes.attendance_auto", false);
            map.TryAdd("mobile.online_classes.parent_view", false);

            return map;
        }

        private static RolePermissionsDto BuildRolePermissions(string role) =>
            role.ToLowerInvariant() switch
            {
                "teacher" => new RolePermissionsDto
                {
                    CanMarkAttendance = true,
                    CanEnterMarks = true,
                    CanViewFinance = false,
                    CanApproveLeave = true,
                    CanManageAnnouncements = true,
                    CanViewStudentProfiles = true,
                    CanInitiatePayments = false
                },
                "parent" => new RolePermissionsDto
                {
                    CanMarkAttendance = false,
                    CanEnterMarks = false,
                    CanViewFinance = true,
                    CanApproveLeave = false,
                    CanManageAnnouncements = false,
                    CanViewStudentProfiles = true,
                    CanInitiatePayments = true
                },
                "student" => new RolePermissionsDto
                {
                    CanMarkAttendance = false,
                    CanEnterMarks = false,
                    CanViewFinance = true,
                    CanApproveLeave = false,
                    CanManageAnnouncements = false,
                    CanViewStudentProfiles = false,
                    CanInitiatePayments = true
                },
                "admin" or "principal" => new RolePermissionsDto
                {
                    CanMarkAttendance = true,
                    CanEnterMarks = true,
                    CanViewFinance = true,
                    CanApproveLeave = true,
                    CanManageAnnouncements = true,
                    CanViewStudentProfiles = true,
                    CanInitiatePayments = true
                },
                _ => new RolePermissionsDto()
            };

        private static VersionRequirementsDto BuildVersionRequirements(MobileAppConfiguration? config) =>
            config == null
                ? new VersionRequirementsDto()
                : new VersionRequirementsDto
                {
                    MinVersion = config.MinVersion,
                    RecommendedVersion = config.RecommendedVersion,
                    ForceUpdateVersion = config.ForceUpdateVersion,
                    MaintenanceMode = config.MaintenanceMode,
                    MaintenanceMessage = config.MaintenanceMessage
                };

        // ── Branding ─────────────────────────────────────────────────────────

        public async Task<BrandingResponse> GetMobileBrandingAsync(Guid schoolId)
        {
            var school = await _db.Schools
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == schoolId);

            var settings = await _db.SchoolSettings
                .AsNoTracking()
                .Where(s => s.SchoolId == schoolId && s.Category == "Branding")
                .ToListAsync();

            var branding = await _db.MobileAppBrandings
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.SchoolId == schoolId);

            static string? Setting(List<SchoolSettings> s, string key) =>
                s.FirstOrDefault(x => x.SettingKey == key)?.SettingValue;

            return new BrandingResponse
            {
                SchoolName = school?.Name ?? string.Empty,
                LogoUrl = Setting(settings, "LogoUrl") ?? school?.Logo,
                // Override chain: MobileAppBranding → SchoolSettings → hardcoded default
                PrimaryColor = branding?.PrimaryColor ?? Setting(settings, "PrimaryColor") ?? "#1a6fd8",
                AccentColor = branding?.AccentColor ?? Setting(settings, "AccentColor") ?? "#17a2b8",
                AppIconUrl = branding?.AppIconUrl ?? Setting(settings, "AppIconUrl"),
                SplashScreenUrl = branding?.SplashScreenUrl ?? Setting(settings, "SplashScreenUrl"),
                Fonts = new BrandingFontsDto
                {
                    Heading = branding?.FontHeading ?? "Poppins",
                    Body = branding?.FontBody ?? "Inter",
                },
                StoreShortDescription = branding?.StoreShortDescription,
                UpdatedAt = branding?.UpdatedAt,
            };
        }

        public async Task UpdateMobileBrandingAsync(
            Guid schoolId, UpdateBrandingRequest request, Guid updatedBy)
        {
            var existing = await _db.MobileAppBrandings
                .FirstOrDefaultAsync(b => b.SchoolId == schoolId);

            if (existing == null)
            {
                existing = new MobileAppBranding
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                };
                _db.MobileAppBrandings.Add(existing);
            }

            if (request.AppName != null) existing.AppName = request.AppName;
            if (request.PrimaryColor != null) existing.PrimaryColor = request.PrimaryColor;
            if (request.AccentColor != null) existing.AccentColor = request.AccentColor;
            if (request.AppIconUrl != null) existing.AppIconUrl = request.AppIconUrl;
            if (request.SplashScreenUrl != null) existing.SplashScreenUrl = request.SplashScreenUrl;
            if (request.FontHeading != null) existing.FontHeading = request.FontHeading;
            if (request.FontBody != null) existing.FontBody = request.FontBody;
            if (request.StoreShortDescription != null) existing.StoreShortDescription = request.StoreShortDescription;

            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = updatedBy;

            await _db.SaveChangesAsync();

            // Note: per-user app-config cache keys are not bust here because ICacheService
            // does not support prefix-based removal. Updated colors propagate within the
            // 5-minute cache TTL defined in GetAppConfigAsync.
        }
    }
}
