# Run Support Tickets Migration

The `support_tickets` table is missing from your database. You need to run the migration to create it.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/007_create_support_tickets_table.sql`
5. Click **Run** to execute the migration

## Option 2: Using Supabase CLI (if Docker is running)

```bash
# Start Supabase locally
npx supabase start

# Run all migrations
npx supabase db reset

# Or push to remote
npx supabase db push
```

## Option 3: Manual SQL Execution

If you have direct database access, run this SQL:

```sql
-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('general', 'order', 'design', 'other')),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON public.support_tickets(email);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can create support tickets"
    ON public.support_tickets FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own tickets"
    ON public.support_tickets FOR SELECT
    USING (email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Admins can view all tickets"
    ON public.support_tickets FOR SELECT
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

CREATE POLICY "Admins can update tickets"
    ON public.support_tickets FOR UPDATE
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');

-- Trigger
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_tickets_updated_at();
```

## After Running the Migration

Once the migration is complete, the support form will work correctly. You can test it by:

1. Going to the Contact page on your storefront
2. Filling out the support form
3. Submitting a ticket

The ticket will be stored in the `support_tickets` table and admins can view it in the admin panel at `/admin/support`.
