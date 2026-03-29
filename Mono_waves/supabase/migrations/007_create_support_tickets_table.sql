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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON public.support_tickets(email);

-- Enable Row Level Security
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create a support ticket
CREATE POLICY "Anyone can create support tickets"
    ON public.support_tickets
    FOR INSERT
    WITH CHECK (true);

-- Policy: Users can view their own tickets by email
CREATE POLICY "Users can view their own tickets"
    ON public.support_tickets
    FOR SELECT
    USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- Policy: Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
    ON public.support_tickets
    FOR SELECT
    USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
    );

-- Policy: Admins can update tickets
CREATE POLICY "Admins can update tickets"
    ON public.support_tickets
    FOR UPDATE
    USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
    );

-- Create updated_at trigger
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

-- Add comment
COMMENT ON TABLE public.support_tickets IS 'Customer support tickets and inquiries';
