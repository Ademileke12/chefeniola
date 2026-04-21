# Webhook Not Configured - Fix Guide

## Problem Identified

Your Stripe logs show checkout sessions being created, but **NO webhook events are being delivered**. This means:
- Stripe is NOT sending `checkout.session.completed` events to your app
- Orders are never being created in the database
- Users complete payment but never get their order confirmation

## Root Cause

Webhooks are not configured in your Stripe account to send events to your application.

## Solution: Configure Stripe Webhooks

### Step 1: Get Your Webhook Endpoint URL

Your webhook endpoint is:
```
https://your-domain.com/api/webhooks/stripe
```

For example:
- Production: `https://monowaves.com/api/webhooks/stripe`
- Vercel: `https://your-app.vercel.app/api/webhooks/stripe`

### Step 2: Configure Webhook in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter your webhook URL: `https://your-domain.com/api/webhooks/stripe`
5. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.payment_failed` (optional)
6. Click **Add endpoint**

### Step 3: Get Webhook Signing Secret

After creating the webhook:
1. Click on the webhook you just created
2. Click **Reveal** under "Signing secret"
3. Copy the secret (starts with `whsec_...`)

### Step 4: Add Secret to Environment Variables

Add the webhook secret to your `.env.local` file:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

For production (Vercel):
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `STRIPE_WEBHOOK_SECRET` with the value from Stripe
4. Redeploy your application

### Step 5: Test the Webhook

#### Option A: Use Stripe CLI (Local Testing)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

#### Option B: Test in Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click on your webhook
3. Click **Send test webhook**
4. Select `checkout.session.completed`
5. Click **Send test webhook**
6. Check if your application receives it

### Step 6: Verify Webhook is Working

Run this SQL in Supabase to check if webhooks are being received:

```sql
SELECT 
  event_type,
  event_id,
  processed,
  created_at
FROM webhook_logs
WHERE source = 'stripe'
ORDER BY created_at DESC
LIMIT 5;
```

You should see `checkout.session.completed` events appearing.

## Quick Test Script

Create a test purchase and check the database:

```sql
-- Check if order was created for your test session
SELECT 
  order_number,
  stripe_session_id,
  customer_email,
  status,
  created_at
FROM orders
WHERE stripe_session_id = 'cs_test_YOUR_SESSION_ID_HERE';
```

## Common Issues

### Issue 1: Webhook Secret Mismatch

**Symptom**: Webhook logs show signature verification failures

**Fix**: 
1. Get the correct secret from Stripe Dashboard
2. Update `STRIPE_WEBHOOK_SECRET` in environment variables
3. Restart your application

### Issue 2: Webhook URL Not Accessible

**Symptom**: Stripe shows webhook delivery failures

**Fix**:
1. Verify your application is deployed and accessible
2. Check that `/api/webhooks/stripe` endpoint exists
3. Verify no firewall or security rules blocking Stripe IPs

### Issue 3: Wrong Webhook Secret for Environment

**Symptom**: Works locally but not in production

**Fix**:
- Use different webhook secrets for test and live mode
- Test mode secret: starts with `whsec_test_...`
- Live mode secret: starts with `whsec_...`

## Verification Checklist

- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook URL points to your application
- [ ] `checkout.session.completed` event is selected
- [ ] Webhook signing secret copied
- [ ] `STRIPE_WEBHOOK_SECRET` added to environment variables
- [ ] Application redeployed (if production)
- [ ] Test webhook sent successfully
- [ ] Webhook logs show events in database
- [ ] Test order created successfully

## Testing the Complete Flow

1. **Create a test purchase**:
   - Go to your checkout page
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete the purchase

2. **Check webhook was received**:
   ```sql
   SELECT * FROM webhook_logs 
   WHERE source = 'stripe' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

3. **Check order was created**:
   ```sql
   SELECT * FROM orders 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

4. **Check confirmation page**:
   - You should be redirected to `/confirmation?session_id=cs_test_...`
   - Order details should load within a few seconds
   - You should receive a confirmation email

## Next Steps

1. Configure webhook in Stripe Dashboard
2. Add webhook secret to environment variables
3. Test with a real purchase
4. Verify order appears in database
5. Confirm email is sent

## Need Help?

If webhooks are still not working:
1. Check Stripe Dashboard → Webhooks → Your endpoint → Recent deliveries
2. Look for error messages or failed deliveries
3. Check your application logs for webhook processing errors
4. Verify the webhook secret matches exactly
