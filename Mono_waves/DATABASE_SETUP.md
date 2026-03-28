# Database Setup Guide

This guide explains how to set up the database schema in Supabase.

## Running the Migration

You have two options to run the database migration:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste it into the SQL editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. You should see a success message

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Make sure you're in the project root directory
cd /path/to/Mono_waves

# Link to your Supabase project (first time only)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

## Verifying the Setup

After running the migration, verify that the tables were created:

1. Go to **Table Editor** in your Supabase dashboard
2. You should see the following tables:
   - `users` - Admin users
   - `products` - Product catalog
   - `orders` - Customer orders
   - `carts` - Shopping carts
   - `webhook_logs` - Webhook event logs

## Tables Overview

### products
Stores product information including:
- Product details (name, description, price)
- Gelato integration (product ID, UID)
- Variants (sizes, colors)
- Design and mockup URLs
- Publishing status

### orders
Stores customer orders including:
- Order details and status
- Customer information
- Shipping address
- Payment information (Stripe)
- Fulfillment tracking (Gelato)

### carts
Stores temporary shopping carts for guest checkout:
- Session-based (no login required)
- Auto-expires after 7 days
- Stores cart items as JSON

### users
Stores admin users for platform management

### webhook_logs
Logs webhook events from Stripe and Gelato for debugging

## Troubleshooting

### "relation does not exist" errors

This means the tables haven't been created yet. Run the migration as described above.

### "Failed to fetch products" error

This error occurs when:
1. The `products` table doesn't exist (run the migration)
2. There's a network issue connecting to Supabase
3. The Supabase credentials in `.env.local` are incorrect

**Solution**: 
1. Run the migration first
2. Verify your Supabase URL and keys in `.env.local`
3. Check that your Supabase project is active

### Permission errors

Make sure you're using the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) in your `.env.local` file. The service role key has full access to the database.

## Next Steps

After setting up the database:

1. Set up Supabase Storage (see [STORAGE_SETUP.md](./STORAGE_SETUP.md))
2. Create an admin user in Supabase Auth
3. Configure environment variables in `.env.local`
4. Start the development server: `npm run dev`

## Database Maintenance

### Cleaning up expired carts

The database includes a function to clean up expired carts. You can run it manually:

```sql
SELECT cleanup_expired_carts();
```

Or set up a cron job in Supabase to run it automatically:

1. Go to **Database** → **Cron Jobs** in Supabase dashboard
2. Create a new cron job
3. Schedule: `0 0 * * *` (daily at midnight)
4. SQL: `SELECT cleanup_expired_carts();`

### Backing up data

Supabase automatically backs up your database. You can also create manual backups:

1. Go to **Settings** → **Database** in Supabase dashboard
2. Click **Create backup**
3. Download the backup file

## Security Notes

- The service role key has full database access - keep it secure
- Never commit `.env.local` to version control
- Use Row Level Security (RLS) policies for production
- Regularly review and update access permissions
