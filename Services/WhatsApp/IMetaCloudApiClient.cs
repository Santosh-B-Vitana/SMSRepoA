namespace SmsApi.Services.WhatsApp;

// ── Meta Cloud API Request/Response DTOs ─────────────────────────────────────

public record MetaSendMessageRequest(
    string MessagingProduct,
    string To,
    string Type,
    MetaTemplatePayload? Template = null,
    MetaTextPayload? Text = null
);

public record MetaTemplatePayload(
    string Name,
    MetaLanguage Language,
    IReadOnlyList<MetaTemplateComponent>? Components = null
);

public record MetaLanguage(string Code);

public record MetaTemplateComponent(
    string Type,
    IReadOnlyList<MetaTemplateParameter>? Parameters = null
);

public record MetaTemplateParameter(
    string Type,
    string? Text = null,
    MetaCurrencyPayload? Currency = null,
    MetaDatePayload? DateTime = null
);

public record MetaCurrencyPayload(string FallbackValue, string Code, long Amount1000);
public record MetaDatePayload(string FallbackValue, string DayOfWeek, int Day, string Month, int Year, int Hour, int Minute);
public record MetaTextPayload(string Body);

public record MetaSendMessageResponse(
    string? MessagingProduct,
    IReadOnlyList<MetaContact>? Contacts,
    IReadOnlyList<MetaMessageId>? Messages,
    MetaError? Error = null
);

public record MetaContact(string Input, string WaId);
public record MetaMessageId(string Id, string? MessageStatus);

public record MetaError(
    int Code,
    string Message,
    string? Type,
    MetaErrorData? ErrorData = null
);

public record MetaErrorData(string Details, string? TemplateBodyText = null);

// ── Template Management DTOs ──────────────────────────────────────────────────

public record MetaCreateTemplateRequest(
    string Name,
    string Category,
    string Language,
    IReadOnlyList<MetaTemplateComponent2> Components
);

public record MetaTemplateComponent2(
    string Type,
    string? Format = null,
    string? Text = null,
    IReadOnlyList<MetaTemplateButton>? Buttons = null
);

public record MetaTemplateButton(
    string Type,
    string Text,
    string? Url = null,
    string? PhoneNumber = null
);

public record MetaCreateTemplateResponse(
    string? Id,
    string? Name,
    string? Status,
    string? Category,
    MetaError? Error = null
);

public record MetaTemplateStatusResponse(
    string Id,
    string Status,
    string? RejectedReason = null
);

// ── Webhook Payload DTOs ──────────────────────────────────────────────────────

public record MetaWebhookPayload(
    string? Object,
    IReadOnlyList<MetaWebhookEntry>? Entry
);

public record MetaWebhookEntry(
    string? Id,
    IReadOnlyList<MetaWebhookChange>? Changes
);

public record MetaWebhookChange(
    MetaWebhookValue? Value,
    string? Field
);

public record MetaWebhookValue(
    string? MessagingProduct,
    MetaWebhookMetadata? Metadata,
    IReadOnlyList<MetaWebhookContact>? Contacts,
    IReadOnlyList<MetaWebhookMessage>? Messages,
    IReadOnlyList<MetaWebhookStatus>? Statuses,
    IReadOnlyList<MetaTemplateStatusWebhook>? MessageTemplateStatusChange = null
);

public record MetaWebhookMetadata(string? DisplayPhoneNumber, string? PhoneNumberId);
public record MetaWebhookContact(string? Profile, string? WaId);
public record MetaWebhookContactProfile(string? Name);

public record MetaWebhookMessage(
    string? Id,
    string? From,
    string? Timestamp,
    string? Type,
    MetaWebhookText? Text,
    MetaWebhookContext? Context
);

public record MetaWebhookText(string? Body);
public record MetaWebhookContext(string? From, string? Id);

public record MetaWebhookStatus(
    string? Id,
    string? Status,
    string? Timestamp,
    string? RecipientId,
    MetaWebhookConversation? Conversation,
    MetaWebhookPricing? Pricing,
    MetaWebhookError? Errors
);

public record MetaWebhookConversation(string? Id, string? ExpirationTimestamp, MetaWebhookConversationOrigin? Origin);
public record MetaWebhookConversationOrigin(string? Type);
public record MetaWebhookPricing(string? BillableStatus, string? PricingModel, string? Category);
public record MetaWebhookError(int Code, string? Title, string? Message);

public record MetaTemplateStatusWebhook(
    string? MessageTemplateId,
    string? MessageTemplateName,
    string? MessageTemplateLanguage,
    string? Event,
    string? Reason = null,
    string? DisableInfo = null
);

// ── Interface ─────────────────────────────────────────────────────────────────

public interface IMetaCloudApiClient
{
    Task<MetaSendMessageResponse> SendTemplateMessageAsync(
        string phoneNumberId,
        string accessToken,
        MetaSendMessageRequest request,
        CancellationToken cancellationToken = default);

    Task<MetaCreateTemplateResponse> CreateTemplateAsync(
        string wabaId,
        string accessToken,
        MetaCreateTemplateRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteTemplateAsync(
        string wabaId,
        string accessToken,
        string templateName,
        CancellationToken cancellationToken = default);

    Task<MetaTemplateStatusResponse?> GetTemplateAsync(
        string templateId,
        string accessToken,
        CancellationToken cancellationToken = default);
}
