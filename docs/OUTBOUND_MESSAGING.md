# Outbound Messaging — SMS · WhatsApp · Email

**Last Updated:** June 2, 2026 | **Version:** 3.0.0 | **Project:** SMSRepoA

---

## Index

- [Overview](#overview)
- [Provider Ecosystems](#provider-ecosystems)
- [Architecture](#architecture)
- [Configuration](#configuration)
  - [tenant-configs.json schema](#tenant-configsjson-schema)
  - [Branch credential resolution](#branch-credential-resolution)
  - [Branch context resolution](#branch-context-resolution)
  - [Switching providers](#switching-providers)
- [API endpoints reference](#api-endpoints-reference)
- [Sending Messages (HTTP API)](#sending-messages-http-api)
  - [Generic dispatch](#1-generic-dispatch)
  - [User registration example](#2-user-registration-otp--welcome-kit)
  - [Query delivery logs](#3-query-delivery-logs)
- [Using the engine in code](#using-the-engine-in-code)
  - [Inject and call](#inject-and-call)
  - [Multi-channel concurrent dispatch](#multi-channel-concurrent-dispatch)
  - [Single channel](#single-channel)
  - [Passing branch context](#passing-branch-context)
- [Audit logging](#audit-logging)
- [Adding a new provider](#adding-a-new-provider)
- [Error handling](#error-handling)

---

## Overview

The outbound messaging engine routes SMS, WhatsApp, and Email through external provider APIs.
Two provider ecosystems are implemented. Only one is active at a time — switching is a
three-line code change with no HTTP client or infrastructure work required.

Credentials are resolved **per school and per branch** from `tenant-configs.json` at runtime.
Nothing is hardcoded in `appsettings.json`.

All channels in a single request fire **concurrently** via `Task.WhenAll`.

**What callers never touch:**
- HTTP transport and `IHttpClientFactory` lifecycle
- Per-branch credential lookup and caching
- Polly retry logic (3 exponential retries: 2 s, 4 s, 8 s + jitter)
- Provider-specific payload construction
- Audit writes to `AuditLogs`

---

## Provider Ecosystems

| Ecosystem | SMS | WhatsApp | Email | Config keys |
|-----------|-----|----------|-------|-------------|
| **Ecosystem B — MSG91** *(active)* | `Msg91SmsProvider` | `Msg91WhatsAppProvider` | `Msg91EmailProvider` | `msg91Sms`, `msg91WhatsApp`, `msg91Email` |
| **Ecosystem A — SmsStriker / Office24by7** | `SmsStrikerSmsProvider` | *(not yet implemented)* | `Office24by7EmailProvider` | `sms`, `email` |

**Active ecosystem is set in code** (`NotificationServicesExtensions.cs`), not in config.
See [Switching providers](#switching-providers).

---

## Architecture

```
JWT / X-Branch-Id header
        │
        ▼
ISchoolBranchContext          resolves SchoolId + BranchId per request
        │
        ▼
ISchoolBranchConfigResolver   reads tenant-configs.json → IMemoryCache (30-min TTL)
        │                     applies school-default fallback when branch has no config
        │
        ▼
IChannelNotificationManager   single inject point for controllers and services
        │
        │  routes by CommunicationChannel enum
        │
        │  ── Ecosystem B (MSG91, currently active) ─────────────────────────
        ├──► Msg91SmsProvider      → POST https://api.msg91.com/api/v5/flow/
        ├──► Msg91WhatsAppProvider → POST https://api.msg91.com/api/v5/whatsapp/...
        └──► Msg91EmailProvider    → POST https://api.msg91.com/api/v5/email/send
        │
        │  ── Ecosystem A (SmsStriker / Office24by7, inactive) ───────────────
        ├──► SmsStrikerSmsProvider    → POST https://www.smsstriker.com/API/sendsmsapi.php
        └──► Office24by7EmailProvider → POST https://apis.office24by7.com/getgenericsp
```

**Source layout:**

```
Messaging/
  ProviderConstants.cs          ← all base URLs and API paths
  IChannelProvider.cs
  IChannelNotificationManager.cs
  NotificationManager.cs
  ChannelMessageRequest.cs
  ChannelMessageResult.cs
  CommunicationChannel.cs
  Providers/
    Msg91/
      Msg91SmsProvider.cs
      Msg91WhatsAppProvider.cs
      Msg91EmailProvider.cs
    SmsStriker/
      SmsStrikerSmsProvider.cs
      Office24by7EmailProvider.cs   ← Office24by7 email lives in SmsStriker folder
```

**Key types:**

| Type | Namespace | Purpose |
|------|-----------|---------|
| `CommunicationChannel` | `SmsApi.Messaging` | Enum: `WhatsApp`, `Sms`, `Email`, `Push` |
| `ChannelMessageRequest` | `SmsApi.Messaging` | Provider-agnostic outbound request |
| `ChannelMessageResult` | `SmsApi.Messaging` | Per-channel result: `IsSuccess`, `MessageId`, `ErrorMessage` |
| `IChannelProvider` | `SmsApi.Messaging` | Contract each provider implements (`Channel` + `SendAsync`) |
| `IChannelNotificationManager` | `SmsApi.Messaging` | **Inject this** in your code |
| `ISchoolBranchContext` | `SmsApi.Services` | BranchId from JWT / `X-Branch-Id` header |
| `ISchoolBranchConfigResolver` | `SmsApi.Infrastructure.TenantConfig` | Credential resolution with fallback |
| `INotificationLogService` | `SmsApi.Services.Messaging` | Audit write to `AuditLogs` |

---

## Configuration

### `tenant-configs.json`

Place this file in the **project root** alongside `appsettings.json`.
Read once at startup by `SchoolBranchConfigResolver` via `IWebHostEnvironment.ContentRootPath`.

Both ecosystem credential blocks (`msg91*` and `sms`/`email`) can coexist in the same file.
The active ecosystem is determined by which providers are registered in code — unused
credential blocks are simply ignored at runtime.

> **Never commit live API keys.** Replace the `REPLACE_WITH_*` placeholder strings with
> real values via a secrets manager or environment-variable substitution in CI/CD before
> the file is written to the server.

**Full schema (both ecosystems):**

```json
{
  "schools": [
    {
      "schoolId": "<uuid>",
      "schoolName": "Vitana International School",
      "defaults": {

        "── Ecosystem A: SmsStriker + Office24by7 ──────────────────────────": "",
        "sms": {
          "provider": "SmsStriker",
          "apiKey": "REPLACE_WITH_SMSSTRIKER_API_KEY",
          "senderId": "VITANA",
          "smsType": "1",
          "isEnabled": true
        },
        "email": {
          "provider": "Office24by7",
          "userAuthToken": "REPLACE_WITH_OFFICE24BY7_AUTH_TOKEN",
          "fromEmail": "noreply@vitana.edu",
          "templateId": "REPLACE_WITH_OFFICE24BY7_TEMPLATE_ID",
          "isEnabled": true
        },

        "── Ecosystem B: MSG91 ─────────────────────────────────────────────": "",
        "msg91Sms": {
          "provider": "Msg91",
          "authKey": "REPLACE_WITH_MSG91_AUTH_KEY",
          "templateId": "REPLACE_WITH_MSG91_SMS_FLOW_ID",
          "senderId": "VITANA",
          "dltEntityId": "REPLACE_WITH_DLT_ENTITY_ID",
          "isEnabled": true
        },
        "msg91WhatsApp": {
          "provider": "Msg91",
          "authKey": "REPLACE_WITH_MSG91_AUTH_KEY",
          "integratedNumber": "+91XXXXXXXXXX",
          "isEnabled": true
        },
        "msg91Email": {
          "provider": "Msg91",
          "authKey": "REPLACE_WITH_MSG91_AUTH_KEY",
          "domain": "mail.vitana.edu",
          "fromEmail": "noreply@vitana.edu",
          "fromName": "Vitana International School",
          "templateId": "REPLACE_WITH_MSG91_EMAIL_TEMPLATE_ID",
          "isEnabled": true
        }
      },
      "branches": [
        {
          "branchId": "<uuid>",
          "branchName": "Main Campus",
          "useSchoolDefaults": true
        },
        {
          "branchId": "<uuid>",
          "branchName": "North Campus",
          "useSchoolDefaults": false,
          "msg91Sms": {
            "provider": "Msg91",
            "authKey": "REPLACE_WITH_NORTH_MSG91_AUTH_KEY",
            "templateId": "REPLACE_WITH_NORTH_MSG91_SMS_FLOW_ID",
            "senderId": "NORTHVIT",
            "dltEntityId": "REPLACE_WITH_NORTH_DLT_ENTITY_ID",
            "isEnabled": true
          }
        }
      ]
    }
  ]
}
```

> Note: the comment-style keys (`"── Ecosystem A: ..."`) are shown for readability only.
> Remove them from your actual file — JSON parsers may reject keys with duplicate prefixes.

#### Ecosystem A credential fields

**`sms` block — SmsStriker:**

| Field | Description |
|-------|-------------|
| `apiKey` | Authentication key from SMS Striker dashboard |
| `senderId` | DLT-approved alphanumeric sender ID (max 6 chars for India) |
| `smsType` | `"1"` = Transactional, `"2"` = Promotional |

**`email` block — Office24by7:**

| Field | Description |
|-------|-------------|
| `userAuthToken` | Auth token from Office24by7 user panel |
| `fromEmail` | Verified sender email address |
| `templateId` | Template ID configured in the Office24by7 platform |

#### Ecosystem B credential fields

**`msg91Sms` block:**

| Field | Description |
|-------|-------------|
| `authKey` | MSG91 auth key (sent as `authkey` request header) |
| `templateId` | MSG91 Flow ID for the DLT-approved SMS template |
| `senderId` | DLT-registered 6-char sender ID |
| `dltEntityId` | Entity ID registered with TRAI |

**`msg91WhatsApp` block:**

| Field | Description |
|-------|-------------|
| `authKey` | MSG91 auth key |
| `integratedNumber` | Activated WABA number in E.164 format (e.g. `+91XXXXXXXXXX`) |

**`msg91Email` block:**

| Field | Description |
|-------|-------------|
| `authKey` | MSG91 auth key |
| `domain` | MSG91 verified sending domain (e.g. `mail.school.edu`) |
| `fromEmail` | Sender email address |
| `fromName` | Display name shown to the recipient |
| `templateId` | MSG91 transactional email template ID |

---

### Branch credential resolution

The resolver applies this fallback chain for every send:

```
1. BranchId == Guid.Empty            → use school defaults directly
2. Branch found, useSchoolDefaults   → use school defaults
3. Branch found, channel config set  → use branch-level config
4. Branch found, channel config null → fall back to school defaults silently
5. School not found                  → return null → provider short-circuits (422)
```

Cache key: `cfg:{schoolId}:{branchId}:{channel}` — TTL 30 minutes, in-process `IMemoryCache`.

---

### Branch context resolution

`BranchId` is resolved in this order per HTTP request:

1. JWT claim `"BranchId"` (standard login)
2. Request header `X-Branch-Id` (admin portal branch-switcher)
3. `Guid.Empty` — school-level defaults are used

---

### Switching providers

Open `Extensions/NotificationServicesExtensions.cs`. The relevant section:

```csharp
// Ecosystem B — MSG91 (currently active)
services.AddScoped<IChannelProvider, Msg91SmsProvider>();
services.AddScoped<IChannelProvider, Msg91WhatsAppProvider>();
services.AddScoped<IChannelProvider, Msg91EmailProvider>();

// Ecosystem A — SmsStriker + Office24by7 (uncomment to activate instead of MSG91)
// services.AddScoped<IChannelProvider, SmsStrikerSmsProvider>();
// services.AddScoped<IChannelProvider, Office24by7EmailProvider>();
```

**To switch to SmsStriker / Office24by7:**
1. Comment out the three MSG91 `AddScoped` lines.
2. Uncomment the two SmsStriker / Office24by7 `AddScoped` lines.
3. Fill in the `sms` and `email` credential blocks in `tenant-configs.json`.

No `AddHttpClient` changes are needed — all three HTTP clients (`Msg91`, `SmsStriker`,
`Office24by7`) are always registered regardless of which providers are active.

> Note: Ecosystem A has no WhatsApp provider yet. Dispatching `"WhatsApp"` while Ecosystem A
> is active returns `statusCode: 501` for that channel; SMS and Email proceed normally.

---

## API endpoints reference

### Ecosystem B — MSG91

| Channel | Method | Endpoint |
|---------|--------|----------|
| SMS | `POST` | `https://api.msg91.com/api/v5/flow/` |
| WhatsApp | `POST` | `https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/` |
| Email | `POST` | `https://api.msg91.com/api/v5/email/send` |

Auth: `authkey` request header (per-branch, resolved at call time — never in `AddHttpClient`).

### Ecosystem A — SmsStriker / Office24by7

| Channel | Method | Endpoint |
|---------|--------|----------|
| SMS | `POST` | `https://www.smsstriker.com/API/sendsmsapi.php` |
| Email | `POST` | `https://apis.office24by7.com/getgenericsp` |

Auth: SMS Striker uses `key` in the JSON body. Office24by7 uses `user_auth_token` in the
JSON body. Both resolved from `tenant-configs.json` at call time.

---

### Variable / template parameter mapping

**MSG91 SMS** — `TemplateParameters[0]` → `var1`, `[1]` → `var2`, etc.
(Written as extension data on the recipient object via `[JsonExtensionData]`.)

**MSG91 WhatsApp** — `TemplateParameters` map to WhatsApp template `body` components in order.
`templateOrCampaignIdentifier` is the **WhatsApp template name** (e.g. `student_welcome_v1`).

**MSG91 Email** — merged from `CustomAttributes` (named) + `TemplateParameters` (`param1`,
`param2`, …) into the MSG91 `variables` object.

**SMS Striker** — `TemplateParameters` substitute positional placeholders `{1}`, `{2}`, … in
the DLT-approved template text. `templateOrCampaignIdentifier` is the full template string.

**Office24by7 Email** — `templateOrCampaignIdentifier` is the email **subject**. Template
variables are merged from `CustomAttributes` (named, matching `##key##` placeholders) +
`TemplateParameters` (`param1`, `param2`, …) into `variables_data`. `templateId` comes from
the branch credential config, not the request.

**MSG91 WhatsApp media** — `MediaUrl` can be:
- An `https://` remote URL → passed as `document.link`
- A Base64 data URI starting with `data:` → passed as `document.base64` for inline streaming

---

## Sending Messages (HTTP API)

All endpoints are under `api/outbound-messaging` and require a valid JWT Bearer token.
Responses are wrapped by `ApiResponseWrapperMiddleware`:

```json
{ "success": true, "data": { ... }, "timestamp": "...", "correlationId": "..." }
```

### 1. Generic dispatch

**`POST api/outbound-messaging/dispatch`**
Auth: any authenticated user

**Request:**
```json
{
  "destination": "+919876543210",
  "recipientName": "Ramesh Sharma",
  "templateOrCampaignIdentifier": "fee_reminder_v2",
  "templateParameters": ["Aarav Sharma", "₹12,000", "30-Jun-2026"],
  "channels": ["WhatsApp", "Sms", "Email"],
  "mediaUrl": "https://cdn.school.com/fee-receipt-june.pdf",
  "mediaFilename": "FeeReceipt_June2026.pdf",
  "customAttributes": {
    "schoolId": "550e8400-e29b-41d4-a716-446655440000",
    "branchId": "bbbbbbbb-0000-0000-0000-000000000002",
    "studentId": "abc-123"
  }
}
```

> `channels` accepts any combination of `"WhatsApp"`, `"Sms"`, `"Email"`, `"Push"` (case-insensitive).
> `mediaUrl` / `mediaFilename` are optional. Omitting them excludes the media component from the WhatsApp payload.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "allSucceeded": true,
    "results": [
      { "channel": "Sms",      "isSuccess": true,  "messageId": "request_id_abc", "errorMessage": null, "statusCode": 200 },
      { "channel": "WhatsApp", "isSuccess": true,  "messageId": "message_id_xyz", "errorMessage": null, "statusCode": 200 },
      { "channel": "Email",    "isSuccess": true,  "messageId": "ok",             "errorMessage": null, "statusCode": 200 }
    ]
  }
}
```

> A `501 Not Implemented` result means no provider is registered for that channel.
> A `422 Unprocessable Entity` result means no `tenant-configs.json` entry exists for the
> active school/branch — the send was blocked before any HTTP call was made.

---

### 2. User registration — OTP + welcome kit

Sends an OTP via SMS and a welcome document via WhatsApp **concurrently** in one call.

**`POST api/outbound-messaging/user-registration`**
Auth: `Admin`, `Principal`, `SuperAdmin`

**Request:**
```json
{
  "phoneNumber": "+919876543210",
  "fullName": "Priya Nair",
  "otpCode": "847291",
  "schoolName": "Vitana International School",
  "smsTemplateIdentifier": "msg91_flow_id_for_otp",
  "whatsAppTemplateIdentifier": "student_welcome_v1",
  "welcomeDocumentUrl": "https://cdn.school.com/welcome-kit-2026.pdf",
  "welcomeDocumentFilename": "WelcomeKit_2026.pdf"
}
```

> `smsTemplateIdentifier` is a MSG91 **Flow ID** (numeric string).
> `whatsAppTemplateIdentifier` is a MSG91 **WhatsApp template name** (e.g. `student_welcome_v1`).
> These are separate namespaces in the MSG91 platform and cannot share the same value.

**Template parameters sent to providers (both channels):** `[fullName, otpCode, schoolName]`

**Response:** same `ChannelDispatchResponse` shape as `/dispatch`.

---

### 3. Query delivery logs

**`GET api/outbound-messaging/logs`**
Auth: `Admin`, `Principal`, `SuperAdmin`

| Query param | Type | Description |
|-------------|------|-------------|
| `phone` | `string` | Destination phone or email |
| `channel` | `string` | `WhatsApp`, `Sms`, `Email` |
| `from` | `DateTime` | UTC start |
| `to` | `DateTime` | UTC end |

```
GET api/outbound-messaging/logs?phone=+919876543210&channel=Sms&from=2026-06-01
```

---

## Using the engine in code

### Inject and call

```csharp
using SmsApi.Messaging;
using SmsApi.Services.Messaging;

public class FeeService
{
    private readonly IChannelNotificationManager _messaging;
    private readonly INotificationLogService _log;

    public FeeService(IChannelNotificationManager messaging, INotificationLogService log)
    {
        _messaging = messaging;
        _log = log;
    }
}
```

### Multi-channel concurrent dispatch

```csharp
var request = new ChannelMessageRequest(
    destination: guardian.PhoneNumber,
    recipientName: guardian.FullName,
    templateOrCampaignIdentifier: "fee_overdue_alert",  // MSG91 Flow ID or template name
    templateParameters: new List<string> { student.Name, fee.Amount.ToString("C"), fee.DueDate.ToString("dd-MMM-yyyy") },
    customAttributes: new Dictionary<string, string>
    {
        ["schoolId"] = schoolId.ToString(),
        ["userId"]   = actingUserId.ToString()
    },
    mediaUrl: receiptUrl,         // null omits the WhatsApp media component
    mediaFilename: "FeeReceipt.pdf",
    channels: new[] { CommunicationChannel.WhatsApp, CommunicationChannel.Sms }
);

var results = await _messaging.SendAsync(request, cancellationToken);
await _log.LogBatchAsync(request, results, cancellationToken);

foreach (var result in results)
{
    if (!result.IsSuccess)
        logger.LogWarning("Channel {Ch} failed: {Err}", result.Channel, result.ErrorMessage);
}
```

### Single channel

```csharp
var request = new ChannelMessageRequest(
    destination: "+919876543210",
    recipientName: "Ramesh Sharma",
    templateOrCampaignIdentifier: "attendance_alert_v1",
    templateParameters: new List<string> { "Aarav", "03-Jun-2026", "Absent" },
    channel: CommunicationChannel.Sms   // convenience single-channel overload
);

var results = await _messaging.SendAsync(request);
```

### Passing branch context

`ISchoolBranchContext` reads `BranchId` automatically from the JWT or `X-Branch-Id` header.
Pass `schoolId` and `userId` in `CustomAttributes` so the audit log captures them:

```csharp
customAttributes: new Dictionary<string, string>
{
    ["schoolId"] = schoolId.ToString(),
    ["userId"]   = currentUserId.ToString()
}
```

---

## Audit logging

Every send — success or failure — is written to the existing `AuditLogs` table. No migration needed.

| `AuditLogs` column | Value written |
|--------------------|---------------|
| `HttpMethod` | `"POST"` |
| `Path` | `"outbound-messaging"` |
| `QueryString` | Destination phone or email (for indexed lookup) |
| `ActionType` | `"ChannelMessage_Sent"` or `"ChannelMessage_Failed"` |
| `EntityType` | `"Sms"`, `"WhatsApp"`, `"Email"` |
| `StatusCode` | HTTP status returned by the provider |
| `RequestBody` | JSON `{ destination, campaign, recipientName, templateParams, messageId }` |
| `ExceptionMessage` | Provider error detail on failure |
| `SchoolId` / `UserId` | Extracted from `CustomAttributes["schoolId"]` / `["userId"]` |
| `Timestamp` | UTC time of the send attempt |

**Debug queries:**

```sql
-- All failures in the last 24 hours
SELECT * FROM "AuditLogs"
WHERE "ActionType" = 'ChannelMessage_Failed'
  AND "Timestamp" >= NOW() - INTERVAL '24 hours'
ORDER BY "Timestamp" DESC;

-- All sends to a specific number
SELECT * FROM "AuditLogs"
WHERE "ActionType" LIKE 'ChannelMessage_%'
  AND "QueryString" = '+919876543210'
ORDER BY "Timestamp" DESC;

-- Per-channel breakdown for a school
SELECT "EntityType", COUNT(*),
       SUM(CASE WHEN "ActionType" = 'ChannelMessage_Sent'   THEN 1 ELSE 0 END) AS sent,
       SUM(CASE WHEN "ActionType" = 'ChannelMessage_Failed' THEN 1 ELSE 0 END) AS failed
FROM "AuditLogs"
WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000'
  AND "ActionType" LIKE 'ChannelMessage_%'
GROUP BY "EntityType";
```

---

## Adding a new provider

1. **Implement `IChannelProvider`** under `Messaging/Providers/YourVendor/`:

```csharp
public sealed class MyVendorSmsProvider : IChannelProvider
{
    public CommunicationChannel Channel => CommunicationChannel.Sms;

    private readonly AsyncRetryPolicy<HttpResponseMessage> _retryPolicy;
    // ... inject IHttpClientFactory, ISchoolBranchContext, ISchoolBranchConfigResolver, ILogger

    public MyVendorSmsProvider(..., ILogger<MyVendorSmsProvider> logger)
    {
        // Initialize retry policy once per instance — not inside SendAsync
        _retryPolicy = ResiliencePolicies.GetHttpRetryPolicy(logger);
    }

    public async Task<ChannelMessageResult> SendAsync(
        ChannelMessageRequest request, CancellationToken ct = default)
    {
        // 1. _branchCtx.TryGetSchoolId() — return Unauthorized if absent
        // 2. _resolver.GetSmsConfigAsync() — return UnprocessableEntity if null / disabled
        // 3. Build payload
        // 4. _retryPolicy.ExecuteAsync(() => _httpFactory.CreateClient("MyVendor").PostAsJsonAsync(...))
        // 5. Return Success(messageId) or Failure(error, statusCode)
    }
}
```

2. **Add the base URL to `ProviderConstants.cs`:**

```csharp
internal static class MyVendor
{
    public const string ClientName = "MyVendor";
    public const string BaseUrl    = "https://api.myvendor.com/";
    public const string SendSms    = "v1/messages";
}
```

3. **Register the HTTP client and provider in `NotificationServicesExtensions.cs`:**

```csharp
services.AddHttpClient(ProviderConstants.MyVendor.ClientName, client =>
{
    client.BaseAddress = new Uri(ProviderConstants.MyVendor.BaseUrl);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
    client.Timeout = TimeSpan.FromSeconds(25);
});
services.AddScoped<IChannelProvider, MyVendorSmsProvider>();
```

4. **Add the credential config class to `BranchChannelConfig.cs`** and a resolver method to
`ISchoolBranchConfigResolver` / `SchoolBranchConfigResolver`.

5. **Add the credential block to `tenant-configs.json`** under school defaults and relevant branches.

`NotificationManager` picks up the new provider automatically via `IEnumerable<IChannelProvider>`.
No other code changes required.

---

## Error handling

### Provider failures

Providers never throw — they return `ChannelMessageResult.Failure(...)`.
Always check `result.IsSuccess` before treating a send as delivered.

### Tenant isolation guard

Every provider checks `ISchoolBranchContext.TryGetSchoolId()` before resolving credentials.
A missing context returns `HttpStatusCode.Unauthorized` immediately, before any HTTP call.

If credentials exist in `tenant-configs.json` for the school but not the specific channel,
the provider returns `HttpStatusCode.UnprocessableEntity`.
Zero cross-tenant data is transmitted.

### Polly retry behaviour

| Attempt | Delay | Triggers on |
|---------|-------|-------------|
| 1st retry | 2 s + jitter | `HttpRequestException`, `TaskCanceledException`, HTTP 408 / 429 / 502 / 503 / 504 |
| 2nd retry | 4 s + jitter | same |
| 3rd retry | 8 s + jitter | same |

After 3 failed retries the provider returns `ChannelMessageResult.Failure` with `InternalServerError`.
The retry policy is initialised once per provider instance (in the constructor) — not on every call.

### Invalid channel name in dispatch request

Passing `"Telegram"` in `channels` returns `HTTP 400` from the controller with the list of
valid values. This happens before any provider is resolved.

### Unregistered channel

A valid channel name (`"Push"`) with no registered provider returns `statusCode: 501` in that
channel's result only. Other channels in the same request proceed normally.
