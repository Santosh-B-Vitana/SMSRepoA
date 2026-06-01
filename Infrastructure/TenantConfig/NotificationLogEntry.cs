namespace SmsApi.Infrastructure.TenantConfig
{
    /// <summary>
    /// Blueprint for a future notification delivery audit row.
    ///
    /// DB migration when ready:
    ///   Table   : NotificationDeliveryLogs
    ///   FK      : BranchId → SchoolBranches.Id
    ///   INDEX   : (SchoolId, BranchId, SentAt DESC)   — delivery dashboards
    ///   INDEX   : (EcosystemKey, ChannelType, IsSuccess, SentAt DESC) — ecosystem failure alerting
    ///
    /// Until then this POCO is written to AuditLogs via NotificationLogService.
    /// </summary>
    public sealed class NotificationLogEntry
    {
        public Guid    Id                 { get; init; } = Guid.NewGuid();

        // ── Tenant identifiers ───────────────────────────────────────────────
        public Guid    SchoolId           { get; init; }
        public Guid    BranchId           { get; init; }   // Guid.Empty = school-level send

        // ── Dispatch metadata ────────────────────────────────────────────────
        /// <summary>"EcosystemA" or "EcosystemB" — which vendor stack handled this send.</summary>
        public string  EcosystemKey       { get; init; } = string.Empty;
        /// <summary>"Sms", "Email", "WhatsApp"</summary>
        public string  ChannelType        { get; init; } = string.Empty;
        /// <summary>"Msg91" (active). "SmsStriker" / "Office24by7" when switched.</summary>
        public string  Provider           { get; init; } = string.Empty;
        public string  Destination        { get; init; } = string.Empty;
        public string  TemplateIdentifier { get; init; } = string.Empty;

        // ── Outcome ──────────────────────────────────────────────────────────
        public bool    IsSuccess          { get; init; }
        /// <summary>
        /// SMS Striker: Job Id | MSG91: request_id | Office24by7: message reference
        /// </summary>
        public string? ProviderReference  { get; init; }
        public string? ErrorMessage       { get; init; }
        public DateTime SentAt            { get; init; } = DateTime.UtcNow;

        // ── Factory ──────────────────────────────────────────────────────────

        public static NotificationLogEntry FromResult(
            ChannelMessageRequest request,
            SmsApi.Messaging.ChannelMessageResult result,
            Guid schoolId,
            Guid branchId,
            string ecosystemKey,
            string provider)
            => new()
            {
                SchoolId           = schoolId,
                BranchId           = branchId,
                EcosystemKey       = ecosystemKey,
                ChannelType        = result.Channel.ToString(),
                Provider           = provider,
                Destination        = request.Destination,
                TemplateIdentifier = request.TemplateOrCampaignIdentifier,
                IsSuccess          = result.IsSuccess,
                ProviderReference  = result.MessageId,
                ErrorMessage       = result.ErrorMessage
            };
    }
}
