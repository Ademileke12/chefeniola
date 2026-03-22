-- Add design_data field to products table for design editor state persistence
-- Requirement 8.2: Store serialized Design_State in products table

-- Add design_data column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS design_data JSONB;

-- Add comment for documentation
COMMENT ON COLUMN products.design_data IS 'Serialized design state for editor (DesignState JSON) - stores complete design with all elements, positions, and properties';

-- Create index for design_data queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_products_design_data ON products USING GIN (design_data);
