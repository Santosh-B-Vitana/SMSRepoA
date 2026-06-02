# Cashfree Authentication Error - Troubleshooting Guide

## Error: 401 - Authentication Failed

If you're seeing:
```json
{
  "message": "Failed to create payment order: Cashfree order creation failed (401): { \"message\": \"authentication Failed\", ... }"
}
```

This means your Cashfree credentials are either **missing, incorrect, or for the wrong environment**.

## Step 1: Get Your Cashfree Credentials

### For Test/Sandbox Environment:
1. Go to https://www.cashfree.com/dashboard
2. Login with your Cashfree account
3. Switch to **Sandbox** environment (top selector)
4. Go to **Settings → API Keys**
5. You'll see:
   - **Client ID** (looks like: `test0000xxxxx`)
   - **Client Secret** (long alphanumeric string)

### For Production Environment:
1. Same as above, but switch to **Production** environment
2. Get your production credentials

**⚠️ IMPORTANT:** Test credentials only work in Sandbox mode, Production credentials only work in Production mode!

## Step 2: Configure in Database

You need to add/update the Cashfree configuration in your database. Use the admin endpoint:

### Option A: Via API (Recommended)

**POST** `/api/payment-gateway/configs`

```json
{
  "gatewayName": "Cashfree",
  "merchantId": "your_merchant_id",
  "apiKey": "YOUR_CLIENT_ID_HERE",
  "apiSecret": "YOUR_CLIENT_SECRET_HERE",
  "mode": "Test",
  "currency": "INR",
  "isActive": true,
  "isDefault": true,
  "transactionFeePercentage": 2.0,
  "webhookUrl": "https://yourdomain.com/api/payment-gateway/webhook/cashfree",
  "returnUrl": "https://yourdomain.com/parent-fees/payment-callback",
  "callbackUrl": "https://yourdomain.com/parent-fees/payment-callback"
}
```

### Option B: Via Database (Direct SQL)

```sql
INSERT INTO PaymentGatewayConfigs (
  Id,
  SchoolId,
  GatewayName,
  MerchantId,
  ApiKey,
  ApiSecret,
  Mode,
  Currency,
  IsActive,
  IsDefault,
  TransactionFeePercentage,
  WebhookUrl,
  ReturnUrl,
  CallbackUrl,
  CreatedAt,
  UpdatedAt,
  CreatedBy,
  UpdatedBy
) VALUES (
  NEWID(),
  '<YOUR_SCHOOL_ID>',
  'Cashfree',
  'your_merchant_id',
  'test0000xxxxx',  -- Your Cashfree Client ID
  'your_client_secret_here',  -- Your Cashfree Client Secret
  'Test',  -- Change to 'Production' for live
  'INR',
  1,  -- IsActive = true
  1,  -- IsDefault = true
  2.0,
  'https://yourdomain.com/api/payment-gateway/webhook/cashfree',
  'https://yourdomain.com/parent-fees/payment-callback',
  'https://yourdomain.com/parent-fees/payment-callback',
  GETDATE(),
  GETDATE(),
  '<ADMIN_USER_ID>',
  '<ADMIN_USER_ID>'
)
```

## Step 3: Verify Configuration

### Check in Database
```sql
SELECT 
  Id,
  GatewayName,
  ApiKey,  -- Should show your Client ID (first 10 chars visible if encrypted)
  Mode,
  IsActive,
  IsDefault
FROM PaymentGatewayConfigs
WHERE GatewayName = 'Cashfree'
```

### Check Credentials are Correct
- Credentials should match the Mode you selected:
  - **Test credentials** → **Test mode**
  - **Production credentials** → **Production mode**
- Do NOT mix them!

## Step 4: Test the Payment

### Using Test Card (Sandbox Only)
```
Card Number: 4111111111111111
Expiry Date: Any future date (MM/YY)
CVV: Any 3 digits
Name: Any name
```

### Expected Test Results
- With valid test credentials in Test mode: ✅ Payment succeeds
- With production credentials in Test mode: ❌ 401 Error
- With test credentials in Production mode: ❌ 401 Error

## Field Mapping: What Goes Where

| Cashfree Dashboard | Database Field | Example |
|-------------------|-----------------|---------|
| Client ID | `ApiKey` | `test0000xxxxx` |
| Client Secret | `ApiSecret` | `abcdef123456...` |
| Environment | `Mode` | `Test` or `Production` |

## Common Issues & Solutions

### Issue 1: "authentication Failed" 401

**Cause:** Invalid credentials

**Solutions:**
- ✓ Double-check Client ID from Cashfree dashboard
- ✓ Double-check Client Secret from Cashfree dashboard
- ✓ Verify credentials are for the correct environment
- ✓ Ensure no extra spaces or line breaks in credentials
- ✓ Try copying credentials again from Cashfree dashboard

### Issue 2: Test credentials not working

**Cause:** Using production credentials or vice versa

**Solutions:**
- ✓ Verify Mode = "Test" for test credentials
- ✓ Verify Mode = "Production" for production credentials
- ✓ Check Cashfree dashboard shows you're in correct environment

### Issue 3: Can't find credentials in Cashfree dashboard

**Cause:** Account or permission issue

**Solutions:**
- ✓ Verify you're logged into correct Cashfree account
- ✓ Verify account has API access enabled
- ✓ Check with Cashfree support if account is in good standing

### Issue 4: Credentials seem correct but still getting 401

**Cause:** Credentials might be encrypted/stored incorrectly

**Solutions:**
- ✓ Delete the config and re-add it
- ✓ Check server logs for detailed error
- ✓ Verify webhook URL is accessible (optional but recommended)

## Verification Checklist

Before testing payment, verify:

- [ ] I have Cashfree account (https://www.cashfree.com)
- [ ] I found Client ID in dashboard
- [ ] I found Client Secret in dashboard
- [ ] I verified I'm in correct environment (Test vs Production)
- [ ] I configured credentials in database (ApiKey = Client ID, ApiSecret = Client Secret)
- [ ] I verified Mode matches environment (Test/Production)
- [ ] I verified IsActive = true and IsDefault = true
- [ ] I'm using test card 4111111111111111 for test payments
- [ ] I checked server logs for any additional errors

## Server Logs

Check the application logs for more details:

```
[Information] Initiating Cashfree order - Amount: 5000, Mode: Test, Environment: Sandbox
[Error] Cashfree authentication failed for school XXX. Check credentials...
```

This tells you:
- What amount is being processed
- What mode/environment is configured
- Specific authentication issue

## Need More Help?

### Cashfree Support
- Website: https://www.cashfree.com
- Documentation: https://www.cashfree.com/docs/payments/online/web/redirect
- Support: support@cashfree.com
- Test Credentials: Available in Sandbox environment dashboard

### Internal Support
- Check application event logs
- Verify database configuration
- Review the error message in the API response

## Configuration Template

Use this as a reference when setting up:

```
GatewayName: Cashfree
MerchantId: <from Cashfree dashboard>
ApiKey: <Client ID from Cashfree dashboard - test0000xxxxx for sandbox>
ApiSecret: <Client Secret from Cashfree dashboard>
Mode: Test (for development) or Production (for live)
Currency: INR
IsActive: true
IsDefault: true
TransactionFeePercentage: 2.0
WebhookUrl: https://yourdomain.com/api/payment-gateway/webhook/cashfree
ReturnUrl: https://yourdomain.com/parent-fees/payment-callback
CallbackUrl: https://yourdomain.com/parent-fees/payment-callback
```

## After Fixing Credentials

1. Update configuration in database
2. Restart application (or clear cache)
3. Try payment again
4. Use test card if in Test mode
5. Check logs for success confirmation

Good luck! 🚀
