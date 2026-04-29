# Setup Image Reviews Table

The website is showing a blank page because the `image_reviews` table doesn't exist in your Supabase database yet.

## Quick Fix

Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/bebbuodjsegcdheheujo/sql/new):

```sql
-- Create image_reviews table
CREATE TABLE IF NOT EXISTS image_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imageUrl TEXT NOT NULL,
  customerName TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE image_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for image_reviews table
CREATE POLICY "Allow public read access to image_reviews"
  ON image_reviews FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to insert image_reviews"
  ON image_reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete image_reviews"
  ON image_reviews FOR DELETE
  TO authenticated
  USING (true);
```

## Steps:

1. Go to https://supabase.com/dashboard/project/bebbuodjsegcdheheujo/sql/new
2. Copy and paste the SQL above
3. Click "Run" button
4. Refresh your website

The website should now load properly!
