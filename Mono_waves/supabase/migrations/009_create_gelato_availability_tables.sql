-- Create gelato_products table for tracking product availability
CREATE TABLE IF NOT EXISTS public.gelato_products (
    uid VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('new', 'available', 'out_of_stock', 'discontinued')),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes for gelato_products
CREATE INDEX IF NOT EXISTS idx_gelato_products_status ON public.gelato_products(status);
CREATE INDEX IF NOT EXISTS idx_gelato_products_last_seen ON public.gelato_products(last_seen);
CREATE INDEX IF NOT EXISTS idx_gelato_products_type ON public.gelato_products(type);

-- Create gelato_availability_history table for tracking status changes
CREATE TABLE IF NOT EXISTS public.gelato_availability_history (
    id SERIAL PRIMARY KEY,
    product_uid VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('new', 'available', 'out_of_stock', 'discontinued')),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    CONSTRAINT fk_gelato_product FOREIGN KEY (product_uid) 
        REFERENCES public.gelato_products(uid) 
        ON DELETE CASCADE
);

-- Create indexes for gelato_availability_history
CREATE INDEX IF NOT EXISTS idx_availability_history_product_uid ON public.gelato_availability_history(product_uid);
CREATE INDEX IF NOT EXISTS idx_availability_history_changed_at ON public.gelato_availability_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_availability_history_status ON public.gelato_availability_history(status);

-- Create updated_at trigger for gelato_products
CREATE OR REPLACE FUNCTION update_gelato_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gelato_products_updated_at
    BEFORE UPDATE ON public.gelato_products
    FOR EACH ROW
    EXECUTE FUNCTION update_gelato_products_updated_at();

-- Enable Row Level Security
ALTER TABLE public.gelato_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gelato_availability_history ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all gelato products
CREATE POLICY "Admins can view gelato products"
    ON public.gelato_products
    FOR SELECT
    USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
        OR true -- Allow public read for catalog display
    );

-- Policy: Service role can insert/update gelato products
CREATE POLICY "Service can manage gelato products"
    ON public.gelato_products
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy: Admins can view availability history
CREATE POLICY "Admins can view availability history"
    ON public.gelato_availability_history
    FOR SELECT
    USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
        OR true -- Allow public read for tracking
    );

-- Policy: Service role can insert availability history
CREATE POLICY "Service can insert availability history"
    ON public.gelato_availability_history
    FOR INSERT
    WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.gelato_products IS 'Tracks Gelato product catalog with availability status';
COMMENT ON TABLE public.gelato_availability_history IS 'Historical record of product availability changes';
COMMENT ON COLUMN public.gelato_products.uid IS 'Unique Gelato product identifier';
COMMENT ON COLUMN public.gelato_products.status IS 'Current availability status: new, available, out_of_stock, discontinued';
COMMENT ON COLUMN public.gelato_products.last_seen IS 'Last time this product was seen in Gelato API response';
COMMENT ON COLUMN public.gelato_products.metadata IS 'Additional product metadata in JSON format';
