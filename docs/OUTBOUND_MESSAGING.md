# Outbound Messaging — WhatsApp & SMS via AiSensy

**Last Updated:** June 1, 2026 | **Version:** 1.0.0 | **Project:** SMSRepoA  
**Provider:** [AiSensy](https://aisensy.com) | **API:** `POST https://backend.aisensy.com/campaign/t1/api/v2`

---

## Index

- [Overview](#overview)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Sending Messages](#sending-messages)
  - [Generic Dispatch](#1-generic-dispatch)
  - [User Registration Example](#2-user-registration-concurrent-otp--welcome-kit)
  - [Querying Logs](#3-query-delivery-logs)
- [Using the Engine in Code](#using-the-engine-in-code)
  - [Inject and Call](#inject-and-call)
  - [Multi-Channel Concurrent Dispatch](#multi-channel-concurrent-dispatch)
  - [Single Channel](#single-channel)
- [Audit Logging](#audit-logging)
- [Adding a New Channel Provider](#adding-a-new-channel-provider)
- [Error Handling](#error-handling)

---

## Overview

The outbound messaging engine lets any service or controller dispatch WhatsApp and SMS messages
through AiSensy without knowing anything about the HTTP transport, retry logic, or audit persistence.
All listed channels in a single request fire **concurrently**.

**What's abstracted away from callers:**

- HTTP lifecycle management (`IHttpClientFactory`)
- Transient fault retries (Polly — 3 exponential retries: 2s, 4s, 8s)
- AiSensy payload construction and `media` field conditional inclusion
- Per-channel audit writes to `AuditLogs`

---

## Configuration

### `appsettings.json`

```json
"AiSensy": {
  "ApiKey": "YOUR_AISENSY_API_KEY_HERE",
  "BaseUrl": "https://backend.aisensy.com/",
  "DefaultSource": "WebPlatform"
}
```

### Production

Set the API key via environment variable — never commit it to source control:

```bash
AiSensy__ApiKey=your_live_key_here
```

The `BaseUrl` and `DefaultSource` values default to the AiSensy production endpoint and are
overridable per environment without code changes.

---

## Architecture

```
Controller / Service
        │
        ▼
IChannelNotificationManager          ← single inject point for callers
        │
        │  routes by CommunicationChannel enum
        ├──► AiSensyWhatsAppProvider  (CommunicationChannel.WhatsApp)
        └──► [future: SmsProvider]    (CommunicationChannel.Sms)
                │
                ▼
        AiSensy REST API
        POST /campaign/t1/api/v2
```

**Key types:**

| Type | Namespace | Purpose |
|------|-----------|---------|
| `CommunicationChannel` | `SmsApi.Messaging` | Enum: WhatsApp, Sms, Email, Push |
| `ChannelMessageRequest` | `SmsApi.Messaging` | Provider-agnostic outbound request |
| `ChannelMessageResult` | `SmsApi.Messaging` | Per-channel send result |
| `IChannelProvider` | `SmsApi.Messaging` | Contract for a single channel's backend |
| `IChannelNotificationManager` | `SmsApi.Messaging` | Orchestrator — inject this in your code |
| `INotificationLogService` | `SmsApi.Services.Messaging` | Persists delivery events to `AuditLogs` |

---

## Sending Messages

All endpoints live under `api/outbound-messaging` and require a valid JWT.

### 1. Generic Dispatch

Dispatch a message to any combination of channels in one call.

**`POST api/outbound-messaging/dispatch`**  
Auth: any authenticated user

**Request:**
```json
{
  "destination": "+919876543210",
  "recipientName": "Ramesh Sharma",
  "templateOrCampaignIdentifier": "fee_reminder_v2",
  "templateParameters": ["Aarav Sharma", "₹12,000", "30-Jun-2026"],
  "channels": ["WhatsApp", "Sms"],
  "mediaUrl": "https://cdn.school.com/fee-receipt-june.pdf",
  "mediaFilename": "FeeReceipt_June2026.pdf",
  "customAttributes": {
    "studentId": "abc-123"
  }
}
```

> `channels` accepts any combination of: `"WhatsApp"`, `"Sms"`, `"Email"`, `"Push"` (case-insensitive).  
> `mediaUrl` / `mediaFilename` are optional. When omitted, the `media` field is excluded from the AiSensy payload entirely.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "allSucceeded": true,
    "results": [
      {
        "channel": "WhatsApp",
        "isSuccess": true,
        "messageId": "wamid.HBgL...",
        "errorMessage": null,
        "statusCode": 200
      },
      {
        "channel": "Sms",
        "isSuccess": false,
        "messageId": null,
        "errorMessage": "No provider registered for channel Sms",
        "statusCode": 501
      }
    ]
  }
}
```

> A `501 Not Implemented` result for a channel means no provider is registered for it yet.
> Other channels in the same request still complete normally.

---

### 2. User Registration — Concurrent OTP + Welcome Kit

Demonstrates a real-world use case: OTP via SMS and a welcome document via WhatsApp dispatched
in a single parallel call.

**`POST api/outbound-messaging/user-registration`**  
Auth: `Admin`, `Principal`, `SuperAdmin`

**Request:**
```json
{
  "phoneNumber": "+919876543210",
  "fullName": "Priya Nair",
  "otpCode": "847291",
  "schoolName": "Vitana International School",
  "welcomeCampaignName": "student_welcome_v1",
  "welcomeDocumentUrl": "https://cdn.school.com/welcome-kit-2026.pdf",
  "welcomeDocumentFilename": "WelcomeKit_2026.pdf"
}
```

**Template parameters passed to AiSensy (positional):**  
`[fullName, otpCode, schoolName]`

**Response:** same `ChannelDispatchResponse` shape as `/dispatch`.

---

### 3. Query Delivery Logs

**`GET api/outbound-messaging/logs`**  
Auth: `Admin`, `Principal`, `SuperAdmin`

| Query param | Type | Description |
|-------------|------|-------------|
| `phone` | `string` | Filter by destination phone number |
| `channel` | `string` | Filter by channel name (`WhatsApp`, `Sms`, etc.) |
| `from` | `DateTime` | Start of UTC date range |
| `to` | `DateTime` | End of UTC date range |

```bash
GET api/outbound-messaging/logs?phone=+919876543210&channel=WhatsApp&from=2026-06-01
```

Returns an array of `AuditLog` records. See [Audit Logging](#audit-logging) for field details.

---

## Using the Engine in Code

Inject `IChannelNotificationManager` wherever you need to send messages — controllers, domain
services, background workers. Inject `INotificationLogService` alongside it to persist the result.

```csharp
using SmsApi.Messaging;
using SmsApi.Services.Messaging;
```

### Inject and Call

```csharp
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

### Multi-Channel Concurrent Dispatch

```csharp
var request = new ChannelMessageRequest(
    destination: guardian.PhoneNumber,
    recipientName: guardian.FullName,
    templateOrCampaignIdentifier: "fee_overdue_alert",
    templateParameters: new List<string> { student.Name, fee.Amount.ToString("C"), fee.DueDate.ToString("dd-MMM-yyyy") },
    customAttributes: new Dictionary<string, string>
    {
        ["schoolId"] = schoolId.ToString(),
        ["userId"]   = actingUserId.ToString()
    },
    mediaUrl: receiptUrl,
    mediaFilename: "FeeReceipt.pdf",
    channels: new[] { CommunicationChannel.WhatsApp, CommunicationChannel.Sms }
);

// Both channels fire concurrently — returns one result per channel
var results = await _messaging.SendAsync(request, cancellationToken);

// Audit all results concurrently — exceptions inside LogAsync never propagate up
await Task.WhenAll(results.Select(r => _log.LogAsync(request, r, cancellationToken)));

// Check per-channel outcome
foreach (var result in results)
{
    if (!result.IsSuccess)
        logger.LogWarning("Channel {Ch} failed: {Err}", result.Channel, result.ErrorMessage);
}
```

### Single Channel

Use the convenience constructor (no `customAttributes`, no `mediaUrl`):

```csharp
var request = new ChannelMessageRequest(
    destination: "+919876543210",
    recipientName: "Ramesh Sharma",
    templateOrCampaignIdentifier: "attendance_alert_v1",
    templateParameters: new List<string> { "Aarav", "03-Jun-2026", "Absent" },
    channel: CommunicationChannel.WhatsApp   // single-channel overload
);

var results = await _messaging.SendAsync(request);
```

### Passing Context to the Audit Log

The log service reads `schoolId` and `userId` from `CustomAttributes`. Always populate these
when calling from a tenant-scoped context:

```csharp
customAttributes: new Dictionary<string, string>
{
    ["schoolId"] = schoolId.ToString(),
    ["userId"]   = currentUserId.ToString()
}
```

---

## Audit Logging

Every send attempt — success or failure — is written to the existing `AuditLogs` table.
No new table or migration is required.

| `AuditLogs` column | Value written |
|--------------------|---------------|
| `HttpMethod` | `"POST"` |
| `Path` | `"campaign/t1/api/v2"` |
| `QueryString` | Destination phone number (for indexed lookup) |
| `ActionType` | `"ChannelMessage_Sent"` or `"ChannelMessage_Failed"` |
| `EntityType` | `"WhatsApp"`, `"Sms"`, etc. |
| `StatusCode` | HTTP status from AiSensy (200, 500, etc.) |
| `RequestBody` | JSON: `{ destination, campaign, recipientName, templateParams, messageId }` |
| `ExceptionMessage` | Provider error detail on failure |
| `SchoolId` / `UserId` | Extracted from `CustomAttributes` if supplied |
| `Timestamp` | UTC time of the send attempt |

Query the table directly for debugging:

```sql
-- All WhatsApp failures in the last 24 hours
SELECT * FROM "AuditLogs"
WHERE "ActionType" = 'ChannelMessage_Failed'
  AND "EntityType" = 'WhatsApp'
  AND "Timestamp" >= NOW() - INTERVAL '24 hours'
ORDER BY "Timestamp" DESC;

-- All sends to a specific number
SELECT * FROM "AuditLogs"
WHERE "ActionType" LIKE 'ChannelMessage_%'
  AND "QueryString" = '+919876543210'
ORDER BY "Timestamp" DESC;
```

---

## Adding a New Channel Provider

The engine is designed for zero-friction extension. Adding SMS (or any other channel) requires
two changes only:

**1. Create the provider** — implement `IChannelProvider`:

```csharp
// Messaging/Providers/AiSensy/AiSensySmsProvider.cs
public sealed class AiSensySmsProvider : IChannelProvider
{
    public CommunicationChannel Channel => CommunicationChannel.Sms;

    public async Task<ChannelMessageResult> SendAsync(
        ChannelMessageRequest request, CancellationToken ct = default)
    {
        // Call your SMS API here
        // Return ChannelMessageResult.Success(...) or ChannelMessageResult.Failure(...)
    }
}
```

**2. Register it** in `Extensions/NotificationServicesExtensions.cs`:

```csharp
services.AddScoped<IChannelProvider, AiSensySmsProvider>();
```

That's it. `NotificationManager` picks up the new provider automatically via
`IEnumerable<IChannelProvider>`. No changes to any existing code.

---

## Error Handling

### Provider failures

Provider errors never throw — they return `ChannelMessageResult.Failure(...)` with an `ErrorMessage`
and a `StatusCode`. Check `result.IsSuccess` before acting on the result.

### Polly retry behaviour

The AiSensy HTTP client retries on these conditions (configured in `ResiliencePolicies.cs`):

| Attempt | Delay | Triggered on |
|---------|-------|--------------|
| 1st retry | 2 s | `HttpRequestException`, `TaskCanceledException`, HTTP 408 / 429 / 502 / 503 / 504 |
| 2nd retry | 4 s | same |
| 3rd retry | 8 s | same |

After 3 failed retries, a `ChannelMessageResult.Failure` is returned with `HttpStatusCode.InternalServerError`.

### Invalid channel names

Passing an unrecognised string in `channels` (e.g. `"Telegram"`) returns `HTTP 400` from the
controller with a message listing valid values. This validation happens before any provider is called.

### Unregistered channels

A channel name that is valid (`"Sms"`) but has no registered provider returns
`statusCode: 501` in that channel's result. Other channels in the same request are unaffected.
