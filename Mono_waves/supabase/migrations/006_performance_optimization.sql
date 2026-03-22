-- Performance Optimization Migration
-- Requirement: Improve query efficiency for Best Sellers and Filtering

-- 1. Create a function to get best selling products by aggregating JSONB items in orders
-- This avoids fetching all orders into Node.js memory.
CREATE OR REPLACE FUNCTION get_best_sellers(limit_count INT DEFAULT 4)
RETURNS TABLE (
    product_id UUID,
    total_quantity_sold BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH order_items_expanded AS (
        SELECT 
            (jsonb_array_elements(items)->>'productId')::UUID as p_id,
            (jsonb_array_elements(items)->>'quantity')::INT as qty
        FROM orders
        WHERE status NOT IN ('failed', 'cancelled')
    )
    SELECT 
        p_id as product_id,
        SUM(qty)::BIGINT as total_quantity_sold
    FROM order_items_expanded
    GROUP BY p_id
    ORDER BY total_quantity_sold DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add indices for JSONB performance (if not already present via GIN)
-- We already have idx_products_design_data, but let's' add one for variants if we do a lot of filtering
CREATE INDEX IF NOT EXISTS idx_products_variants ON products USING GIN (variants);
CREATE INDEX IF NOT EXISTS idx_orders_items ON orders USING GIN (items);

-- 3. Optimization for products filtering (city/state is in shipping_address)
-- Not strictly needed for products but good for orders search
CREATE INDEX IF NOT EXISTS idx_orders_shipping_address ON orders USING GIN (shipping_address);
