# Migration 009: Create Gelato Availability Tables

## Overview

This migration creates two new tables for tracking Gelato product availability:
- `gelato_products` - Stores current product information and availability status
- `gelato_availability_history` - Tracks historical changes to product availability

## Changes

### New Tables

**gelato_products**
- `uid` (VARCHAR(255), PRIMARY KEY) - Unique Gelato product identifier
- `name` (VARCHAR(500), NOT NULL) - Product name
- `type` (VARCHAR(100), NOT NULL) - Product type/category
- `status` (VARCHAR(50), NOT NULL, DEFAULT 'available') - Availability status (new, available, out_of_stock, discontinued)
- `last_seen` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) - Last time product was seen in Gelato API
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) - Record update timestamp
- `metadata` (JSONB) - Additional product metadata

**gelato_availability_history**
- `id` (SERIAL, PRIMARY KEY) - Auto-incrementing ID
- `product_uid` (VARCHAR(255), NOT NULL, FK) - References gelato_products.uid
- `status` (VARCHAR(50), NOT NULL) - Status at time of change
- `changed_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) - When the status changed
- `notes` (TEXT) - Optional notes about the change

### Indexes

- `idx_gelato_products_status` - On gelato_products(status)
- `idx_gelato_products_last_seen` - On gelato_products(last_seen)
- `idx_gelato_products_type` - On gelato_products(type)
- `idx_availability_history_product_uid` - On gelato_availability_history(product_uid)
- `idx_availability_history_changed_at` - On gelato_availability_history(changed_at)
- `idx_availability_history_status` - On gelato_availability_history(status)

### Triggers

- `gelato_products_updated_at` - Automatically updates updated_at timestamp on row updates

### Row Level Security (RLS)

Both tables have RLS enabled with policies for:
- Public read access (for catalog display)
- Admin read access
- Service role full access (for automated updates)

## Requirements

This migration supports **Requirements 8.1, 8.2, 8.4** from the gelato-catalog-expansion spec:
- 8.1: Create gelato_products table with specified columns
- 8.2: Create gelato_availability_history table with specified columns
- 8.4: Add indexes on product_uid, status, and last_seen columns

## Running the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/009_create_gelato_availability_tables.sql`
5. Paste into the SQL Editor
6. Click **Run** or press `Cmd/Ctrl + Enter`
7. Verify success message appears

### Option 2: Using Supabase CLI

```bash
# Link to your Supabase project (if not already linked)
supabase link --project-ref inibxrznjlosgygggrae

# Push the migration
supabase db push
```

### Option 3: Using psql (if you have direct database access)

```bash
psql "postgresql://postgres:[PASSWORD]@db.inibxrznjlosgygggrae.supabase.co:5432/postgres" \
  -f supabase/migrations/009_create_gelato_availability_tables.sql
```

## Verification

After running the migration, verify it was successful:

### Using the Verification Script

```bash
npm run verify-gelato-tables
# or
npx tsx scripts/verify-gelato-tables.ts
```

### Manual Verification via SQL

Run these queries in the Supabase SQL Editor:

```sql
-- Check that gelato_products table exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'gelato_products'
ORDER BY ordinal_position;

-- Check that gelato_availability_history table exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'gelato_availability_history'
ORDER BY ordinal_position;

-- Check indexes on gelato_products
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'gelato_products';

-- Check indexes on gelato_availability_history
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'gelato_availability_history';

-- Check foreign key constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'gelato_availability_history';

-- Test insert into gelato_products
INSERT INTO gelato_products (uid, name, type, status)
VALUES ('test_product_001', 'Test T-Shirt', 'apparel', 'new')
RETURNING *;

-- Test insert into gelato_availability_history
INSERT INTO gelato_availability_history (product_uid, status, notes)
VALUES ('test_product_001', 'new', 'Initial product creation')
RETURNING *;

-- Clean up test data
DELETE FROM gelato_products WHERE uid = 'test_product_001';
```

## Rollback

If you need to rollback this migration:

```sql
-- Drop tables (this will cascade to history table due to FK constraint)
DROP TABLE IF EXISTS public.gelato_availability_history CASCADE;
DROP TABLE IF EXISTS public.gelato_products CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_gelato_products_updated_at() CASCADE;
```

## Impact

- **Backward Compatibility**: ✅ Yes - no existing tables are modified
- **Data Loss**: ❌ No - this creates new tables only
- **Downtime Required**: ❌ No - this is a non-breaking schema addition
- **Application Changes Required**: ✅ Yes - new catalog service will use these tables

## Next Steps

After running this migration:

1. ✅ Verify tables exist using the verification script
2. Implement CacheManager service (Task 2)
3. Update Gelato service to relax filtering (Task 3)
4. Implement CatalogService with availability tracking (Task 5)
5. Update catalog API route to use new service (Task 8)

## Related Files

- **Migration**: `supabase/migrations/009_create_gelato_availability_tables.sql`
- **Verification Script**: `scripts/verify-gelato-tables.ts`
- **Spec**: `.kiro/specs/gelato-catalog-expansion/`
  - `requirements.md` (Requirements 8.1, 8.2, 8.4)
  - `design.md` (Database Schema section)
  - `tasks.md` (Task 1)

## Troubleshooting

### Error: "relation already exists"

If you see this error, the tables may already exist. You can either:
1. Drop the existing tables and re-run the migration
2. Skip this migration if the tables are already correct

### Error: "permission denied"

Make sure you're using the service role key or have admin permissions in Supabase.

### Tables not visible in Supabase dashboard

1. Refresh the dashboard
2. Check the "public" schema
3. Verify RLS policies are not blocking your view

### Foreign key constraint fails

Ensure gelato_products table is created before gelato_availability_history table. The migration file creates them in the correct order.

