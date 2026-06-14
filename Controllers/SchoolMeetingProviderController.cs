using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmsApi.Data;
using SmsApi.Models.Entities;
using SmsApi.Services;

namespace SmsApi.Controllers
{
    /// <summary>
    /// Manages per-school meeting provider configuration.
    /// Accessible to SuperAdmin (cross-school) and Admin/Principal (own school).
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/school-config/meeting-provider")]
    public class SchoolMeetingProviderController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ITenantContext _tenant;
        private readonly IDataProtector _protector;
        private readonly ILogger<SchoolMeetingProviderController> _logger;

        public SchoolMeetingProviderController(
            AppDbContext db,
            ITenantContext tenant,
            IDataProtectionProvider dataProtectionProvider,
            ILogger<SchoolMeetingProviderController> logger)
        {
            _db = db;
            _tenant = tenant;
            _protector = dataProtectionProvider.CreateProtector("SchoolMeetingProviderConfig");
            _logger = logger;
        }

        // ── GET /api/school-config/meeting-provider ──────────────────────────
        [HttpGet]
        [Authorize(Roles = "Admin,Principal,SuperAdmin")]
        public async Task<IActionResult> GetConfig()
        {
            var schoolId = _tenant.GetEffectiveSchoolId();
            var cfg = await _db.SchoolMeetingProviderConfigs
                .FirstOrDefaultAsync(c => c.SchoolId == schoolId);

            if (cfg is null)
                return Ok(new { defaultProvider = "LiveKit", useSharedVitanaAccount = true });

            return Ok(new
            {
                defaultProvider = cfg.DefaultProvider.ToString(),
                useSharedVitanaAccount = cfg.UseSharedVitanaAccount,
                liveKitServerUrl = cfg.LiveKitServerUrl,
                liveKitApiKey = cfg.LiveKitApiKey,
                // Never expose secrets — return masked value
                liveKitApiSecretSet = !string.IsNullOrEmpty(cfg.LiveKitApiSecretProtected),
                zoomAccountId = cfg.ZoomAccountId,
                zoomClientId = cfg.ZoomClientId,
                zoomClientSecretSet = !string.IsNullOrEmpty(cfg.ZoomClientSecretProtected),
            });
        }

        // ── POST /api/school-config/meeting-provider ─────────────────────────
        [HttpPost]
        [Authorize(Roles = "Admin,Principal,SuperAdmin")]
        public async Task<IActionResult> SaveConfig([FromBody] SaveMeetingProviderRequest request)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();

            var cfg = await _db.SchoolMeetingProviderConfigs
                .FirstOrDefaultAsync(c => c.SchoolId == schoolId);

            if (cfg is null)
            {
                cfg = new SchoolMeetingProviderConfig { SchoolId = schoolId };
                _db.SchoolMeetingProviderConfigs.Add(cfg);
            }

            if (Enum.TryParse<MeetingProvider>(request.DefaultProvider, out var provider))
                cfg.DefaultProvider = provider;

            cfg.UseSharedVitanaAccount = request.UseSharedVitanaAccount;

            if (!string.IsNullOrEmpty(request.LiveKitServerUrl))
                cfg.LiveKitServerUrl = request.LiveKitServerUrl;

            if (!string.IsNullOrEmpty(request.LiveKitApiKey))
                cfg.LiveKitApiKey = request.LiveKitApiKey;

            if (!string.IsNullOrEmpty(request.LiveKitApiSecret))
                cfg.LiveKitApiSecretProtected = _protector.Protect(request.LiveKitApiSecret);

            if (!string.IsNullOrEmpty(request.ZoomAccountId))
                cfg.ZoomAccountId = request.ZoomAccountId;

            if (!string.IsNullOrEmpty(request.ZoomClientId))
                cfg.ZoomClientId = request.ZoomClientId;

            if (!string.IsNullOrEmpty(request.ZoomClientSecret))
                cfg.ZoomClientSecretProtected = _protector.Protect(request.ZoomClientSecret);

            await _db.SaveChangesAsync();

            _logger.LogInformation(
                "Meeting provider config updated for school {SchoolId} to {Provider}",
                schoolId, cfg.DefaultProvider);

            return Ok(new { message = "Meeting provider configuration saved successfully." });
        }

        // ── POST /api/school-config/meeting-provider/enable ──────────────────
        [HttpPost("enable")]
        [Authorize(Roles = "SuperAdmin,Admin,Principal")]
        public async Task<IActionResult> EnableOnlineClasses([FromBody] EnableOnlineClassesRequest request)
        {
            var schoolId = _tenant.GetEffectiveSchoolId();

            // Toggle the school_feature_permission for online_classes
            var perm = await _db.SchoolFeaturePermissions
                .FirstOrDefaultAsync(p => p.SchoolId == schoolId && p.ModuleName == "online_classes");

            if (perm is null)
            {
                perm = new SchoolFeaturePermission
                {
                    SchoolId = schoolId,
                    ModuleName = "online_classes",
                    IsEnabled = request.Enabled,
                };
                _db.SchoolFeaturePermissions.Add(perm);
            }
            else
            {
                perm.IsEnabled = request.Enabled;
            }

            await _db.SaveChangesAsync();

            return Ok(new { message = $"Online classes module {(request.Enabled ? "enabled" : "disabled")} for school." });
        }
    }

    public class SaveMeetingProviderRequest
    {
        public string DefaultProvider { get; set; } = "LiveKit";
        public bool UseSharedVitanaAccount { get; set; } = true;
        public string? LiveKitServerUrl { get; set; }
        public string? LiveKitApiKey { get; set; }
        public string? LiveKitApiSecret { get; set; }
        public string? ZoomAccountId { get; set; }
        public string? ZoomClientId { get; set; }
        public string? ZoomClientSecret { get; set; }
    }

    public class EnableOnlineClassesRequest
    {
        public bool Enabled { get; set; }
    }
}
