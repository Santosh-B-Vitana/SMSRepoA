# EP-07: Fee Module (Parent & Student)

> **Epic ID:** EP-07  
> **Priority:** P0  
> **Estimated Sprints:** 2  
> **Phase:** 1 — Sprint 4  
> **Related Docs:** [03-api-analysis](../03-api-analysis.md) · [EP-03-parent-app](./EP-03-parent-app.md)

---

## Business Objective

Fee collection is a critical revenue function for schools and one of the highest-friction workflows for parents. A parent currently needs to: visit the school, find the office, queue, pay, and get a receipt. The mobile fee payment removes every step except "pay." For Vitana, a smooth fee payment experience is a direct commercial argument for adoption. Schools with Cashfree enabled have demonstrably higher parent engagement.

**Target:** 60% of fee payments shift to mobile channel within 6 months of launch.

## Technical Objective

Build the complete fee viewing and online payment experience for parents: fee summary, breakdown by fee head, Cashfree mobile payment initiation, payment receipt viewing/sharing, and payment history. Students get a read-only fee view.

---

## Current State Analysis

Backend provides:
- `GET /api/fees/records?studentId=X` — full fee ledger with breakdown per fee head.
- `POST /api/fees/payments/gateway/initiate` — web redirect flow (NOT usable on mobile).
- `POST /api/fees/payments/gateway/callback` — Cashfree webhook.
- `GET /api/fees/payments/{id}/receipt` — PDF receipt download.
- `GET /api/fees/stats` — aggregate stats (for admin).

**Gap:** No mobile-specific payment initiation. The web flow returns a redirect URL that opens Cashfree's hosted checkout page. On mobile, this approach works but is suboptimal. Cashfree provides a React Native SDK (`cashfree-pg-api-contract`) with a `CheckoutSession` that opens in a bottom sheet within the app.

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | Parent sees total outstanding amount prominently |
| FR-2 | Fee breakdown per head: Tuition, Library, Lab, Sports, etc. |
| FR-3 | Late fee shown separately with calculation |
| FR-4 | "Pay Now" button initiates mobile payment |
| FR-5 | Cashfree mobile checkout supports UPI, Cards, Netbanking, Wallets |
| FR-6 | On payment success: fee summary refreshes automatically |
| FR-7 | Payment receipt immediately accessible after payment |
| FR-8 | Receipt PDF viewable in app (Expo WebBrowser) |
| FR-9 | Share receipt via native share sheet |
| FR-10 | Payment history list (date, amount, method, receipt number) |
| FR-11 | Partial payment supported (pay specific amount) |
| FR-12 | Fee concession display (shows discounted amount, not original) |
| FR-13 | RTE concession shown with "RTE Eligible" badge |
| FR-14 | Student sees fee summary (read-only, no payment button) |
| FR-15 | Payment button disabled and shows "Online required" when offline |
| FR-16 | Screen recording protection on payment screen |
| FR-17 | Multi-child: parent switches child to see that child's fees |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Payment initiation < 1 second (server responds fast, SDK opens) |
| NFR-2 | Cashfree SDK loads < 2 seconds on 4G |
| NFR-3 | Fee summary cached (TanStack Query 10 min stale time) |
| NFR-4 | Screen recording protection active during entire payment flow |
| NFR-5 | Payment verification idempotent (double-tapping Pay doesn't double-charge) |

---

## API Requirements

| Method | Endpoint | Status | Notes |
|---|---|---|---|
| GET | `/api/fees/records?studentId=X` | Exists | Full fee ledger |
| POST | `/api/fees/payments/mobile-initiate` | TO BUILD | Returns `paymentSessionId` |
| POST | `/api/fees/payments/verify` | TO BUILD | Confirm after SDK callback |
| GET | `/api/fees/payments/{id}/receipt` | Exists | Receipt PDF URL |
| GET | `/api/fees/payments?studentId=X` | Exists | Payment history |

### New Endpoint: `POST /api/fees/payments/mobile-initiate`

```json
Request:
{
  "studentId": "uuid",
  "amount": 12500.00,
  "description": "Fee payment - Aarav Sharma"
}

Response:
{
  "cfOrderId": "order_abc123",
  "paymentSessionId": "session_xyz",
  "amount": 12500.00,
  "currency": "INR",
  "expiresAt": "2026-06-10T19:00:00Z"
}
```

The `paymentSessionId` is passed directly to the Cashfree React Native SDK.

### New Endpoint: `POST /api/fees/payments/verify`

Called by mobile after Cashfree SDK callback to confirm payment on server side.

```json
Request: { "cfOrderId": "order_abc123", "cfPaymentId": "pay_xyz" }
Response: { "status": "SUCCESS", "paymentId": "internal-uuid", "receiptNumber": "R-2024-0042" }
```

---

## Mobile Screens

| Screen | Route |
|---|---|
| Fee Summary (Parent) | `/(parent)/fees/` |
| Cashfree Payment | `/(parent)/fees/pay` |
| Payment Success | `/(parent)/fees/pay/success` |
| Payment Failed | `/(parent)/fees/pay/failed` |
| Receipt Viewer | `/(parent)/fees/receipt/[id]` |
| Payment History | `/(parent)/fees/history` |
| Fee Summary (Student - read only) | `/(student)/fees/` |

---

## Payment Flow (Detailed)

```
Parent taps "Pay Now"
      │
      ▼
Pre-payment screen:
  - Amount to pay (editable, default: full outstanding)
  - Payment purpose summary
  - "Proceed to Pay" CTA
      │
      ▼
expo-screen-capture.preventScreenCaptureAsync()
      │
      ▼
POST /api/fees/payments/mobile-initiate
Response: { paymentSessionId, cfOrderId }
      │
      ▼
Cashfree.openCheckout({ paymentSessionId })
  → Bottom sheet opens with UPI / Card / Netbanking options
      │
      ├── onPaymentSuccess({ orderId, paymentId })
      │     → POST /api/fees/payments/verify
      │     → Invalidate fee query
      │     → Navigate to /fees/pay/success
      │     → Show confetti + receipt number
      │
      ├── onPaymentFailure({ orderId, message })
      │     → Navigate to /fees/pay/failed
      │     → Show retry button
      │
      └── onPaymentCancel
            → Navigate back to fee summary
      │
      ▼
expo-screen-capture.allowScreenCaptureAsync()
```

---

## Receipt Design

```
Payment Receipt
─────────────────────────────
  [School Logo]    [Vitana SMS]
  Receipt No: R-2024-0042
  Date: Jun 10, 2026  3:47 PM
─────────────────────────────
  Student: Aarav Sharma
  Class: 8A | Roll No: 15
─────────────────────────────
  Tuition Fee:      ₹8,000
  Library Fee:      ₹500
  Sports Fee:       ₹500
  ─────────────────────────
  Total Paid:       ₹9,000
─────────────────────────────
  Payment Method: UPI
  Transaction ID: TXN987654321
─────────────────────────────
  [Download PDF]  [Share]
```

---

## Edge Cases

| Case | Handling |
|---|---|
| Cashfree payment times out (30 min) | `paymentSessionId` expires; generate new one |
| User returns to app after payment without callback | Poll `GET /api/fees/payments/gateway/status/{orderId}` |
| Parent pays more than outstanding | Backend creates advance balance (wallet); shown on fee summary |
| RTE student — zero fee | "Pay Now" hidden; "Fee Waived (RTE)" shown |
| School's Cashfree credentials not configured | "Online payment not available. Please pay at school office." |

---

## User Stories

| ID | Story | SP |
|---|---|---|
| EP-07-US-01 | View fee summary with breakdown | 3 |
| EP-07-US-02 | Cashfree mobile payment with SDK | 8 |
| EP-07-US-03 | Payment receipt viewer + share | 3 |
| EP-07-US-04 | Payment history list | 2 |
| EP-07-US-05 | Fee summary for students (read-only) | 2 |
| EP-07-US-06 | Payment timeout and status polling | 3 |

**Total:** 21 story points / 2 sprints

---

## Acceptance Criteria

- [ ] Fee breakdown matches backend data (all fee heads shown).
- [ ] Cashfree SDK checkout opens on Android and iOS.
- [ ] Payment success → fee balance updates immediately.
- [ ] Receipt number shown on success screen.
- [ ] Payment receipt PDF opens in browser.
- [ ] Share receipt opens native share sheet.
- [ ] Payment history shows last 10 transactions.
- [ ] Double-tap "Pay" does not create two orders.
- [ ] Screen recording protection active during payment flow.
- [ ] "Payment not available" shown when Cashfree not configured for school.

---

## Sprint Breakdown

| Sprint | Scope |
|---|---|
| Sprint 4 | Fee summary screen + mobile-initiate API + Cashfree SDK |
| Sprint 5 | Receipt viewer + share + payment history + student read-only + edge cases |
