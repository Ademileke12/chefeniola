-- Check if gallery table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'gallery'
ORDER BY 
    ordinal_position;

-- Check if there are any rows
SELECT COUNT(*) as total_images FROM gallery;

-- Show first 5 rows
SELECT * FROM gallery LIMIT 5;
