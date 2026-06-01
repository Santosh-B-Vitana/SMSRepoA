namespace SmsApi.Infrastructure.TenantConfig
{
    /// <summary>
    /// Resolves per-branch, per-ecosystem channel credentials at runtime.
    /// Currently backed by tenant-configs.json. Swap implementation for DB access
    /// without touching any provider code.
    /// Returns null when no config is found — providers MUST short-circuit on null.
    /// </summary>
    public interface ISchoolBranchConfigResolver
    {
        // ── Ecosystem A: SMS Striker + Office24by7 ───────────────────────────

        Task<SmsChannelConfig?> GetSmsConfigAsync(Guid schoolId, Guid branchId,
            CancellationToken ct = default);

        Task<EmailChannelConfig?> GetEmailConfigAsync(Guid schoolId, Guid branchId,
            CancellationToken ct = default);

        Task<WhatsAppChannelConfig?> GetWhatsAppConfigAsync(Guid schoolId, Guid branchId,
            CancellationToken ct = default);

        // ── Ecosystem B: MSG91 unified stack ────────────────────────────────

        Task<Msg91SmsConfig?> GetMsg91SmsConfigAsync(Guid schoolId, Guid branchId,
            CancellationToken ct = default);

        Task<Msg91WhatsAppConfig?> GetMsg91WhatsAppConfigAsync(Guid schoolId, Guid branchId,
            CancellationToken ct = default);

        Task<Msg91EmailConfig?> GetMsg91EmailConfigAsync(Guid schoolId, Guid branchId,
            CancellationToken ct = default);
    }
}
