-- Migration 011: Enhance webhook_logs table and add correlation_id to orders
-- Purpose: Add tracking and debugging columns for webhook processing and order correlation
-- Created: 2024
-- Spec: payment-fulfillment-security-audit
-- Task: 1.4 Enhance webhook_logs table

-- Add new columns to webhook_logs table
ALTER TABLE webhook_logs 
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN;

-- Add index on correlation_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_webhook_logs_correlation_id ON webhook_logs(correlation_id);

-- Add correlation_id to orders table for end-to-end tracing
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

-- Add index on orders correlation_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_orders_correlation_id ON orders(correlation_id);

-- Add comments for documentation
COMMENT ON COLUMN webhook_logs.correlation_id IS 'Unique identifier to trace related events across the system';
COMMENT ON COLUMN webhook_logs.processing_time_ms IS 'Time taken to process the webhook in milliseconds';
COMMENT ON COLUMN webhook_logs.retry_count IS 'Number of times this webhook has been retried';
COMMENT ON COLUMN webhook_logs.signature_verified IS 'Whether the webhook signature was successfully verified';
COMMENT ON COLUMN orders.correlation_id IS 'Unique identifier linking order to payment and fulfillment events';
