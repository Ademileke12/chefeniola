# Migration 011: Enhance Webhook Logs and Add Correlation IDs

## Overview
This migration enhances the `webhook_logs` table with additional tracking columns and adds `correlation_id` to the `orders` table for end-to-end tracing of payment and fulfillment events.

## Changes

### webhook_logs Table
- **correlation_id** (TEXT): Unique identifier to trace related events across the system
- **processing_time_ms** (INTEGER): Time taken to process the webhook in milliseconds
- **retry_count** (INTEGER, DEFAULT 0): Number of times this webhook has been retried
- **signature_verified** (BOOLEAN): Whether the webhook signature was successfully verified
- **Index**: Added on `correlation_id` for efficient lookups

### orders Table
- **correlation_id** (TEXT): Unique identifier linking order to payment and fulfillment events
- **Index**: Added on `correlation_id` for efficient lookups

## Purpose
These columns enable:
1. **End-to-end tracing**: Track an order from payment through fulfillment using correlation_id
2. **Performance monitoring**: Measure webhook processing times
3. **Reliability tracking**: Monitor retry attempts and signature verification
4. **Debugging**: Quickly find all related events for a specific order or payment

## Running the Migration

### Local Development
```bash
# Using Supabase CLI
supabase db reset

# Or apply just this migration
psql $DATABASE_URL -f supabase/migrations/011_enhance_webhook_logs.sql
```

### Production
```bash
# Using Supabase CLI (recommended)
supabase db push

# Or manually via psql
psql $SUPABASE_DB_URL -f supabase/migrations/011_enhance_webhook_logs.sql
```

## Verification

After running the migration, verify the changes:

```sql
-- Check webhook_logs columns
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'webhook_logs' 
  AND column_name IN ('correlation_id', 'processing_time_ms', 'retry_count', 'signature_verified');

-- Check orders columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name = 'correlation_id';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('webhook_logs', 'orders') 
  AND indexname LIKE '%correlation_id%';
```

Expected output:
- webhook_logs should have 4 new columns
- orders should have 1 new column
- Both tables should have indexes on correlation_id

## Rollback

If you need to rollback this migration:

```sql
-- Remove columns from webhook_logs
ALTER TABLE webhook_logs 
  DROP COLUMN IF EXISTS correlation_id,
  DROP COLUMN IF EXISTS processing_time_ms,
  DROP COLUMN IF EXISTS retry_count,
  DROP COLUMN IF EXISTS signature_verified;

-- Remove index from webhook_logs
DROP INDEX IF EXISTS idx_webhook_logs_correlation_id;

-- Remove column from orders
ALTER TABLE orders 
  DROP COLUMN IF EXISTS correlation_id;

-- Remove index from orders
DROP INDEX IF EXISTS idx_orders_correlation_id;
```

## Impact
- **Backward compatible**: Existing queries will continue to work
- **No data loss**: Only adds new columns with nullable/default values
- **Performance**: Indexes added for efficient lookups
- **Downtime**: None - migration is non-blocking

## Next Steps
After running this migration:
1. Update webhook handlers to populate correlation_id
2. Update order creation to generate and store correlation_id
3. Implement audit logging using these new fields
4. Update admin dashboard to display correlation tracking

## Related Tasks
- Task 1.3: Add correlation ID system
- Task 1.5: Add audit logging to Stripe webhook
- Task 1.6: Add audit logging to Gelato webhook
