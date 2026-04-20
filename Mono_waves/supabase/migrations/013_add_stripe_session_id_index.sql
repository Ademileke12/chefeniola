-- Migration 013: Add stripe_session_id index for fast order lookups
-- This migration creates a unique index on the stripe_session_id column
-- to enable fast order lookups and prevent duplicate orders

-- Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
-- This migration should be run separately or with autocommit enabled

-- Create unique index on stripe_session_id for fast lookups and duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session_id 
ON orders(stripe_session_id) 
WHERE stripe_session_id IS NOT NULL;

-- Add comment to document the index purpose
COMMENT ON INDEX idx_orders_stripe_session_id IS 'Unique index for fast order lookups by Stripe session ID and duplicate prevention';
