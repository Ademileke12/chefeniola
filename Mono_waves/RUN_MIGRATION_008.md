# Running Migration 008: Add Tax Column

## ⚠️ IMPORTANT: Migration Must Be Run Before Testing

The migration file has been created but **has not been applied to the database yet**. You need to run the migration before the application code and tests will work.

## Quick Start

### Step 1: Run the Migration

Choose one of the following methods:

#### Method A: Using Supabase CLI (Recommended)

```bash
# If not already linked to your project
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

#### Method B: Using Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy the contents of `supabase/migrations/008_add_tax_column_to_orders.sql`
6. Paste into the editor
7. Click **Run**

#### Method C: Direct SQL Execution

If you have direct database access:

```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/008_add_tax_column_to_orders.sql
```

### Step 2: Verify the Migration

Run this SQL query to verify the migration was successful:

```sql
-- Check that the tax column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'tax';
```

Expected output:
```
 column_name |  data_type  | is_nullable | column_default
-------------+-------------+-------------+----------------
 tax         | numeric     | NO          | 0
```

### Step 3: Run the Tests

After the migration is applied, run the tests to verify everything works:

```bash
npm test -- __tests__/unit/migrations/008_add_tax_column.test.ts
```

All tests should pass.

## What This Migration Does

1. **Adds `tax` column** to the `orders` table
   - Type: `DECIMAL(10, 2)`
   - Constraint: `NOT NULL DEFAULT 0`
   - Check: `tax >= 0`

2. **Updates existing orders** to have `tax = 0`

3. **Creates an index** on the `tax` column for performance

4. **Adds documentation** comment explaining the column's purpose

## Files Modified

### Database Schema
- ✅ `supabase/migrations/008_add_tax_column_to_orders.sql` - Migration file

### TypeScript Types
- ✅ `types/order.ts` - Added `tax` field to `Order` and `CreateOrderData` interfaces
- ✅ `types/database.ts` - Added `tax` field to `DatabaseOrder` interface

### Services
- ✅ `lib/services/orderService.ts` - Updated to handle `tax` field in `toOrder()` and `createOrder()`

### Tests
- ✅ `__tests__/unit/migrations/008_add_tax_column.test.ts` - Tests for migration

### Documentation
- ✅ `supabase/migrations/008_MIGRATION_GUIDE.md` - Detailed migration guide
- ✅ `RUN_MIGRATION_008.md` - This file

## Impact Analysis

### ✅ Backward Compatible
The migration is backward compatible because:
- The `tax` column has a `DEFAULT 0` value
- Existing code that doesn't provide `tax` will still work
- No data is lost or modified (except setting tax = 0 for existing orders)

### ⚠️ Application Updates Required
After running the migration, you should update:
1. Stripe webhook handler to extract and pass tax amount
2. Order creation code to include tax in calculations
3. Order display pages to show tax as a separate line item

### 📊 No Downtime Required
This is a non-breaking schema change that can be applied without downtime.

## Troubleshooting

### Error: "Could not find the 'tax' column"
**Cause**: The migration hasn't been run yet.
**Solution**: Run the migration using one of the methods above.

### Error: "orders_tax_check constraint violation"
**Cause**: Attempting to insert a negative tax value.
**Solution**: Ensure tax values are always >= 0.

### Error: "duplicate key value violates unique constraint"
**Cause**: Test order number already exists.
**Solution**: Tests use timestamps to generate unique order numbers. Wait a moment and retry.

## Next Steps

After successfully running this migration:

1. ✅ Mark task 1.1 as complete
2. ➡️ Proceed to task 1.2: Install Resend package and create email service
3. ➡️ Continue with remaining tasks in the order-fulfillment-automation spec

## Related Documentation

- Spec: `.kiro/specs/order-fulfillment-automation/`
- Requirements: Requirement 4.5 - "THE tax amount SHALL be stored in the order record"
- Design: See "Data Models" section in design.md
