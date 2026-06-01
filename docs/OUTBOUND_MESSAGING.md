# Outbound Messaging — MSG91 (SMS · WhatsApp · Email)

**Last Updated:** June 1, 2026 | **Version:** 2.0.0 | **Project:** SMSRepoA  
**Provider:** [MSG91](https://msg91.com) | **Base URL:** `https://api.msg91.com/api/v5/`

---

## Index

- [Overview](#overview)
- [Architecture](#architecture)
- [Configuration](#configuration)
  - [tenant-configs.json schema](#tenant-configsjson-schema)
  - [Branch credential resolution](#branch-credential-resolution)
  - [Switching providers](#switching-providers)
- [MSG91 API endpoints used](#msg91-api-endpoints-used)
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
- [Adding or swapping a provider](#adding-or-swapping-a-provider)
- [Error handling](#error-handling)

---

## Overview

The outbound messaging engine routes SMS, WhatsApp, and Email through MSG91's v5 API.
Credentials are resolved **per school and per branch** from `tenant-configs.json` at runtime —
nothing is hardcoded in `appsettings.json`.

All channels in a single request fire **concurrently** via `Task.WhenAll`.

**What callers never touch:**
- HTTP transport and `IHttpClientFactory` lifecycle
- Per-branch credential lookup and caching
- Polly retry logic (3 exponential retries: 2 s, 4 s, 8 s + jitter)
- MSG91 payload construction (template components, Base64 media, variable mapping)
- Audit writes to `AuditLogs`

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
        ├──► Msg91SmsProvider      → POST api.msg91.com/api/v5/flow/
        ├──► Msg91WhatsAppProvider → POST api.msg91.com/api/v5/whatsapp/...
        └──► Msg91EmailProvider    → POST api.msg91.com/api/v5/email/send
```

**Key types:**

| Type | Namespace | Purpose |
|------|-----------|---------|
| `CommunicationChannel` | `SmsApi.Messaging` | Enum: `WhatsApp`, `Sms`, `Email`, `Push` |
| `ChannelMessageRequest` | `SmsApi.Messaging` | Provider-agnostic outbound request |
| `ChannelMessageResult` | `SmsApi.Messaging` | Per-channel result with `IsSuccess`, `MessageId`, `ErrorMessage` |
| `IChannelProvider` | `SmsApi.Messaging` | Contract each provider implements (`Channel` + `SendAsync`) |
| `IChannelNotificationManager` | `SmsApi.Messaging` | **Inject this** in your code |
| `ISchoolBranchContext` | `SmsApi.Services` | BranchId from JWT / `X-Branch-Id` header |
| `ISchoolBranchConfigResolver` | `SmsApi.Infrastructure.TenantConfig` | Credential resolution with fallback |
| `INotificationLogService` | `SmsApi.Services.Messaging` | Audit write to `AuditLogs` |

---

## Configuration

### `tenant-configs.json`

Place this file in the **project root** alongside `appsettings.json`.
It is read once at startup by `SchoolBranchConfigResolver` via `IWebHostEnvironment.ContentRootPath`.

**Schema:**

```json
{
  "schools": [
    {
      "schoolId": "<uuid>",
      "schoolName": "Vitana International School",
      "defaults": {
        "msg91Sms": {
          "provider": "Msg91",
          "authKey": "SCHOOL_AUTH_KEY",
          "templateId": "TEMPLATE_ID",
          "senderId": "VITANA",
          "dltEntityId": "DLT_ENTITY_ID",
          "isEnabled": true
        },
        "msg91WhatsApp": {
          "provider": "Msg91",
          "authKey": "SCHOOL_AUTH_KEY",
          "integratedNumber": "+911234567890",
          "isEnabled": true
        },
        "msg91Email": {
          "provider": "Msg91",
          "authKey": "SCHOOL_AUTH_KEY",
          "domain": "mail.vitana.edu",
          "fromEmail": "noreply@vitana.edu",
          "fromName": "Vitana International School",
          "templateId": "EMAIL_TEMPLATE_ID",
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
            "authKey": "NORTH_AUTH_KEY",
            "templateId": "NORTH_TEMPLATE_ID",
            "senderId": "NORTHVIT",
            "dltEntityId": "NORTH_DLT_ENTITY_ID",
            "isEnabled": true
          }
        }
      ]
    }
  ]
}
```

> **Never commit live API keys.** Use placeholder strings during development and inject real values
> via a secrets manager or environment variable substitution in CI/CD before the file is written
> to disk on the server.

### Branch credential resolution

The resolver applies this fallback chain for every send:

```
1. BranchId == Guid.Empty           → use school defaults directly
2. Branch found, useSchoolDefaults  → use school defaults
3. Branch found, channel config set → use branch-level config
4. Branch found, channel config null→ fall back to school defaults
5. School not found                 → return null → provider short-circuits (422)
```

Cache key: `cfg:{schoolId}:{branchId}:{channel}` — TTL 30 minutes, in-process `IMemoryCache`.

### Branch context resolution

`BranchId` is resolved in this order per HTTP request:

1. JWT claim `"BranchId"` (standard login)
2. Request header `X-Branch-Id` (admin portal branch-switcher)
3. `Guid.Empty` — school-level defaults are used

Callers should also pass `schoolId` and `branchId` in `CustomAttributes` for the audit log:

```csharp
customAttributes: new Dictionary<string, string>
{
    ["schoolId"] = schoolId.ToString(),
    ["branchId"] = branchId.ToString(),
    ["userId"]   = userId.ToString()
}
```

### Switching providers

The active providers are the **only thing that needs changing**.
Open `Extensions/NotificationServicesExtensions.cs` and swap these three lines:

```csharp
// Active (MSG91)
services.AddScoped<IChannelProvider, Msg91SmsProvider>();
services.AddScoped<IChannelProvider, Msg91WhatsAppProvider>();
services.AddScoped<IChannelProvider, Msg91EmailProvider>();

// Alternatives (dead code — providers exist, just not registered)
// services.AddScoped<IChannelProvider, SmsStrikerSmsProvider>();     // SMS Striker
// services.AddScoped<IChannelProvider, Office24by7EmailProvider>();  // Office24by7 Email
```

Also register the corresponding `HttpClient` and add the branch's credential block to
`tenant-configs.json`. No other code changes are required.

---

## MSG91 API endpoints used

| Channel | Method | Endpoint |
|---------|--------|---------|
| SMS | `POST` | `https://api.msg91.com/api/v5/flow/` |
| WhatsApp | `POST` | `https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/` |
| Email | `POST` | `https://api.msg91.com/api/v5/email/send` |

Auth is via `authkey` request header (per-branch, resolved at call time).
No credentials appear in the `AddHttpClient` registration.

**SMS variable substitution** — `TemplateParameters[0]` → `var1`, `[1]` → `var2`, etc. (via `JsonExtensionData` on the recipient object).

**WhatsApp media** — `MediaUrl` can be either:
- An `https://` remote URL (passed as `document.link`)
- A Base64 data URI starting with `data:` (passed as `document.base64` for inline streaming)

**Email variables** — merged from `CustomAttributes` + positional `TemplateParameters` (`param1`, `param2`, …) into the MSG91 `variables` object.

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
      { "channel": "Email",    "isSuccess": true,  "messageId": "msg_ref_123",    "errorMessage": null, "statusCode": 200 }
    ]
  }
}
```

> A `501 Not Implemented` result means no provider is registered for that channel.
> A `422 Unprocessable Entity` result means no `tenant-configs.json` entry exists for
> the active school/branch — the send was blocked before any HTTP call was made.

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
> These are separate namespaces in the MSG91 platform — they cannot share the same value.

**Template parameters sent to MSG91 (positional, both channels):** `[fullName, otpCode, schoolName]` → `var1`, `var2`, `var3`

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
    templateOrCampaignIdentifier: "fee_overdue_alert",  // MSG91 template/flow ID
    templateParameters: new List<string> { student.Name, fee.Amount.ToString("C"), fee.DueDate.ToString("dd-MMM-yyyy") },
    customAttributes: new Dictionary<string, string>
    {
        ["schoolId"] = schoolId.ToString(),
        ["branchId"] = branchId.ToString(),
        ["userId"]   = actingUserId.ToString()
    },
    mediaUrl: receiptUrl,      // optional — null omits WhatsApp media component
    mediaFilename: "FeeReceipt.pdf",
    channels: new[] { CommunicationChannel.WhatsApp, CommunicationChannel.Sms }
);

// All channels fire concurrently
var results = await _messaging.SendAsync(request, cancellationToken);

// Audit all results — exceptions inside LogAsync never surface
await Task.WhenAll(results.Select(r => _log.LogAsync(request, r, cancellationToken)));

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

`ISchoolBranchContext` reads `BranchId` automatically from JWT or the `X-Branch-Id` header.
Pass `schoolId` and `branchId` in `CustomAttributes` so the audit log captures them:

```csharp
customAttributes: new Dictionary<string, string>
{
    ["schoolId"] = schoolId.ToString(),
    ["branchId"] = branchId.ToString(),
    ["userId"]   = currentUserId.ToString()
}
```

---

## Audit logging

Every send — success or failure — is written to the existing `AuditLogs` table. No migration needed.

| `AuditLogs` column | Value written |
|--------------------|---------------|
| `HttpMethod` | `"POST"` |
| `Path` | MSG91 endpoint path (e.g. `"api/v5/flow/"`) |
| `QueryString` | Destination phone or email (for indexed lookup) |
| `ActionType` | `"ChannelMessage_Sent"` or `"ChannelMessage_Failed"` |
| `EntityType` | `"Sms"`, `"WhatsApp"`, `"Email"` |
| `StatusCode` | HTTP status from MSG91 |
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
       SUM(CASE WHEN "ActionType" = 'ChannelMessage_Sent' THEN 1 ELSE 0 END) AS sent,
       SUM(CASE WHEN "ActionType" = 'ChannelMessage_Failed' THEN 1 ELSE 0 END) AS failed
FROM "AuditLogs"
WHERE "SchoolId" = '550e8400-e29b-41d4-a716-446655440000'
  AND "ActionType" LIKE 'ChannelMessage_%'
GROUP BY "EntityType";
```

---

## Adding or swapping a provider

**To add a new channel or replace MSG91:**

1. **Implement `IChannelProvider`:**

```csharp
// Messaging/Providers/MyVendor/MyVendorSmsProvider.cs
public sealed class MyVendorSmsProvider : IChannelProvider
{
    public CommunicationChannel Channel => CommunicationChannel.Sms;

    public async Task<ChannelMessageResult> SendAsync(
        ChannelMessageRequest request, CancellationToken ct = default)
    {
        // 1. Call _branchCtx.TryGetSchoolId() — short-circuit if absent
        // 2. Call _resolver.GetMsg91SmsConfigAsync() (or add your own method)
        // 3. Short-circuit with Failure(HttpStatusCode.UnprocessableEntity) if config is null
        // 4. Build payload, call _httpFactory.CreateClient("MyVendor"), POST with Polly retry
        // 5. Return Success(messageId) or Failure(error, statusCode)
    }
}
```

2. **Register in `Extensions/NotificationServicesExtensions.cs`:**

```csharp
services.AddHttpClient("MyVendor", client => {
    client.BaseAddress = new Uri("https://api.myvendor.com/");
    client.Timeout = TimeSpan.FromSeconds(20);
});
services.AddScoped<IChannelProvider, MyVendorSmsProvider>();
```

3. **Add credentials to `tenant-configs.json`** under the branch or school defaults.

`NotificationManager` picks up the new provider automatically via `IEnumerable<IChannelProvider>`.
No other code changes required.

---

## Error handling

### Provider failures

Providers never throw — they return `ChannelMessageResult.Failure(...)`. Always check `result.IsSuccess`.

### Tenant isolation guard

Every provider checks `ISchoolBranchContext.TryGetSchoolId()` before resolving credentials.
If the context is missing it returns `HttpStatusCode.Unauthorized` immediately, before
any HTTP call is made.

If credentials exist in `tenant-configs.json` for the school but not the specific channel,
the provider returns `HttpStatusCode.UnprocessableEntity`. Zero cross-tenant data is transmitted.

### Polly retry behaviour

| Attempt | Delay | Triggers on |
|---------|-------|-------------|
| 1st retry | 2 s + jitter | `HttpRequestException`, `TaskCanceledException`, HTTP 408 / 429 / 502 / 503 / 504 |
| 2nd retry | 4 s + jitter | same |
| 3rd retry | 8 s + jitter | same |

After 3 failed retries the provider returns `ChannelMessageResult.Failure` with `InternalServerError`.

### Invalid channel name in dispatch request

Passing `"Telegram"` in `channels` returns `HTTP 400` from the controller with the list of
valid values. This happens before any provider is resolved.

### Unregistered channel

A valid channel name (`"Push"`) with no registered provider returns `statusCode: 501` in that
channel's result only. Other channels in the same request proceed normally.
