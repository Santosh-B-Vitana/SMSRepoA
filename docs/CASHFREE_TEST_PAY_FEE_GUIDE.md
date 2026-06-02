# Cashfree Test Pay Fee Implementation Guide

## Overview

This guide documents the implementation of "Test Pay Fee" button in the parent portal for testing Cashfree payment integration using the redirect payment flow.

## Architecture

### Backend Endpoint
**Endpoint:** `POST /api/fees/test-pay-cashfree`  
**Authorization:** Parent, Student, Admin, Principal  
**Purpose:** Initiate Cashfree payment for parent fee payment

### Request DTO: `TestPayFeeRequest`
```csharp
public class TestPayFeeRequest
{
    public Guid FeeRecordId { get; set; }      // Fee record ID to pay
    public decimal? Amount { get; set; }       // Optional amount (defaults to pending amount)
    public string? ReturnUrl { get; set; }     // Optional return URL after payment
    public string? NotifyUrl { get; set; }     // Optional webhook URL
}
```

### Response DTO
```json
{
  "success": true,
  "transactionId": "string",
  "paymentSessionId": "string",
  "paymentLink": "string",
  "redirectUrl": "string",
  "orderId": "string",
  "amount": 5000,
  "currency": "INR",
  "studentName": "John Doe",
  "feeRecordId": "guid",
  "message": "Payment session created. Redirect to Cashfree checkout."
}
```

## Payment Flow

### 1. Frontend Flow
```
┌─────────────────────────────────────────────────────────┐
│ Parent Portal - Fee Management Page                      │
├─────────────────────────────────────────────────────────┤
│                                                            │
│  Per Child Fee Card:                                       │
│  ┌──────────────────────────────────────────────┐        │
│  │ Child Name: John Doe (Class 10-A)            │        │
│  │ Total: ₹50,000 | Paid: ₹25,000               │        │
│  │ Pending: ₹25,000                             │        │
│  │                                               │        │
│  │ [View Details] [Pay Now] [Test Pay Fee] ←─┐ │        │
│  └──────────────────────────────────────────────┘        │
│                                     │                      │
│                                     ▼                      │
│  Dialog: "Initiate Cashfree Payment"                      │
│  ┌──────────────────────────────────────────────┐        │
│  │ TEST MODE Badge                              │        │
│  │                                               │        │
│  │ Payment Details:                              │        │
│  │ Student: John Doe                            │        │
│  │ Amount: ₹25,000                              │        │
│  │ Currency: INR                                 │        │
│  │                                               │        │
│  │ Test Card: 4111111111111111                  │        │
│  │ Expiry: Any future date                      │        │
│  │ CVV: Any 3 digits                            │        │
│  │                                               │        │
│  │ [Cancel] [Pay ₹25,000] ──┐                  │        │
│  └──────────────────────────────────────────────┘        │
│                           │                                │
│                           ▼                                │
│  API Call: POST /api/fees/test-pay-cashfree               │
└─────────────────────────────────────────────────────────┘
```

### 2. Backend Flow
```
┌──────────────────────────────────────────────────────────┐
│ Backend: test-pay-cashfree Endpoint                       │
├──────────────────────────────────────────────────────────┤
│                                                             │
│  1. Get Fee Record                                         │
│     - Validate fee record exists                           │
│     - Validate school/tenant context                      │
│     - Validate pending amount > 0                         │
│                                                             │
│  2. Authorization Check                                    │
│     - For Parent/Student: verify can access student       │
│     - For Admin/Principal: no additional checks           │
│                                                             │
│  3. Get Cashfree Config                                    │
│     - Get merchant ID & API key                            │
│     - Get API secret for signature generation             │
│     - Verify gateway is active                            │
│                                                             │
│  4. Generate Order Details                                 │
│     - Create Order ID: ORDER-{SCHOOL_ID}-{FEE_ID}-{TS}    │
│     - Get customer info (parent/guardian)                 │
│     - Build payment metadata                              │
│                                                             │
│  5. Call Payment Gateway Service                           │
│     - Create InitiatePaymentRequest                        │
│     - Call _paymentGatewayService.InitiatePaymentAsync()   │
│     - Returns payment session & redirect URL               │
│                                                             │
│  6. Create Audit Log                                       │
│     - Log payment initiation event                         │
│     - Store payment session ID                            │
│     - Store order ID & metadata                           │
│                                                             │
│  7. Return Response                                        │
│     - Return redirect URL to frontend                      │
│                                                             │
└──────────────────────────────────────────────────────────┘
```

### 3. Cashfree Redirect Flow
```
┌──────────────────────────────────────────────────────────┐
│ Cashfree Integration (Redirect Payment)                   │
│ Docs: https://www.cashfree.com/docs/payments/online/web/redirect
├──────────────────────────────────────────────────────────┤
│                                                             │
│  1. Create Payment Session                                 │
│     ▼                                                       │
│  POST /api/payments/orders                                 │
│  {                                                         │
│    "order_amount": 25000,                                 │
│    "order_currency": "INR",                               │
│    "order_id": "ORDER-xxx-xxx-xxx",                       │
│    "customer": {                                           │
│      "customer_name": "Guardian Name",                    │
│      "customer_email": "guardian@email.com",              │
│      "customer_phone": "9876543210"                       │
│    },                                                      │
│    "order_meta": {                                         │
│      "return_url": "https://app.com/payment-callback"     │
│    }                                                       │
│  }                                                         │
│  ▼                                                         │
│  Returns: payment_session_id                              │
│                                                             │
│  2. Redirect to Checkout                                   │
│     ▼                                                       │
│  https://checkout.cashfree.com/pay/{payment_session_id}   │
│                                                             │
│  3. Customer Completes Payment                             │
│     - Selects payment method                              │
│     - Enters payment details (card/UPI/netbanking)        │
│     - Completes payment on Cashfree                       │
│                                                             │
│  4. Cashfree Processes Payment                             │
│     ▼                                                       │
│  POST {return_url}?order_id=xxx&cf_payment_id=xxx         │
│                                                             │
│  5. Webhook Notification                                   │
│     ▼                                                       │
│  POST {notify_url}                                         │
│  Payload: CashfreeWebhookRequest (signed)                 │
│                                                             │
│  6. Backend Callback Handler                               │
│     - Verify HMAC-SHA256 signature                        │
│     - Update fee record status                            │
│     - Create payment record                               │
│     - Return success                                      │
│                                                             │
└──────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Backend Implementation

#### Endpoint Code Location
**File:** `Controllers/FeesController.cs`  
**Method:** `TestPayFeeCashfree()`  
**Lines:** See endpoint implementation

#### Key Features
- **Authorization:** Validates parent/student can only access their own child's fees
- **Fee Validation:** Ensures fee record has pending amount
- **Amount Validation:** Validates requested amount doesn't exceed pending
- **Configuration:** Retrieves Cashfree merchant settings
- **Order Generation:** Creates unique order ID with school/fee identifiers
- **Audit Logging:** Logs all payment initiation events
- **Error Handling:** Comprehensive error responses for validation failures

#### Environment Setup
```csharp
// Cashfree Configuration (Required in appsettings.json)
{
  "PaymentGateways": {
    "Cashfree": {
      "MerchantId": "your_merchant_id",
      "ApiKey": "your_api_key",
      "ApiSecret": "your_api_secret",
      "Mode": "Test|Production",
      "ApiVersion": "2023-08-01"
    }
  }
}
```

### 2. Frontend Implementation

#### Component Location
**File:** `ui/src/components/fees/CashfreeTestPayButton.tsx`

#### Features
- **Dialog-based UI:** Clean confirmation dialog before payment
- **Test Mode Badge:** Indicates test environment
- **Payment Details Display:** Shows amount, student, fee record info
- **Test Card Display:** Shows test credentials for sandbox
- **Error Handling:** Displays validation and network errors
- **Loading States:** Shows processing status
- **Auto-redirect:** Redirects to Cashfree checkout on success
- **Callback URL:** Returns to app after payment completion

#### Component Props
```typescript
interface CashfreeTestPayButtonProps {
  feeRecordId: string;           // Fee record to pay
  studentName: string;           // Student name display
  amount: number;                // Payment amount
  onPaymentSuccess?: () => void;  // Callback on success
  variant?: "default" | "secondary" | "outline";
  size?: "default" | "sm" | "lg";
}
```

#### Integration in Parent Fees Page
```typescript
<CashfreeTestPayButton
  feeRecordId={cf.feeRecords[0]?.id || ""}
  studentName={cf.child.name}
  amount={cf.pendingAmount}
  onPaymentSuccess={() => {
    loadFees(); // Refresh data
  }}
  size="sm"
/>
```

### 3. Data Flow

#### Database Records Created
1. **FeeAuditLog:** Payment initiation event
   - Action: "cashfree_payment_initiated"
   - Stores order ID & session details
   - Records amount & timestamp

2. **PaymentTransaction:** (via PaymentGatewayService)
   - Status: "Initiated" → "Pending" → "Success"
   - Stores gateway order ID
   - Stores payment session ID

3. **FeeRecord:** Updated on webhook callback
   - PaidAmount: Updated with payment amount
   - PendingAmount: Recalculated
   - Status: "partial" → "paid"
   - LastPaymentDate: Set to callback timestamp

## Testing Checklist

### Unit Tests
- [ ] Unauthorized access rejection (non-parent)
- [ ] Fee record not found error
- [ ] Pending amount validation
- [ ] Amount exceeds pending error
- [ ] Cashfree config not found error
- [ ] Order ID generation uniqueness
- [ ] Audit log creation
- [ ] Response structure validation

### Integration Tests
- [ ] End-to-end payment flow (sandbox)
- [ ] Webhook signature verification
- [ ] Fee record update on payment success
- [ ] Notification generation
- [ ] Receipt creation

### Manual Testing
- [ ] Click "Test Pay Fee" button
- [ ] Dialog shows correct payment details
- [ ] Dialog shows test card credentials
- [ ] Click "Pay" redirects to Cashfree
- [ ] Use test card 4111111111111111
- [ ] Complete payment on Cashfree
- [ ] Redirected back to app
- [ ] Fee record status updated to "paid"
- [ ] Receipt generated and available
- [ ] Parent receives payment confirmation notification

### Test Data Setup
```sql
-- Sample test student
INSERT INTO Students VALUES (...)

-- Sample test fee record
INSERT INTO FeeRecords VALUES (
  Id = NEWID(),
  StudentId = <test_student_id>,
  SchoolId = <school_id>,
  FeeStructureId = <structure_id>,
  TotalAmount = 25000,
  PaidAmount = 0,
  PendingAmount = 25000,
  Status = 'Pending',
  DueDate = GETDATE() + 15
)

-- Cashfree configuration
INSERT INTO PaymentGatewayConfigs VALUES (
  GatewayName = 'Cashfree',
  MerchantId = 'test_merchant_id',
  ApiKey = 'test_api_key',
  ApiSecret = 'test_api_secret',
  Mode = 'Test',
  IsActive = 1,
  IsDefault = 1
)
```

## Sandbox Testing

### Cashfree Test Credentials
- **Test Card:** 4111111111111111
- **Expiry:** Any future date (MM/YY)
- **CVV:** Any 3 digits
- **Name:** Any name

### Test Transactions
- **Amount:** Any amount
- **Status:** Payment succeeds immediately in sandbox
- **Webhook:** Triggered automatically

### Sandbox Endpoints
- **Checkout:** https://checkout.cashfree.com/pay/{payment_session_id}
- **API Base:** https://sandbox.cashfree.com/api/v2/

## Production Deployment

### Checklist
- [ ] Update appsettings.Production.json with live credentials
- [ ] Change Mode from "Test" to "Production"
- [ ] Configure production Cashfree merchant account
- [ ] Update return URLs to production domain
- [ ] Configure webhook URLs to production domain
- [ ] Set up SSL/TLS certificates
- [ ] Configure DNS records
- [ ] Test webhook signature verification
- [ ] Load test with multiple concurrent payments
- [ ] Set up payment monitoring & alerting
- [ ] Create incident response procedures

### Production Configuration
```json
{
  "PaymentGateways": {
    "Cashfree": {
      "MerchantId": "live_merchant_id",
      "ApiKey": "live_api_key",
      "ApiSecret": "live_api_secret",
      "Mode": "Production",
      "ApiVersion": "2023-08-01",
      "ReturnUrl": "https://app.yourdomain.com/parent-fees/payment-callback",
      "WebhookUrl": "https://app.yourdomain.com/api/payment-gateway/webhook/cashfree"
    }
  }
}
```

## Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Fee record not found" | Invalid fee record ID | Verify fee record exists for student |
| "No pending fees" | Fee record fully paid | Show "All fees paid" message |
| "Cashfree not configured" | No gateway config | Configure Cashfree in admin settings |
| "Invalid amount" | Amount exceeds pending | Cap amount to pending value |
| "Unauthorized" | Parent/student mismatch | Verify parent-student relationship |
| "Redirect URL mismatch" | Invalid return URL | Use configured webhook URL |
| "Signature verification failed" | Invalid webhook signature | Check HMAC secret & algorithm |
| "Payment not found" | Orphaned webhook | Check database constraints |

## Security Considerations

### Implemented
- ✅ **HTTPS/TLS:** All communication encrypted
- ✅ **HMAC-SHA256:** Webhook signature verification
- ✅ **Authorization:** Role-based access control
- ✅ **Amount Validation:** Server-side amount verification
- ✅ **Input Sanitization:** All inputs validated
- ✅ **SQL Injection Prevention:** Parameterized queries
- ✅ **CSRF Protection:** Built into ASP.NET Core
- ✅ **Rate Limiting:** Standard API rate limiting
- ✅ **Audit Logging:** All payment events logged
- ✅ **Sensitive Data:** No sensitive data stored locally

### Best Practices
- Never store payment method details
- Always verify signature server-side
- Use HTTPS for all redirects
- Implement request timeout
- Log all errors securely
- Monitor fraud patterns
- Regular security audits

## Monitoring & Analytics

### Metrics to Track
- Total payment volume
- Payment success rate
- Failed payment rate
- Average transaction time
- Payment method distribution
- Peak transaction times
- Error rates by type
- User drop-off at each step

### Alerts to Set
- Payment gateway unavailable
- High error rate (>5%)
- Webhook delivery failures
- Signature verification failures
- Unusual transaction amounts
- Rate limit exceeded

## Troubleshooting

### Payment not going through
1. Check Cashfree configuration
2. Verify test/production mode
3. Check internet connectivity
4. Try test card: 4111111111111111
5. Check browser console for errors

### Webhook not updating fee record
1. Verify webhook URL is correct
2. Check HMAC secret matches
3. Verify signature verification code
4. Check database constraints
5. Review server logs

### Redirect loop issues
1. Verify return URL is correct
2. Check CORS settings
3. Verify session cookies
4. Clear browser cache
5. Try incognito/private mode

## Support & Documentation

### Documentation Links
- [Cashfree API Docs](https://www.cashfree.com/docs/payments/online/web/redirect)
- [Redirect Payment Flow](https://www.cashfree.com/docs/payments/online/web/redirect)
- [Webhook Documentation](https://www.cashfree.com/docs/payments/online/web/webhooks)
- [Test Environment](https://www.cashfree.com/docs/payments/online/web/test)

### Contact & Support
- **Cashfree Support:** support@cashfree.com
- **Technical Issues:** Check logs and contact development team
- **Payment Issues:** Contact Cashfree directly with transaction ID

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-05-30 | Initial implementation |
| - | - | - |

## Related Files

- Backend: [FeesController.cs](../../Controllers/FeesController.cs)
- Frontend: [CashfreeTestPayButton.tsx](../../components/fees/CashfreeTestPayButton.tsx)
- Page: [ParentFees.tsx](../../pages/ParentFees.tsx)
- DTOs: [PaymentGatewayDTOs.cs](../../Models/DTOs/PaymentGatewayDTOs.cs)
- Service: [PaymentGatewayService.cs](../../Services/PaymentGatewayService.cs)
- Controller: [PaymentGatewayController.cs](../../Controllers/PaymentGatewayController.cs)
