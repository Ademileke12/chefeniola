# Running Migration 011: Enhance Webhook Logs

## Overview
Migration 011 enhances the `webhook_logs` table with tracking columns and adds `correlation_id` to the `orders` table for end-to-end tracing.

## What This Migration Does

### webhook_logs Table Enhancements
- ✅ Adds `correlation_id` (TEXT) - Links related events across the system
- ✅ Adds `processing_time_ms` (INTEGER) - Tracks webhook processing performance
- ✅ Adds `retry_count` (INTEGER, DEFAULT 0) - Monitors retry attempts
- ✅ Adds `signature_verified` (BOOLEAN) - Tracks signature verification status
- ✅ Creates index on `correlation_id` for efficient lookups

### orders Table Enhancement
- ✅ Adds `correlation_id` (TEXT) - Links orders to payment and fulfillment events
- ✅ Creates index on `correlation_id` for efficient lookups

## Prerequisites

1. **Environment Variables**: Ensure these are set in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Database Access**: You need admin access to your Supabase database

3. **Backup**: Always backup your database before running migrations (especially in production)

## Running the Migration

### Option 1: Using Supabase CLI (Recommended)

```bash
# Reset database (applies all migrations including 011)
supabase db reset

# Or push just the new migration
supabase db push
```

### Option 2: Using the Run Script

```bash
# Make script executable
chmod +x scripts/run-migration-011.ts

# Run the migration
npm run tsx scripts/run-migration-011.ts
```

### Option 3: Manual SQL Execution

```bash
# Using psql
psql $DATABASE_URL -f supabase/migrations/011_enhance_webhook_logs.sql

# Or using Supabase SQL Editor
# Copy the contents of 011_enhance_webhook_logs.sql
# Paste into Supabase Dashboard > SQL Editor
# Click "Run"
```

## Verification

After running the migration, verify it was successful:

```bash
# Run verification script
npm run tsx scripts/verify-migration-011.ts
```

Expected output:
```
🔍 Verifying Migration 011: Enhance Webhook Logs

📋 Checking webhook_logs table columns...
  ✅ correlation_id (text)
  ✅ processing_time_ms (integer)
  ✅ retry_count (integer)
  ✅ signature_verified (boolean)

📋 Checking orders table columns...
  ✅ correlation_id (text)

📋 Checking indexes...
  ✅ idx_webhook_logs_correlation_id
  ✅ idx_orders_correlation_id

==================================================
✅ Migration 011 verification PASSED
```

### Manual Verification (SQL)

You can also verify manually using SQL:

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

## Troubleshooting

### Error: "relation does not exist"
- Make sure previous migrations (001-010) have been run
- Run `supabase db reset` to apply all migrations

### Error: "permission denied"
- Verify you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- Check that the service role key has admin privileges

### Error: "column already exists"
- Migration has already been run
- Safe to ignore if verification passes
- Or run rollback first (see below)

## Rollback

If you need to undo this migration:

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

## Impact Assessment

### Performance
- ✅ **No performance degradation**: New columns are nullable
- ✅ **Improved query performance**: Indexes added for correlation_id lookups
- ✅ **No blocking operations**: Migration is non-blocking

### Compatibility
- ✅ **Backward compatible**: Existing queries continue to work
- ✅ **No data loss**: Only adds new columns
- ✅ **No downtime required**: Can be applied to live database

### Data
- ✅ **Existing data preserved**: No modifications to existing rows
- ✅ **New columns nullable**: No default values required for existing rows

## Next Steps

After successfully running this migration:

1. **Update Webhook Handlers** (Task 1.5, 1.6)
   - Add correlation_id generation to Stripe webhook
   - Add correlation_id generation to Gelato webhook
   - Populate new tracking columns (processing_time_ms, retry_count, signature_verified)

2. **Update Order Creation** (Task 1.3)
   - Generate correlation_id when creating orders
   - Link orders to payment events via correlation_id

3. **Implement Audit Logging** (Task 1.2)
   - Use correlation_id for end-to-end tracing
   - Track webhook processing metrics
   - Monitor signature verification

4. **Update Admin Dashboard** (Phase 5)
   - Display correlation tracking
   - Show webhook processing metrics
   - Add debugging tools using correlation_id

## Related Files

- **Migration**: `supabase/migrations/011_enhance_webhook_logs.sql`
- **Guide**: `supabase/migrations/011_MIGRATION_GUIDE.md`
- **Verification**: `scripts/verify-migration-011.ts`
- **Run Script**: `scripts/run-migration-011.ts`

## Related Tasks

- Task 1.3: Add correlation ID system
- Task 1.4: Enhance webhook_logs table (this migration)
- Task 1.5: Add audit logging to Stripe webhook
- Task 1.6: Add audit logging to Gelato webhook

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the migration guide: `supabase/migrations/011_MIGRATION_GUIDE.md`
3. Check Supabase logs in the dashboard
4. Verify environment variables are correct

## Success Criteria

✅ Migration runs without errors
✅ All new columns exist in webhook_logs table
✅ correlation_id exists in orders table
✅ All indexes created successfully
✅ Verification script passes
✅ Existing data remains intact
✅ No performance degradation
