# Production Order Not Found Issue

## Problem
Order confirmation page shows "ORDER NOT FOUND" in production even though payment was successful.

**URL**: `https://monowave-one.vercel.app/api/orders/session/cs_test_b1bVftYs6KjGJBn6ZwL3y99wPOqHCYsC0pMV3HvgOQGZouRkNGuDsgvU9J`

## Root Causes

### 1. Test Session ID in Production ⚠️ **MOST LIKELY**
The session ID `cs_test_*` indicates this is a **test mode** Stripe session. Test sessions don't work in production with live Stripe keys.

**Solution**: Use live Stripe keys and make a real payment in production.

### 2. Migration 013 Not Applied
The `stripe_session_id` column might not exist in the production database.

**Check**: Run the diagnostic script
```bash
npx tsx scripts/diagnose-production-order.ts
```

**Fix**: Apply migration 013
```bash
npx tsx scripts/run-migration-013.ts
```

### 3. Webhook Not Configured
The Stripe webhook might not be configured to send events to production.

**Check Stripe Dashboard**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Verify webhook endpoint: `https://monowave-one.vercel.app/api/webhooks/stripe`
3. Check webhook signing secret matches `STRIPE_WEBHOOK_SECRET` in Vercel env vars
4. Verify `checkout.session.completed` event is enabled

### 4. Order Creation Failed
The webhook might have fired but order creation failed.

**Check**:
- Vercel logs for webhook errors
- Supabase `webhook_logs` table for processing errors
- Email inbox for admin notifications about failures

## How Order Confirmation Works

```
1. Customer completes payment
   ↓
2. Stripe sends webhook to /api/webhooks/stripe
   ↓
3. Webhook creates order with stripe_session_id
   ↓
4. Customer redirected to /confirmation?session_id=cs_xxx
   ↓
5. Frontend calls /api/orders/session/[sessionId]
   ↓
6. API queries: SELECT * FROM orders WHERE stripe_session_id = 'cs_xxx'
   ↓
7. Order displayed on confirmation page
```

## Diagnostic Steps

### Step 1: Run Diagnostic Script
```bash
npx tsx scripts/diagnose-production-order.ts
```

This will check:
- ✅ If `stripe_session_id` column exists
- ✅ If order exists for the session
- ✅ Recent orders in database
- ✅ Webhook logs for the session

### Step 2: Check Vercel Logs
```bash
vercel logs --prod
```

Look for:
- Webhook received logs
- Order creation errors
- Database query errors

### Step 3: Check Supabase
```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'stripe_session_id';

-- Check recent orders
SELECT id, order_number, stripe_session_id, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Check webhook logs
SELECT * 
FROM webhook_logs 
WHERE event_type = 'checkout.session.completed' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Step 4: Check Stripe Dashboard
1. Go to Developers → Events
2. Search for the session ID
3. Check if webhook was delivered
4. View webhook response

## Solutions

### Solution 1: Use Live Stripe Keys (Recommended)
The test session ID won't work in production. You need to:

1. **Update Vercel Environment Variables**:
   ```
   STRIPE_SECRET_KEY=sk_live_...  (not sk_test_...)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  (not pk_test_...)
   STRIPE_WEBHOOK_SECRET=whsec_...  (from live webhook)
   ```

2. **Redeploy**:
   ```bash
   git push origin main
   ```

3. **Make a Real Payment**:
   - Use a real credit card (or Stripe test card in test mode)
   - Complete checkout
   - Verify order appears on confirmation page

### Solution 2: Apply Migration 013
If the column doesn't exist:

```bash
# Run migration
npx tsx scripts/run-migration-013.ts

# Verify migration
npx tsx scripts/verify-migration-013.ts
```

### Solution 3: Configure Webhook
If webhook isn't configured:

1. **Create Webhook in Stripe**:
   - Endpoint URL: `https://monowave-one.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `payment_intent.payment_failed`
   - Get signing secret

2. **Update Vercel Env Var**:
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET production
   # Paste the webhook signing secret
   ```

3. **Redeploy**:
   ```bash
   vercel --prod
   ```

### Solution 4: Test Locally First
Before testing in production:

```bash
# 1. Use Stripe CLI to forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 2. Start local server
npm run dev

# 3. Make test payment
# 4. Verify order appears on confirmation page
```

## Prevention

### 1. Environment-Specific Keys
Always use:
- **Test keys** (`sk_test_*`, `pk_test_*`) in development
- **Live keys** (`sk_live_*`, `pk_live_*`) in production

### 2. Webhook Monitoring
Set up monitoring for:
- Webhook delivery failures
- Order creation errors
- Missing session IDs

### 3. Database Migrations
Always apply migrations to production:
```bash
# Check pending migrations
npx tsx scripts/verify-migrations.ts

# Apply all pending
npx tsx scripts/apply-migrations-010-011.ts
```

## Quick Test

To quickly test if the system works:

1. **Make a test payment** (use test card in test mode)
2. **Check webhook logs**:
   ```sql
   SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 1;
   ```
3. **Check order created**:
   ```sql
   SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;
   ```
4. **Visit confirmation page** with the session ID

## Related Files
- `app/api/orders/session/[sessionId]/route.ts` - Session lookup API
- `lib/services/orderService.ts` - Order service with getOrderBySessionId
- `app/api/webhooks/stripe/route.ts` - Webhook handler that creates orders
- `supabase/migrations/013_add_stripe_session_id_index.sql` - Migration for session ID column
- `scripts/diagnose-production-order.ts` - Diagnostic script

## Support
If issue persists:
1. Run diagnostic script and share output
2. Check Vercel logs and share relevant errors
3. Check Stripe webhook delivery status
4. Verify environment variables are set correctly
