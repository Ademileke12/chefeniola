# Run Migration 009: Gelato Availability Tables

## Quick Start

Since automated migration execution isn't available, please follow these steps to run the migration manually:

### Step 1: Open Supabase Dashboard

1. Go to: https://app.supabase.com/project/inibxrznjlosgygggrae
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy and Execute SQL

1. Open the file: `supabase/migrations/009_create_gelato_availability_tables.sql`
2. Copy the **entire contents** of the file
3. Paste into the SQL Editor
4. Click **Run** (or press `Cmd/Ctrl + Enter`)

### Step 3: Verify Success

You should see a success message. The migration creates:
- ✅ `gelato_products` table
- ✅ `gelato_availability_history` table
- ✅ 6 indexes for performance
- ✅ Triggers for automatic timestamp updates
- ✅ RLS policies for security

### Step 4: Verify Tables Exist

Run this verification script:

```bash
npx tsx scripts/verify-gelato-tables.ts
```

Expected output:
```
✅ gelato_products table exists
✅ gelato_availability_history table exists
✅ Successfully inserted test product
✅ Successfully inserted test history entry
✅ Cleaned up test data
🎉 All tables verified successfully!
```

## What This Migration Does

### Creates gelato_products Table

Stores current product information and availability status:

| Column | Type | Description |
|--------|------|-------------|
| uid | VARCHAR(255) PK | Unique Gelato product identifier |
| name | VARCHAR(500) | Product name |
| type | VARCHAR(100) | Product type/category |
| status | VARCHAR(50) | Availability status (new, available, out_of_stock, discontinued) |
| last_seen | TIMESTAMPTZ | Last time product was seen in Gelato API |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record update timestamp |
| metadata | JSONB | Additional product metadata |

### Creates gelato_availability_history Table

Tracks historical changes to product availability:

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | Auto-incrementing ID |
| product_uid | VARCHAR(255) FK | References gelato_products.uid |
| status | VARCHAR(50) | Status at time of change |
| changed_at | TIMESTAMPTZ | When the status changed |
| notes | TEXT | Optional notes about the change |

### Indexes Created

For optimal query performance:
- `idx_gelato_products_status` - Filter by status
- `idx_gelato_products_last_seen` - Sort by last seen date
- `idx_gelato_products_type` - Filter by product type
- `idx_availability_history_product_uid` - Look up history by product
- `idx_availability_history_changed_at` - Sort history by date
- `idx_availability_history_status` - Filter history by status

## Troubleshooting

### "relation already exists" Error

The tables may already exist. Check in Supabase Dashboard > Table Editor. If they exist with the correct structure, you can skip this migration.

### Permission Denied

Make sure you're logged into the correct Supabase project and have admin access.

### Tables Not Visible

1. Refresh the Supabase Dashboard
2. Check the "public" schema in Table Editor
3. Try running the verification script

## Next Steps

After successfully running this migration:

1. ✅ Mark Task 1 as complete
2. Continue with Task 2: Implement cache manager service
3. The catalog expansion feature will use these tables to track product availability over time

## Related Files

- **Migration SQL**: `supabase/migrations/009_create_gelato_availability_tables.sql`
- **Migration Guide**: `supabase/migrations/009_MIGRATION_GUIDE.md`
- **Verification Script**: `scripts/verify-gelato-tables.ts`
- **Spec**: `.kiro/specs/gelato-catalog-expansion/`

## Support

If you encounter issues:
1. Check the detailed migration guide: `supabase/migrations/009_MIGRATION_GUIDE.md`
2. Verify your Supabase credentials in `.env.local`
3. Ensure you have admin access to the Supabase project

