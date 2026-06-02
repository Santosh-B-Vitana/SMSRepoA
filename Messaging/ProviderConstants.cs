namespace SmsApi.Messaging;

/// <summary>
/// Central registry of HTTP client names, base URLs, and API paths for all
/// outbound messaging providers. Consumed by both the providers and the HTTP
/// client registrations in NotificationServicesExtensions.
/// </summary>
internal static class ProviderConstants
{
    /// <summary>
    /// Ecosystem A: SmsStriker (SMS) + Office24by7 (Email).
    /// Activate by registering SmsStrikerSmsProvider and Office24by7EmailProvider in
    /// NotificationServicesExtensions.
    /// </summary>
    internal static class SmsStriker
    {
        public const string ClientName = "SmsStriker";
        public const string BaseUrl = "https://www.smsstriker.com/";
        public const string SendSms = "API/sendsmsapi.php";
    }

    internal static class Office24by7
    {
        public const string ClientName = "Office24by7";
        public const string BaseUrl = "https://apis.office24by7.com/";
        public const string SendEmail = "getgenericsp";
    }

    /// <summary>
    /// Ecosystem B: MSG91 unified stack (SMS + WhatsApp + Email).
    /// Activate by registering Msg91SmsProvider, Msg91WhatsAppProvider, and
    /// Msg91EmailProvider in NotificationServicesExtensions.
    /// </summary>
    internal static class Msg91
    {
        public const string ClientName = "Msg91";
        public const string BaseUrl = "https://api.msg91.com/";
        public const string SendSms = "api/v5/flow/";
        public const string SendWhatsApp = "api/v5/whatsapp/whatsapp-outbound-message/bulk/";
        public const string SendEmail = "api/v5/email/send";
    }
}
