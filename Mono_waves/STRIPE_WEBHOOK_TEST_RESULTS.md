# Stripe Webhook Configuration Test Results

## Test Summary
✅ **All webhook configuration tests passed successfully**

## Test Results

### 1. Environment Variables ✅
- **STRIPE_SECRET_KEY**: Loaded correctly from `.env.local`
- **STRIPE_WEBHOOK_SECRET**: Loaded correctly from `.env.local`
- **Webhook Secret Format**: Valid (whsec_*)
- **Webhook Secret Length**: 38 characters

### 2. Stripe Client Initialization ✅
- Stripe client initialized successfully
- API version: 2024-11-20.acacia
- TypeScript support enabled

### 3. Webhook Signature Verification ✅
- Signature generation working correctly
- Signature verification function accessible
- Test event verified successfully
  - Event Type: checkout.session.completed
  - Event ID: evt_test_1776761636491

### 4. StripeService Module ✅
- Module exists at: `lib/services/stripeService.ts`
- `verifyWebhookSignature` function working correctly
- Can process mock webhook events

### 5. Webhook Endpoint Information
- **Local endpoint**: `http://localhost:3000/api/webhooks/stripe`
- **Method**: POST
- **Required headers**:
  - `stripe-signature`: Webhook signature from Stripe
  - `content-type`: application/json

## Configuration Details

### Environment File
```
File: .env.local
Location: Project root
Status: ✅ Loaded correctly
```

### Stripe Configuration
```
STRIPE_SECRET_KEY: sk_test_51TAtih... (configured)
STRIPE_WEBHOOK_SECRET: whsec_wtwzynpssNGZJxquwV1wN5lz1v5SIo68
Webhook Format: whsec_* (valid)
```

## How to Test Webhooks

### Option 1: Using Stripe CLI (Recommended for Local Development)

1. **Install Stripe CLI** (if not already installed):
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Linux
   wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
   tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
   sudo mv stripe /usr/local/bin/
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Start your development server**:
   ```bash
   npm run dev
   ```

4. **Forward webhooks to local endpoint**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   
   This will output a webhook signing secret like:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxx
   ```
   
   **Important**: Use this secret in your `.env.local` for local testing:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

5. **Trigger test events**:
   ```bash
   # Test checkout completion
   stripe trigger checkout.session.completed
   
   # Test payment success
   stripe trigger payment_intent.succeeded
   
   # Test payment failure
   stripe trigger payment_intent.payment_failed
   ```

### Option 2: Using Stripe Dashboard (For Production)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
5. Copy the webhook signing secret
6. Add to your production environment variables

## Webhook Event Flow

```
1. Customer completes checkout
   ↓
2. Stripe sends webhook event to your endpoint
   ↓
3. Your endpoint receives POST request with:
   - Body: JSON event data
   - Header: stripe-signature
   ↓
4. verifyWebhookSignature() validates the signature
   ↓
5. handlePaymentSuccess() processes the payment
   ↓
6. Order created in database
   ↓
7. Confirmation email sent
```

## Troubleshooting

### Issue: "Webhook signature verification failed"
**Cause**: Wrong webhook secret or signature mismatch

**Solution**:
1. Verify `STRIPE_WEBHOOK_SECRET` in `.env.local`
2. If using Stripe CLI, use the secret from `stripe listen` output
3. If using Dashboard, use the secret from webhook endpoint settings
4. Restart your development server after changing `.env.local`

### Issue: "Failed to connect to webhook endpoint"
**Cause**: Development server not running

**Solution**:
```bash
npm run dev
```

### Issue: "STRIPE_WEBHOOK_SECRET is not configured"
**Cause**: Environment variable not loaded

**Solution**:
1. Check `.env.local` file exists in project root
2. Verify the variable name is exactly `STRIPE_WEBHOOK_SECRET`
3. Restart your development server
4. Run test script: `npx tsx scripts/test-stripe-webhook-config.ts`

## Test Scripts

### Test Configuration
```bash
npx tsx scripts/test-stripe-webhook-config.ts
```
Tests that environment variables are loaded correctly.

### Test Endpoint
```bash
npx tsx scripts/test-webhook-endpoint.ts
```
Tests the webhook endpoint with a mock event (requires dev server running).

## Next Steps

1. ✅ Webhook configuration is correct
2. ✅ Signature verification is working
3. ⏭️ Start development server: `npm run dev`
4. ⏭️ Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
5. ⏭️ Trigger test event: `stripe trigger checkout.session.completed`
6. ⏭️ Verify order creation in database

## Production Checklist

Before deploying to production:

- [ ] Update `STRIPE_WEBHOOK_SECRET` with production webhook secret
- [ ] Update `STRIPE_SECRET_KEY` with production API key
- [ ] Configure webhook endpoint in Stripe Dashboard
- [ ] Test webhook with production credentials
- [ ] Monitor webhook logs in Stripe Dashboard
- [ ] Set up error alerting for failed webhooks

## Monitoring

### Stripe Dashboard
- View webhook logs: Dashboard → Developers → Webhooks → [Your endpoint]
- Check for failed deliveries
- Review event details and responses

### Application Logs
- Check server logs for webhook processing
- Monitor order creation success rate
- Track email delivery status

## Security Notes

✅ **Current Security Measures**:
- Webhook signature verification enabled
- HTTPS required in production
- Environment variables properly secured
- No sensitive data in webhook metadata

⚠️ **Important**:
- Never commit `.env.local` to version control
- Rotate webhook secrets periodically
- Monitor for suspicious webhook activity
- Validate all webhook data before processing
