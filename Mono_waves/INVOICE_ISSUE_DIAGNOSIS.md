# Invoice Issue Diagnosis

## Problem
Users are not receiving invoices after purchase. The confirmation page shows "order not found" even after polling 10 times with exponential backoff.

## Error Message
```
[Confirmation] Max polling attempts reached, session: cs_test_b17e7xMYIknVP5NrrU4Tx0gvSuf0ANSgf8r4mUOgDGvKAtuWvkvcOd2rTE, attempts: 10
```

## Possible Causes

### 1. Webhook Not Being Triggered
- Stripe webhook might not be configured correctly in production
- Webhook endpoint might not be accessible
- Webhook secret might be incorrect

### 2. Webhook Failing Silently
- Order creation might be failing but webhook returns 200
- Database insert might be failing
- Session ID might not be stored correctly

### 3. Timing Issue
- Webhook might be taking longer than expected
- Database replication lag
- Order created but not indexed yet

### 4. Session ID Mismatch
- Session ID from URL doesn't match what's stored in database
- Session ID might be getting truncated or modified

## Diagnostic Steps

### Step 1: Check if Webhook is Being Called
```bash
# Check webhook logs in Supabase
SELECT * FROM webhook_logs 
WHERE source = 'stripe' 
AND event_type = 'checkout.session.completed'
ORDER BY created_at DESC 
LIMIT 10;
```

### Step 2: Check if Orders are Being Created
```bash
# Check recent orders
SELECT 
  order_number, 
  stripe_session_id, 
  status, 
  created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;
```

### Step 3: Check for Specific Session
```bash
# Look for the specific session ID
SELECT * FROM orders 
WHERE stripe_session_id = 'cs_test_b17e7xMYIknVP5NrrU4Tx0gvSuf0ANSgf8r4mUOgDGvKAtuWvkvcOd2rTE';
```

### Step 4: Check Audit Events
```bash
# Check audit events for this session
SELECT * FROM audit_events 
WHERE metadata->>'sessionId' = 'cs_test_b17e7xMYIknVP5NrrU4Tx0gvSuf0ANSgf8r4mUOgDGvKAtuWvkvcOd2rTE'
ORDER BY timestamp DESC;
```

## Solutions

### Solution 1: Verify Webhook Configuration
1. Check Stripe Dashboard → Developers → Webhooks
2. Verify endpoint URL is correct
3. Verify webhook secret matches environment variable
4. Check webhook event logs for errors

### Solution 2: Add More Logging
Add console.log statements to track the flow:
- When webhook is received
- When order is created
- What session ID is stored
- When order lookup is performed

### Solution 3: Increase Polling Attempts
The current polling configuration:
- Max attempts: 10
- Delays: 500ms, 1s, 2s, 4s, then 8s (capped)
- Total time: ~50 seconds

Consider increasing to:
- Max attempts: 15
- Total time: ~90 seconds

### Solution 4: Add Webhook Retry Logic
If webhook fails, Stripe will retry automatically, but we should:
- Return 500 on failure (not 200)
- Log all errors
- Send admin notification on persistent failures

### Solution 5: Check Database Index
Verify the stripe_session_id column has an index:
```sql
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id 
ON orders(stripe_session_id);
```

## Immediate Actions

1. **Check Stripe Webhook Logs**
   - Go to Stripe Dashboard
   - Check if webhooks are being delivered
   - Look for any error responses

2. **Check Application Logs**
   - Look for webhook processing logs
   - Check for any errors during order creation
   - Verify session IDs are being logged

3. **Test Locally**
   - Use Stripe CLI to forward webhooks locally
   - Test the complete flow
   - Verify order creation and lookup

4. **Add Fallback**
   - If order not found after polling, show message with order lookup link
   - Provide customer support email
   - Suggest checking email for confirmation

## Code Changes Needed

### 1. Enhanced Webhook Logging
```typescript
// In webhook handler
console.log('[Webhook] Session ID:', session.id)
console.log('[Webhook] Creating order with session ID:', session.id)
console.log('[Webhook] Order created:', order.id, 'with session:', order.stripeSessionId)
```

### 2. Enhanced API Logging
```typescript
// In /api/orders/session/[sessionId]/route.ts
console.log('[API] Looking up order with session:', sessionId)
console.log('[API] Query result:', order ? 'Found' : 'Not found')
```

### 3. Add Webhook Status Endpoint
Create `/api/webhooks/status` to check if webhooks are working:
```typescript
export async function GET() {
  const recentWebhooks = await supabaseAdmin
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  
  return NextResponse.json({ webhooks: recentWebhooks })
}
```

## Testing Checklist

- [ ] Verify webhook endpoint is accessible
- [ ] Verify webhook secret is correct
- [ ] Test order creation locally
- [ ] Test order lookup by session ID
- [ ] Verify database index exists
- [ ] Check for any database errors
- [ ] Test with real Stripe test payment
- [ ] Verify email is sent
- [ ] Check confirmation page polling

## Next Steps

1. Run diagnostic script to check database state
2. Check Stripe webhook logs for delivery status
3. Add enhanced logging to webhook and API
4. Test complete flow with Stripe CLI
5. Deploy fixes and monitor
