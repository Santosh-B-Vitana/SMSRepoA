using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace SmsApi.Infrastructure.TenantConfig
{
    /// <summary>
    /// Reads tenant-configs.json once at startup and serves per-branch, per-ecosystem
    /// channel configs from IMemoryCache. All lookups apply the UseSchoolDefaults fallback.
    /// Singleton lifetime — the JSON tree is immutable at runtime.
    /// Swap this class for a DbContext-backed implementation when the DB schema is ready.
    /// </summary>
    public sealed class SchoolBranchConfigResolver : ISchoolBranchConfigResolver
    {
        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(30);

        private readonly TenantConfigRoot _root;
        private readonly IMemoryCache _cache;
        private readonly ILogger<SchoolBranchConfigResolver> _logger;

        public SchoolBranchConfigResolver(
            IWebHostEnvironment env,
            IMemoryCache cache,
            ILogger<SchoolBranchConfigResolver> logger)
        {
            _cache  = cache;
            _logger = logger;
            _root   = LoadConfig(env.ContentRootPath);
        }

        // ── Ecosystem A ──────────────────────────────────────────────────────

        public Task<SmsChannelConfig?> GetSmsConfigAsync(Guid schoolId, Guid branchId,
            CancellationToken ct = default)
            => Task.FromResult(Resolve(schoolId, branchId, "ecosA:sms",
                b => b.Sms, d => d.Sms));

        public Task<EmailChannelConfig?> GetEmailConfigAsync(Guid schoolId, Guid branchId,
            CancellationToken ct = default)
            => Task.FromResult(Resolve(schoolId, branchId, "ecosA:email",
                b => b.Email, d => d.Email));

        public Task<WhatsAppChannelConfig?> GetWhatsAppConfigAsync(Guid schoolId, Guid branchId,
            CancellationToken ct = default)
            => Task.FromResult(Resolve(schoolId, branchId, "ecosA:whatsapp",
                b => b.WhatsApp, d => d.WhatsApp));

        // ── Ecosystem B (MSG91) ──────────────────────────────────────────────

        public Task<Msg91SmsConfig?> GetMsg91SmsConfigAsync(Guid schoolId, Guid branchId,
            CancellationToken ct = default)
            => Task.FromResult(Resolve(schoolId, branchId, "ecosB:sms",
                b => b.Msg91Sms, d => d.Msg91Sms));

        public Task<Msg91WhatsAppConfig?> GetMsg91WhatsAppConfigAsync(Guid schoolId, Guid branchId,
            CancellationToken ct = default)
            => Task.FromResult(Resolve(schoolId, branchId, "ecosB:whatsapp",
                b => b.Msg91WhatsApp, d => d.Msg91WhatsApp));

        public Task<Msg91EmailConfig?> GetMsg91EmailConfigAsync(Guid schoolId, Guid branchId,
            CancellationToken ct = default)
            => Task.FromResult(Resolve(schoolId, branchId, "ecosB:email",
                b => b.Msg91Email, d => d.Msg91Email));

        // ── Resolution core ──────────────────────────────────────────────────

        private T? Resolve<T>(
            Guid schoolId, Guid branchId, string cacheChannel,
            Func<BranchTenantConfig, T?> branchSelector,
            Func<BranchChannelDefaults, T?> defaultSelector) where T : class
        {
            var key = $"cfg:{schoolId}:{branchId}:{cacheChannel}";

            return _cache.GetOrCreate(key, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CacheTtl;

                var school = _root.Schools.FirstOrDefault(s => s.SchoolId == schoolId);
                if (school is null)
                {
                    _logger.LogWarning("No tenant config for school {SchoolId}", schoolId);
                    return null;
                }

                // Guid.Empty → caller wants school-level defaults directly
                if (branchId == Guid.Empty)
                    return defaultSelector(school.Defaults);

                var branch = school.Branches.FirstOrDefault(b => b.BranchId == branchId);
                if (branch is null)
                {
                    _logger.LogWarning(
                        "Branch {BranchId} not found in school {SchoolId} — falling back to school defaults",
                        branchId, schoolId);
                    return defaultSelector(school.Defaults);
                }

                if (branch.UseSchoolDefaults)
                    return defaultSelector(school.Defaults);

                var branchCfg = branchSelector(branch);
                if (branchCfg is not null)
                    return branchCfg;

                // Channel not configured at branch level — fall back silently
                _logger.LogDebug(
                    "{Channel} not configured for branch {BranchId} — using school defaults",
                    cacheChannel, branchId);
                return defaultSelector(school.Defaults);
            });
        }

        // ── File loading ─────────────────────────────────────────────────────

        private TenantConfigRoot LoadConfig(string contentRootPath)
        {
            var path = Path.Combine(contentRootPath, "tenant-configs.json");

            if (!File.Exists(path))
            {
                _logger.LogWarning(
                    "tenant-configs.json not found at {Path}. " +
                    "All channel sends will fail config resolution.", path);
                return new TenantConfigRoot();
            }

            try
            {
                var json = File.ReadAllText(path);
                var opts = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    ReadCommentHandling = JsonCommentHandling.Skip
                };
                var root = JsonSerializer.Deserialize<TenantConfigRoot>(json, opts);
                _logger.LogInformation(
                    "tenant-configs.json loaded — {Count} school(s)", root?.Schools.Count ?? 0);
                return root ?? new TenantConfigRoot();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to parse tenant-configs.json — no outbound messages can be sent.");
                return new TenantConfigRoot();
            }
        }
    }
}
