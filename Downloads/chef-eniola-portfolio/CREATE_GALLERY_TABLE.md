# Create Gallery Table

The error "Could not find the 'createdAt' column" means the gallery table doesn't exist or is missing columns.

## Quick Fix:

Go to your Supabase SQL Editor and run this SQL:

```sql
-- Create gallery table if it doesn't exist
CREATE TABLE IF NOT EXISTS gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imageUrl TEXT NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

-- Policies for gallery table
CREATE POLICY "Allow public read access to gallery"
  ON gallery FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to insert gallery"
  ON gallery FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete gallery"
  ON gallery FOR DELETE
  TO authenticated
  USING (true);
```

## Steps:

1. Go to: https://supabase.com/dashboard/project/bebbuodjsegcdheheujo/sql/new
2. Copy and paste the SQL above
3. Click "Run"
4. Refresh your admin page
5. Try uploading an image again

The table should now be created with all required columns!
