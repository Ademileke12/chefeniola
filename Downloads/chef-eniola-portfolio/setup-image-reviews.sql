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
