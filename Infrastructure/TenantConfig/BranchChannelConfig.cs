namespace SmsApi.Infrastructure.TenantConfig
{
    // ── Root ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Deserialised root of tenant-configs.json.
    /// Mirrors the future School → SchoolBranches → Branch*Configurations DB hierarchy.
    /// </summary>
    public sealed class TenantConfigRoot
    {
        public List<SchoolTenantConfig> Schools { get; set; } = new();
    }

    // ── School ──────────────────────────────────────────────────────────────

    public sealed class SchoolTenantConfig
    {
        public Guid   SchoolId   { get; set; }
        public string SchoolName { get; set; } = string.Empty;

        /// <summary>
        /// Fallback credentials used by any branch that has UseSchoolDefaults = true
        /// or that has no branch-level config for a given channel.
        /// </summary>
        public BranchChannelDefaults Defaults { get; set; } = new();

        public List<BranchTenantConfig> Branches { get; set; } = new();
    }

    // ── Branch ──────────────────────────────────────────────────────────────

    public sealed class BranchTenantConfig
    {
        public Guid   BranchId   { get; set; }
        public string BranchName { get; set; } = string.Empty;

        /// <summary>
        /// When true, ALL channels fall back to the parent school's Defaults block.
        /// Mirrors the future UseSchoolDefault column on Branch*Configuration tables.
        /// </summary>
        public bool UseSchoolDefaults { get; set; } = false;

        // ── Ecosystem A: SMS Striker + Office24by7 ───────────────────────────
        public SmsChannelConfig?      Sms      { get; set; }
        public EmailChannelConfig?    Email    { get; set; }
        public WhatsAppChannelConfig? WhatsApp { get; set; }

        // ── Ecosystem B: MSG91 unified stack ────────────────────────────────
        public Msg91SmsConfig?      Msg91Sms      { get; set; }
        public Msg91WhatsAppConfig? Msg91WhatsApp { get; set; }
        public Msg91EmailConfig?    Msg91Email    { get; set; }
    }

    // ── School-level defaults ────────────────────────────────────────────────

    public sealed class BranchChannelDefaults
    {
        // Ecosystem A
        public SmsChannelConfig?      Sms      { get; set; }
        public EmailChannelConfig?    Email    { get; set; }
        public WhatsAppChannelConfig? WhatsApp { get; set; }

        // Ecosystem B
        public Msg91SmsConfig?      Msg91Sms      { get; set; }
        public Msg91WhatsAppConfig? Msg91WhatsApp { get; set; }
        public Msg91EmailConfig?    Msg91Email    { get; set; }
    }

    // ── Ecosystem A — channel configs ────────────────────────────────────────

    public sealed class SmsChannelConfig
    {
        public string Provider  { get; set; } = "SmsStriker";
        public string ApiKey    { get; set; } = string.Empty;
        /// <summary>DLT-approved alphanumeric sender ID (max 6 chars for India).</summary>
        public string SenderId  { get; set; } = string.Empty;
        /// <summary>"1" = Transactional, "2" = Promotional.</summary>
        public string SmsType   { get; set; } = "1";
        public bool   IsEnabled { get; set; } = true;
    }

    public sealed class EmailChannelConfig
    {
        public string Provider      { get; set; } = "Office24by7";
        public string UserAuthToken { get; set; } = string.Empty;
        public string FromEmail     { get; set; } = string.Empty;
        /// <summary>Office24by7 template ID configured in the platform.</summary>
        public string TemplateId    { get; set; } = string.Empty;
        public bool   IsEnabled     { get; set; } = true;
    }

    public sealed class WhatsAppChannelConfig
    {
        public string Provider   { get; set; } = "Office24by7";
        public string ApiKey     { get; set; } = string.Empty;
        /// <summary>Activated WABA number in E.164 format.</summary>
        public string WabaNumber { get; set; } = string.Empty;
        public bool   IsEnabled  { get; set; } = true;
    }

    // ── Ecosystem B — MSG91 unified configs ──────────────────────────────────

    public sealed class Msg91SmsConfig
    {
        public string Provider     { get; set; } = "Msg91";
        /// <summary>MSG91 auth key (header: authkey).</summary>
        public string AuthKey      { get; set; } = string.Empty;
        /// <summary>MSG91 Flow / Template ID for DLT-approved message.</summary>
        public string TemplateId   { get; set; } = string.Empty;
        /// <summary>DLT-registered 6-char sender ID.</summary>
        public string SenderId     { get; set; } = string.Empty;
        /// <summary>DLT Entity ID registered with TRAI.</summary>
        public string DltEntityId  { get; set; } = string.Empty;
        public bool   IsEnabled    { get; set; } = true;
    }

    public sealed class Msg91WhatsAppConfig
    {
        public string Provider         { get; set; } = "Msg91";
        public string AuthKey          { get; set; } = string.Empty;
        /// <summary>MSG91 integrated WABA number (E.164). Acts as the sender.</summary>
        public string IntegratedNumber { get; set; } = string.Empty;
        public bool   IsEnabled        { get; set; } = true;
    }

    public sealed class Msg91EmailConfig
    {
        public string Provider    { get; set; } = "Msg91";
        public string AuthKey     { get; set; } = string.Empty;
        /// <summary>MSG91 verified sending domain (e.g. mail.school.edu).</summary>
        public string Domain      { get; set; } = string.Empty;
        public string FromEmail   { get; set; } = string.Empty;
        public string FromName    { get; set; } = string.Empty;
        /// <summary>MSG91 transactional email template ID.</summary>
        public string TemplateId  { get; set; } = string.Empty;
        public bool   IsEnabled   { get; set; } = true;
    }
}
