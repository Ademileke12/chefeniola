# Database Migrations

This directory contains SQL migration files for the Mono Waves e-commerce platform.

## Running Migrations

### Option 1: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link to your Supabase project:
```bash
supabase link --project-ref your-project-ref
```

3. Run migrations:
```bash
supabase db push
```

### Option 2: Manual Execution via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `001_initial_schema.sql`
4. Paste and execute the SQL

### Option 3: Using the Supabase Client

You can also run migrations programmatically using the Supabase client in your application code.

## Migration Files

- `001_initial_schema.sql` - Initial database schema with all tables, indexes, and triggers

## Schema Overview

### Tables

- **users** - Admin users for platform management
- **products** - Product catalog with Gelato integration
- **orders** - Customer orders with fulfillment tracking
- **carts** - Session-based shopping carts for guest checkout
- **webhook_logs** - Webhook event logs for debugging and idempotency

### Indexes

All tables have appropriate indexes for performance optimization:
- Published status and creation date for products
- Customer email, status, and order number for orders
- Session ID and expiration for carts
- Source, processed status, and event ID for webhook logs

### Triggers

- `update_updated_at_column()` - Automatically updates the `updated_at` timestamp on row updates

### Maintenance Functions

- `cleanup_expired_carts()` - Removes expired carts (can be scheduled via pg_cron or external cron job)

## Verifying Migration

After running the migration, verify the schema:

```sql
-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check indexes
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public';
```
