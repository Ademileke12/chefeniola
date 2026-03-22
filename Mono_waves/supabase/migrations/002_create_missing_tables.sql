-- Mono Waves E-Commerce Platform - Create Missing Tables
-- This migration creates only the tables that don't already exist

-- Products table (if not exists)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  gelato_product_id TEXT NOT NULL,
  gelato_product_uid TEXT NOT NULL,
  sizes TEXT[] NOT NULL,
  colors JSONB NOT NULL,
  design_url TEXT NOT NULL,
  mockup_urls JSONB,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for products table (if not exists)
CREATE INDEX IF NOT EXISTS idx_products_published ON products(published);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Orders table (if not exists)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  shipping_cost DECIMAL(10, 2) NOT NULL CHECK (shipping_cost >= 0),
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  stripe_payment_id TEXT UNIQUE NOT NULL,
  stripe_session_id TEXT,
  gelato_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  tracking_number TEXT,
  carrier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for orders table (if not exists)
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_id ON orders(stripe_payment_id);

-- Cart table (if not exists)
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- Create indexes for carts table (if not exists)
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_carts_expires_at ON carts(expires_at);

-- Webhook logs (if not exists)
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for webhook_logs table (if not exists)
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_carts_updated_at ON carts;
CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired carts (if not exists)
CREATE OR REPLACE FUNCTION cleanup_expired_carts()
RETURNS void AS $$
BEGIN
  DELETE FROM carts WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE products IS 'Product catalog with Gelato integration';
COMMENT ON TABLE orders IS 'Customer orders with fulfillment tracking';
COMMENT ON TABLE carts IS 'Session-based shopping carts for guest checkout';
COMMENT ON TABLE webhook_logs IS 'Webhook event logs for debugging and idempotency';

COMMENT ON COLUMN products.gelato_product_id IS 'Gelato product identifier';
COMMENT ON COLUMN products.gelato_product_uid IS 'Gelato product UID for API calls';
COMMENT ON COLUMN products.colors IS 'Array of color objects with name, hex, and imageUrl';
COMMENT ON COLUMN products.mockup_urls IS 'Object mapping color names to mockup image URLs';

COMMENT ON COLUMN orders.order_number IS 'Human-readable order number (e.g., MW-2024-001)';
COMMENT ON COLUMN orders.shipping_address IS 'Complete shipping address as JSON';
COMMENT ON COLUMN orders.items IS 'Array of order items with product details';
COMMENT ON COLUMN orders.status IS 'Order status: pending, payment_confirmed, submitted_to_gelato, printing, shipped, delivered, cancelled, failed';

COMMENT ON COLUMN carts.session_id IS 'Unique session identifier for guest users';
COMMENT ON COLUMN carts.items IS 'Array of cart items with product details';
COMMENT ON COLUMN carts.expires_at IS 'Cart expiration timestamp (7 days from creation)';

COMMENT ON COLUMN webhook_logs.event_id IS 'Unique event ID from webhook source for idempotency';
