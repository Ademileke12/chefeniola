# Migration 008: Add Tax Column to Orders Table

## Overview

This migration adds a `tax` column to the `orders` table to support sales tax calculation via Stripe Tax integration.

## Changes

- Adds `tax DECIMAL(10, 2) NOT NULL DEFAULT 0` column to orders table
- Adds check constraint `orders_tax_check` to ensure tax >= 0
- Updates existing orders to have 0 tax (via DEFAULT)
- Adds index on tax column for reporting and analytics
- Adds documentation comment for the tax column

## Requirements

This migration supports **Requirement 4.5** from the order-fulfillment-automation spec:
- "THE tax amount SHALL be stored in the order record"

## Running the Migration

### Option 1: Using Supabase CLI (Recommended)

```bash
# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

### Option 2: Manual Execution via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `008_add_tax_column_to_orders.sql`
4. Paste and execute the SQL

### Option 3: Using psql

```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/008_add_tax_column_to_orders.sql
```

## Verification

After running the migration, verify it was successful:

```sql
-- Check that the tax column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'tax';

-- Check that the constraint exists
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'orders_tax_check';

-- Check that the index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders' AND indexname = 'idx_orders_tax';

-- Verify existing orders have tax = 0
SELECT COUNT(*) as orders_with_zero_tax
FROM orders
WHERE tax = 0;
```

## Rollback

If you need to rollback this migration:

```sql
-- Remove the index
DROP INDEX IF EXISTS idx_orders_tax;

-- Remove the constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_tax_check;

-- Remove the column
ALTER TABLE orders DROP COLUMN IF EXISTS tax;
```

## Testing

Run the migration test to verify the changes:

```bash
npm test __tests__/unit/migrations/008_add_tax_column.test.ts
```

## Impact

- **Backward Compatibility**: ✅ Yes - existing code will continue to work as the column has a DEFAULT value
- **Data Loss**: ❌ No - no data is deleted or modified (except setting tax = 0 for existing orders)
- **Downtime Required**: ❌ No - this is a non-breaking schema change
- **Application Changes Required**: ✅ Yes - application code should be updated to use the new tax field

## Next Steps

After running this migration:

1. Update application code to pass `tax` field when creating orders
2. Update Stripe checkout integration to calculate tax using Stripe Tax
3. Update order display pages to show tax as a separate line item
4. Run tests to verify the integration works correctly

## Related Files

- Migration: `supabase/migrations/008_add_tax_column_to_orders.sql`
- Test: `__tests__/unit/migrations/008_add_tax_column.test.ts`
- Type Updates: `types/order.ts`, `types/database.ts`
- Service Updates: `lib/services/orderService.ts`
