-- Add tax column to orders table
-- This migration adds a tax field to track sales tax for each order

-- Add tax column with NOT NULL constraint and default value
ALTER TABLE orders
ADD COLUMN tax DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Add check constraint to ensure tax is non-negative
ALTER TABLE orders
ADD CONSTRAINT orders_tax_check CHECK (tax >= 0);

-- Update existing orders to have 0 tax (already done by DEFAULT, but explicit for clarity)
UPDATE orders SET tax = 0 WHERE tax IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.tax IS 'Sales tax amount calculated by Stripe Tax based on customer location';

-- Create index for tax column (useful for reporting and analytics)
CREATE INDEX idx_orders_tax ON orders(tax);
