-- Migration: Update product schema for AI mockups and 4-step builder
-- Requirement: .kiro/specs/admin-dashboard-real-data/doc.md

-- Add new columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS design_file_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Migration: Copy data from old columns to new columns (optional, for backward compatibility)
-- Note: 'design_url' exists, we want to ensure 'design_file_url' is populated if 'design_url' is present.
UPDATE products SET design_file_url = design_url WHERE design_file_url IS NULL AND design_url IS NOT NULL;

-- Update existing products with empty images array if null
UPDATE products SET images = '{}' WHERE images IS NULL;

-- Keep design_url and mockup_urls for now to avoid breaking existing code immediately,
-- but they are officially deprecated in favor of design_file_url and images.

COMMENT ON COLUMN products.variants IS 'Array of variants: [{ size, color, variantId }]';
COMMENT ON COLUMN products.design_file_url IS 'URL of the uploaded design file (PNG/SVG)';
COMMENT ON COLUMN products.images IS 'Array of AI-generated mockup image URLs';
