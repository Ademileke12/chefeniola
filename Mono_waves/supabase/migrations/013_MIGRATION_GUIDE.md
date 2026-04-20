# Migration 013: Add stripe_session_id Index

## Overview

This migration creates a unique index on the `stripe_session_id` column in the `orders` table to enable fast order lookups and prevent duplicate orders from the same Stripe checkout session.

## Why This Migration is Needed

1. **Performance**: Without an index, queries by `stripe_session_id` perform full table scans
2. **Duplicate Prevention**: The unique constraint prevents creating multiple orders from the same Stripe session
3. **Production Issue**: The confirmation page experiences "Order not found" errors due to slow queries

## Migration Details

- **File**: `supabase/migrations/013_add_stripe_session_id_index.sql`
- **Type**: Index creation (non-blocking)
- **Estimated Time**: < 1 second for small tables, up to 1 minute for large tables
- **Downtime**: None (uses `CREATE INDEX` without CONCURRENTLY due to transaction limitations)

## Important Note About CONCURRENTLY

The original design called for `CREATE INDEX CONCURRENTLY` to avoid table locking. However, this command cannot run inside a transaction block, which is how Supabase migrations are typically executed.

**Options:**
1. Run the migration without `CONCURRENTLY` (acceptable for small-medium tables)
2. Run the SQL manually in the Supabase SQL Editor (outside a transaction)
3. Use the Supabase CLI with appropriate flags

For this migration, we've removed `CONCURRENTLY` to allow it to run in a transaction. The table lock will be brief for typical order volumes.

## Pre-Migration Checklist

- [ ] Backup your database (recommended for production)
- [ ] Verify the `stripe_session_id` column exists in the `orders` table
- [ ] Check current table size: `SELECT COUNT(*) FROM orders;`
- [ ] Ensure no long-running transactions are active

## Running the Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/013_add_stripe_session_id_index.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute

### Option 2: Using the Migration Script

```bash
# Run the TypeScript migration script
npx tsx scripts/run-migration-013.ts
```

This script will:
- Display the migration SQL
- Provide instructions for manual execution
- Check if the index already exists
- Test query performance after creation

### Option 3: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 4: Using the Shell Script

```bash
# Run the shell script
./scripts/run-migration-013.sh
```

## Verification Steps

After running the migration, verify it was successful:

### 1. Check Index Exists

```sql
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'orders' 
  AND indexname = 'idx_orders_stripe_session_id';
```

Expected result: One row showing the index definition

### 2. Test Query Performance

```sql
EXPLAIN ANALYZE
SELECT * FROM orders 
WHERE stripe_session_id = 'test_session_123';
```

Expected result: Query plan should show "Index Scan" instead of "Seq Scan"

### 3. Test Duplicate Rejection

```sql
-- This should succeed
INSERT INTO orders (
  order_number, customer_email, customer_name, 
  shipping_address, items, subtotal, shipping_cost, 
  total, stripe_payment_id, stripe_session_id, status
) VALUES (
  'TEST-001', 'test@example.com', 'Test User',
  '{"street": "123 Test St"}', '[]', 10.00, 5.00,
  15.00, 'pi_test_1', 'sess_test_unique', 'pending'
);

-- This should fail with unique constraint violation
INSERT INTO orders (
  order_number, customer_email, customer_name,
  shipping_address, items, subtotal, shipping_cost,
  total, stripe_payment_id, stripe_session_id, status
) VALUES (
  'TEST-002', 'test2@example.com', 'Test User 2',
  '{"street": "456 Test Ave"}', '[]', 20.00, 5.00,
  25.00, 'pi_test_2', 'sess_test_unique', 'pending'
);

-- Clean up
DELETE FROM orders WHERE stripe_session_id = 'sess_test_unique';
```

## Rollback Procedure

If you need to rollback this migration:

```sql
DROP INDEX IF EXISTS idx_orders_stripe_session_id;
```

**Warning**: Rollback will:
- Remove the performance optimization
- Remove duplicate prevention
- May cause "Order not found" errors to return

## Expected Impact

### Positive Impacts
- ✅ Order lookup by session ID will be 10-100x faster
- ✅ Duplicate orders from same session will be prevented
- ✅ Confirmation page will load more reliably
- ✅ Reduced database load

### Potential Issues
- ⚠️ Brief table lock during index creation (< 1 second for small tables)
- ⚠️ Existing duplicate session IDs will prevent migration (must be cleaned first)
- ⚠️ Slightly increased storage usage (minimal)

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Cause**: There are existing orders with duplicate `stripe_session_id` values

**Solution**:
```sql
-- Find duplicates
SELECT stripe_session_id, COUNT(*) 
FROM orders 
WHERE stripe_session_id IS NOT NULL
GROUP BY stripe_session_id 
HAVING COUNT(*) > 1;

-- Review and clean up duplicates before running migration
```

### Error: "relation 'orders' does not exist"

**Cause**: The orders table hasn't been created yet

**Solution**: Run earlier migrations first (001-012)

### Error: "column 'stripe_session_id' does not exist"

**Cause**: The column hasn't been added to the orders table

**Solution**: Verify the initial schema migration (001) includes this column

## Post-Migration Tasks

After successful migration:

1. ✅ Update application code to use session ID lookups (Task 2-8)
2. ✅ Deploy confirmation page changes (Task 8)
3. ✅ Monitor query performance in production
4. ✅ Verify no duplicate order creation attempts

## Related Tasks

This migration supports the following tasks in the spec:
- Task 1: Create and run database migration (this task)
- Task 4: Update webhook handler to store session ID
- Task 6: Update order service with validation
- Task 7: Create API route for session-based lookup
- Task 8: Update confirmation page with polling

## Support

If you encounter issues:
1. Check the Supabase logs for detailed error messages
2. Verify your database connection and permissions
3. Review the troubleshooting section above
4. Contact the development team with error details
