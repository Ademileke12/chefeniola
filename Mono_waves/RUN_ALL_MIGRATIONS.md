# Run All Database Migrations

This guide helps you run all database migrations in the correct order.

## Problem

You got the error: `ERROR: 42P01: relation "orders" does not exist`

This means the base tables haven't been created yet. You need to run migrations in order.

## Solution

### Option 1: Run Migrations in Order (Recommended)

Run each migration file in sequence:

```bash
# 1. Create base schema (includes orders table)
psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql

# 2. Create any missing tables (idempotent)
psql $DATABASE_URL -f supabase/migrations/002_create_missing_tables.sql

# 3. Add design_data field (if needed)
psql $DATABASE_URL -f supabase/migrations/003_add_design_data_field.sql

# 4. Update product schema for AI mockups (if needed)
psql $DATABASE_URL -f supabase/migrations/004_update_product_schema_for_ai_mockups.sql

# 5. Make deprecated columns nullable (if needed)
psql $DATABASE_URL -f supabase/migrations/005_make_deprecated_columns_nullable.sql

# 6. Performance optimization (if needed)
psql $DATABASE_URL -f supabase/migrations/006_performance_optimization.sql

# 7. Create support tickets table (if needed)
psql $DATABASE_URL -f supabase/migrations/007_create_support_tickets_table.sql

# 8. Add tax column to orders (NEW - for order fulfillment)
psql $DATABASE_URL -f supabase/migrations/008_add_tax_column_to_orders.sql
```

### Option 2: Use Supabase CLI (If using Supabase)

If you're using Supabase, you can use their CLI:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Run all pending migrations
supabase db push
```

### Option 3: Quick Setup Script

Create and run this script to set up everything:

```bash
#!/bin/bash

# Quick database setup script

echo "Running database migrations..."

# Get database URL from .env.local
source .env.local

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set in .env.local"
  exit 1
fi

# Run migrations in order
echo "1. Creating base schema..."
psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql

echo "2. Creating missing tables..."
psql $DATABASE_URL -f supabase/migrations/002_create_missing_tables.sql

echo "3. Adding design_data field..."
psql $DATABASE_URL -f supabase/migrations/003_add_design_data_field.sql 2>/dev/null || echo "Skipped (may not exist)"

echo "4. Updating product schema..."
psql $DATABASE_URL -f supabase/migrations/004_update_product_schema_for_ai_mockups.sql 2>/dev/null || echo "Skipped (may not exist)"

echo "5. Making deprecated columns nullable..."
psql $DATABASE_URL -f supabase/migrations/005_make_deprecated_columns_nullable.sql 2>/dev/null || echo "Skipped (may not exist)"

echo "6. Performance optimization..."
psql $DATABASE_URL -f supabase/migrations/006_performance_optimization.sql 2>/dev/null || echo "Skipped (may not exist)"

echo "7. Creating support tickets table..."
psql $DATABASE_URL -f supabase/migrations/007_create_support_tickets_table.sql 2>/dev/null || echo "Skipped (may not exist)"

echo "8. Adding tax column to orders..."
psql $DATABASE_URL -f supabase/migrations/008_add_tax_column_to_orders.sql

echo "✅ All migrations completed!"
```

Save this as `setup-database.sh`, make it executable, and run it:

```bash
chmod +x setup-database.sh
./setup-database.sh
```

## Verify Setup

After running migrations, verify the orders table exists and has the tax column:

```bash
# Connect to database
psql $DATABASE_URL

# Check orders table structure
\d orders

# You should see the tax column:
# tax | numeric(10,2) | not null | 0

# Exit psql
\q
```

## What Each Migration Does

1. **001_initial_schema.sql**: Creates all base tables (users, products, orders, carts, webhook_logs)
2. **002_create_missing_tables.sql**: Idempotent version - creates tables only if they don't exist
3. **003-007**: Various feature additions (optional, may not exist in your project)
4. **008_add_tax_column_to_orders.sql**: Adds tax column for order fulfillment automation

## Troubleshooting

### Error: "database does not exist"
Create the database first:
```bash
createdb your_database_name
```

### Error: "permission denied"
Make sure your database user has CREATE privileges:
```sql
GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_user;
```

### Error: "already exists"
This is usually fine - it means the table/column already exists. The migration is idempotent.

### Want to start fresh?
Drop and recreate the database:
```bash
# WARNING: This deletes all data!
dropdb your_database_name
createdb your_database_name
# Then run migrations again
```

## Next Steps

After migrations are complete:

1. ✅ Verify tables exist: `psql $DATABASE_URL -c "\dt"`
2. ✅ Check orders table has tax column: `psql $DATABASE_URL -c "\d orders"`
3. ✅ Start the dev server: `npm run dev`
4. ✅ Test the order flow using the FRONTEND_TESTING_GUIDE.md

## Need Help?

If you continue to have issues:

1. Check your DATABASE_URL is correct in `.env.local`
2. Verify you can connect: `psql $DATABASE_URL -c "SELECT version();"`
3. Check migration files exist in `supabase/migrations/`
4. Look for error messages in the migration output
