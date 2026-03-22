-- Migration: Make deprecated columns nullable to support new 4-step builder schema
-- Requirement: Fix "Failed to create product" due to NOT NULL constraints on deprecated fields

ALTER TABLE products ALTER COLUMN sizes DROP NOT NULL;
ALTER TABLE products ALTER COLUMN colors DROP NOT NULL;
ALTER TABLE products ALTER COLUMN design_url DROP NOT NULL;

-- Ensure defaults for existing code that might still expect empty arrays/objects
ALTER TABLE products ALTER COLUMN sizes SET DEFAULT '{}';
ALTER TABLE products ALTER COLUMN colors SET DEFAULT '[]'::jsonb;

COMMENT ON COLUMN products.sizes IS 'Deprecated: Use variants instead';
COMMENT ON COLUMN products.colors IS 'Deprecated: Use variants instead';
COMMENT ON COLUMN products.design_url IS 'Deprecated: Use design_file_url instead';
