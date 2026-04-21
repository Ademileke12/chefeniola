-- Check Orders Database Script
-- Run this in Supabase SQL Editor to diagnose order creation issues

-- 1. Check recent orders
SELECT 
  order_number,
  stripe_session_id,
  customer_email,
  status,
  total,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check for specific session ID
-- Replace with your actual session ID
SELECT *
FROM orders
WHERE stripe_session_id = 'cs_test_b17e7xMYIknVP5NrrU4Tx0gvSuf0ANSgf8r4mUOgDGvKAtuWvkvcOd2rTE';

-- 3. Check webhook logs
SELECT 
  source,
  event_type,
  event_id,
  processed,
  error,
  created_at
FROM webhook_logs
WHERE source = 'stripe'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check for checkout.session.completed events
SELECT 
  event_type,
  event_id,
  processed,
  error,
  payload->>'id' as session_id,
  created_at
FROM webhook_logs
WHERE source = 'stripe'
  AND event_type = 'checkout.session.completed'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check audit events
SELECT 
  event_type,
  severity,
  correlation_id,
  metadata,
  timestamp
FROM audit_events
WHERE event_type IN ('payment.completed', 'order.created', 'webhook.received')
ORDER BY timestamp DESC
LIMIT 10;

-- 6. Count orders by status
SELECT 
  status,
  COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC;

-- 7. Check for orders without session IDs
SELECT 
  order_number,
  customer_email,
  created_at
FROM orders
WHERE stripe_session_id IS NULL
ORDER BY created_at DESC
LIMIT 5;
