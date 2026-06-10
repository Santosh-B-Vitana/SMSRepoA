# EP-18: WhatsApp Integration Readiness

> **Epic ID:** EP-18  
> **Priority:** P2  
> **Estimated Sprints:** 1  
> **Phase:** 4 — Sprint 28  
> **Related Docs:** [09-push-notification-architecture](../09-push-notification-architecture.md) · [07-feature-flag-architecture](../07-feature-flag-architecture.md)

---

## Business Objective

Vitana SMS has a complete WhatsApp communication hub (just shipped: backend WhatsApp module with Meta Cloud API, template management, delivery tracking, billing). Parents in India already receive school communications via WhatsApp. The mobile app should surface WhatsApp delivery analytics to admins and allow admins to trigger WhatsApp campaigns from the app, aligning with where schools already communicate.

This epic is about **mobile surfaces for the existing WhatsApp backend** — not about building new WhatsApp infrastructure.

## Technical Objective

Build admin-facing mobile screens for WhatsApp analytics, template browsing, and campaign trigger; build a delivery channel coordination layer in the notification system so push and WhatsApp are complementary (not duplicate); and expose WhatsApp opt-in settings to parents.

---

## Current State Analysis

**Backend (fully implemented):**
- `GET /api/whatsapp/analytics/dashboard` — delivery rate, open rate, message counts.
- `GET /api/whatsapp/templates` — approved Meta templates.
- `GET /api/whatsapp/usage` — quota and usage.
- `POST /api/whatsapp/messages` — trigger message send.
- `GET /api/whatsapp/contacts` — opt-in/opt-out status per parent.
- `GET/PUT /api/whatsapp/settings` — school WhatsApp configuration.
- `GET /api/super-admin/whatsapp/dashboard` — platform-wide analytics.

**Mobile:** No WhatsApp screens exist.

**Channel coordination:** Currently notification service always sends push. When WhatsApp is enabled and parent has opted in, should prefer WhatsApp for key events (fee overdue, result published) and use push for real-time events (absent marking).

---

## Functional Requirements

### Admin WhatsApp Dashboard (Mobile)

| ID | Requirement |
|---|---|
| FR-1 | WhatsApp analytics overview: delivery rate, sent count, failures |
| FR-2 | Monthly usage vs. quota visualization |
| FR-3 | Recent messages list with status (queued/sent/delivered/failed) |
| FR-4 | Template list (approved templates with preview) |
| FR-5 | Trigger ad-hoc WhatsApp campaign to class/school |
| FR-6 | Feature-flag gated (only shown if `mobile.communication.whatsapp_trigger`) |

### Parent WhatsApp Opt-In Settings

| ID | Requirement |
|---|---|
| FR-7 | Parent sees WhatsApp communication preference in settings |
| FR-8 | Opt-in/out toggle for WhatsApp notifications |
| FR-9 | Phone number shown (masked) for WhatsApp delivery |
| FR-10 | "Update WhatsApp number" redirect to school contact |

### Notification Channel Coordination

| ID | Requirement |
|---|---|
| FR-11 | Backend `NotificationService` checks WhatsApp eligibility before push |
| FR-12 | High-priority events (fee_overdue, result_published): WhatsApp preferred |
| FR-13 | Real-time events (attendance_absent): always push (WhatsApp too slow) |
| FR-14 | Fallback to push if WhatsApp delivery fails |
| FR-15 | No duplicate: if WhatsApp sent, don't also send push |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | WhatsApp analytics dashboard loads in < 2s |
| NFR-2 | Channel selection logic adds < 10ms to notification dispatch |
| NFR-3 | Quota remaining shown accurately (updated every 5 min via Hangfire) |

---

## API Requirements

| Method | Endpoint | Status |
|---|---|---|
| GET | `/api/whatsapp/analytics/dashboard` | Exists |
| GET | `/api/whatsapp/usage` | Exists |
| GET | `/api/whatsapp/templates` | Exists |
| POST | `/api/whatsapp/messages` | Exists |
| GET | `/api/whatsapp/contacts?userId=X` | Exists |
| PUT | `/api/whatsapp/contacts/{id}/opt-out` | Exists |
| PUT | `/api/whatsapp/contacts/{id}/opt-in` | Exists |
| GET | `/api/whatsapp/settings` | Exists |

---

## Mobile Screens

| Screen | Route | Role |
|---|---|---|
| WhatsApp Analytics | `/(admin)/whatsapp/` | Admin |
| Template Browser | `/(admin)/whatsapp/templates` | Admin |
| Send Campaign | `/(admin)/whatsapp/campaign` | Admin |
| WhatsApp Preferences | `/(parent)/profile/whatsapp` | Parent |

---

## Channel Coordination Logic (Backend)

```csharp
// Updated NotificationService
async Task DispatchNotificationAsync(NotificationRequest request)
{
    bool whatsappSent = false;
    
    // WhatsApp preferred for high-value, non-real-time events
    if (ShouldPreferWhatsApp(request.Type) 
        && await _whatsAppEligibilityChecker.IsEligibleAsync(request.UserId))
    {
        var templateMapping = await _whatsAppTemplateService
            .GetMappingForEventAsync(request.Type);
        if (templateMapping != null)
        {
            await _whatsAppService.EnqueueAsync(request.UserId, templateMapping, request.Data);
            whatsappSent = true;
        }
    }
    
    // Always send push for real-time events; fallback if WhatsApp not sent
    if (!whatsappSent || IsRealTimeEvent(request.Type))
    {
        await _pushNotificationService.SendToUserAsync(request.UserId, BuildPushPayload(request));
    }
    
    // Always create in-app notification
    await SaveInAppNotificationAsync(request);
}

private static bool ShouldPreferWhatsApp(string notificationType) =>
    notificationType is "fee_overdue" or "result_published" or "report_card_ready"
        or "billing_expiry_warning";

private static bool IsRealTimeEvent(string notificationType) =>
    notificationType is "attendance_absent" or "new_message" or "timetable_change";
```

---

## WhatsApp Dashboard Wireframe (Admin Mobile)

```
WhatsApp — This Month
─────────────────────────────────
  DELIVERY OVERVIEW
  Sent: 1,240   Delivered: 1,198   Failed: 42
  Delivery Rate: 96.6%
─────────────────────────────────
  QUOTA USAGE
  ████████░░░░  1,240 / 2,000 messages
  Resets Jul 1
─────────────────────────────────
  RECENT MESSAGES
  Fee Reminder — Sent to 340 parents  Jun 10  ✓
  Result Published — 280 students     Jun 8   ✓
  Failed: 3 messages                  Jun 7   ✗
─────────────────────────────────
  [Send Campaign ▶]
─────────────────────────────────
```

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-18-US-01 | WhatsApp analytics dashboard (admin) | 3 |
| EP-18-US-02 | Template browser + campaign trigger | 5 |
| EP-18-US-03 | Parent WhatsApp opt-in settings | 3 |
| EP-18-US-04 | Channel coordination logic (backend) | 5 |
| EP-18-US-05 | Feature flag gating for WhatsApp screens | 1 |

**Total:** 17 story points / 1 sprint

---

## Acceptance Criteria

- [ ] WhatsApp analytics shows correct delivery rate from backend.
- [ ] Campaign trigger sends WhatsApp to a test parent.
- [ ] Parent opt-out via mobile settings → backend marks opt-out.
- [ ] `fee_overdue` event: if WhatsApp eligible → WhatsApp sent, not push.
- [ ] `attendance_absent` event: always push (regardless of WhatsApp).
- [ ] WhatsApp screens only shown if `mobile.communication.whatsapp_trigger` flag is on.
- [ ] Quota usage updates within 5 minutes of sending messages.

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 28 | All WhatsApp mobile surfaces + channel coordination logic |

---

## Future Enhancements

- WhatsApp conversation inbox on mobile (inbound message viewing).
- Automated campaign scheduler on mobile.
- WhatsApp template creation from mobile.
- Super Admin platform-wide WhatsApp usage dashboard.
