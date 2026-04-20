-- Migration: Add retry_count column to orders table
-- Purpose: Track Gelato submission retry attempts for monitoring and debugging
-- Requirements: 2.3

-- Add retry_count column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN orders.retry_count IS 'Number of Gelato submission retry attempts';

-- Create index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_orders_retry_count ON orders(retry_count) WHERE retry_count > 0;
