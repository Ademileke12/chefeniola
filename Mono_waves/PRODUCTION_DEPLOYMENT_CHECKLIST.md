# Production Deployment Checklist

## Overview
This checklist ensures the order confirmation system works correctly in production.

## ✅ Local Environment (COMPLETED)
- [x] Webhook secret updated in `.env.local`
- [x] `stripe_session_id` column exists in database
- [x] Orders are created with session IDs
- [x] Test script created: `scripts/test-local-payment-flow.ts`

## 🚀 Production Deployment Steps

### Step 1: Apply Database Migration
The `stripe_session_id` column must exist in production database.

```bash
# Check if migration is needed
npx tsx scripts/verify-migration-013.ts

# Apply migration if needed
npx tsx scripts/run-migration-013.ts
```

**What it does**:
- Adds `stripe_session_id` column to `orders` table
- Creates index for fast lookups
- Enables order retrieval by session ID

### Step 2: Configure Live Stripe Keys
Update Vercel environment variables with **LIVE** Stripe keys.

**Required Variables**:
```
STRIPE_SECRET_KEY=sk_live_...  (NOT sk_test_...)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  (NOT pk_test_...)
```

**How to update**:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Update both variables with live keys
3. Select "Production" environment
4. Save changes

### Step 3: Configure Production Webhook
Create a webhook in Stripe Dashboard for production.

**Steps**:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks
2. Click "Add endpoint"
3. Enter endpoint URL: `https://monowave-one.vercel.app/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)

### Step 4: Update Webhook Secret in Vercel
Add the webhook signing secret to Vercel environment variables.

```bash
# Using Vercel CLI
vercel env add STRIPE_WEBHOOK_SECRET production
# Paste the signing secret when prompted

# OR update in Vercel Dashboard
# Settings → Environment Variables → Add New
# Name: STRIPE_WEBHOOK_SECRET
# Value: whsec_... (from Step 3)
# Environment: Production
```

### Step 5: Deploy to Production
Deploy the latest code to production.

```bash
# Commit any pending changes
git add .
git commit -m "Fix: Update webhook configuration for production"
git push origin main

# Vercel will auto-deploy, or manually deploy:
vercel --prod
```

### Step 6: Verify Production Setup
Run diagnostic checks to ensure everything is configured correctly.

**Check 1: Database Migration**
```sql
-- In Supabase SQL Editor
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'stripe_session_id';
```
Expected: Should return one row with `stripe_session_id`

**Check 2: Environment Variables**
In Vercel Dashboard → Settings → Environment Variables, verify:
- ✅ `STRIPE_SECRET_KEY` starts with `sk_live_`
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` starts with `pk_live_`
- ✅ `STRIPE_WEBHOOK_SECRET` starts with `whsec_`
- ✅ All three are set for "Production" environment

**Check 3: Webhook Configuration**
In Stripe Dashboard → Developers → Webhooks:
- ✅ Endpoint URL is correct: `https://monowave-one.vercel.app/api/webhooks/stripe`
- ✅ Status is "Enabled"
- ✅ Events include `checkout.session.completed`

### Step 7: Test Production Payment
Make a real payment to verify the entire flow works.

**Test Steps**:
1. Go to `https://monowave-one.vercel.app`
2. Add a product to cart
3. Complete checkout with a **real credit card** (or Stripe test card if still in test mode)
4. After payment, you should be redirected to confirmation page
5. Verify order details appear (not "ORDER NOT FOUND")

**Test Card (if still in test mode)**:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

### Step 8: Monitor Webhook Delivery
Check that webhooks are being delivered successfully.

**In Stripe Dashboard**:
1. Go to Developers → Events
2. Look for recent `checkout.session.completed` events
3. Click on an event
4. Check "Webhook attempts" section
5. Verify status is "Succeeded" (200 response)

**In Vercel Logs**:
```bash
vercel logs --prod
```
Look for:
- `🔔 WEBHOOK RECEIVED - Stripe webhook endpoint called!`
- `✅ Order created: MW-...`
- `✅ Confirmation email sent to: ...`

**In Supabase**:
```sql
-- Check recent webhook logs
SELECT * 
FROM webhook_logs 
WHERE event_type = 'checkout.session.completed' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check recent orders
SELECT id, order_number, stripe_session_id, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔍 Troubleshooting

### Issue: "ORDER NOT FOUND" after payment

**Possible Causes**:
1. **Using test session in production** - Session ID starts with `cs_test_`
   - Solution: Use live Stripe keys and make a real payment
   
2. **Migration not applied** - `stripe_session_id` column doesn't exist
   - Solution: Run `npx tsx scripts/run-migration-013.ts`
   
3. **Webhook not configured** - Stripe isn't sending events to production
   - Solution: Configure webhook in Stripe Dashboard (Step 3)
   
4. **Wrong webhook secret** - Signature verification fails
   - Solution: Update `STRIPE_WEBHOOK_SECRET` in Vercel (Step 4)
   
5. **Order creation failed** - Webhook received but order not created
   - Solution: Check Vercel logs and Supabase `webhook_logs` table

### Issue: Webhook signature verification fails

**Symptoms**:
- Vercel logs show: "Invalid signature"
- Stripe Dashboard shows webhook attempts with 400 status

**Solution**:
1. Get the correct signing secret from Stripe Dashboard → Webhooks → [Your endpoint] → Signing secret
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel
3. Redeploy: `vercel --prod`

### Issue: Orders created but session ID is null

**Symptoms**:
- Orders appear in database
- `stripe_session_id` column is `NULL`

**Solution**:
This means the webhook is working but not storing the session ID. Check:
1. Migration 013 was applied correctly
2. Webhook handler is passing `stripeSessionId` to `createOrder()`
3. Code is deployed to production (not using old version)

## 📊 Success Criteria

After completing all steps, you should have:
- ✅ Migration 013 applied to production database
- ✅ Live Stripe keys configured in Vercel
- ✅ Production webhook configured in Stripe Dashboard
- ✅ Webhook secret updated in Vercel
- ✅ Latest code deployed to production
- ✅ Test payment completes successfully
- ✅ Order appears on confirmation page
- ✅ Confirmation email received
- ✅ Webhook logs show successful delivery

## 🛠️ Useful Commands

```bash
# Test local setup
set -a && source .env.local && set +a && npx tsx scripts/test-local-payment-flow.ts

# Verify migration
npx tsx scripts/verify-migration-013.ts

# Apply migration
npx tsx scripts/run-migration-013.ts

# Check Vercel logs
vercel logs --prod

# Deploy to production
vercel --prod

# Test webhook locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## 📚 Related Files
- `.env.local` - Local environment variables (webhook secret updated)
- `app/api/webhooks/stripe/route.ts` - Webhook handler
- `app/api/orders/session/[sessionId]/route.ts` - Session lookup API
- `lib/services/orderService.ts` - Order service
- `supabase/migrations/013_add_stripe_session_id_index.sql` - Migration
- `scripts/test-local-payment-flow.ts` - Local testing script
- `scripts/diagnose-production-order.ts` - Production diagnostic script

## 🎯 Next Steps

1. **Apply migration to production** (Step 1)
2. **Configure live Stripe keys** (Step 2)
3. **Set up production webhook** (Step 3)
4. **Update webhook secret** (Step 4)
5. **Deploy to production** (Step 5)
6. **Test with real payment** (Step 7)
7. **Monitor webhook delivery** (Step 8)

Once all steps are complete, the order confirmation system will work correctly in production!
