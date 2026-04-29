-- Step 1: Drop the table completely
DROP TABLE IF EXISTS gallery CASCADE;

-- Step 2: Create the table with correct schema
CREATE TABLE gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imageUrl TEXT NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Enable Row Level Security
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies
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

-- Step 5: Insert all images including new ones from /gl/subs
INSERT INTO gallery (imageUrl) VALUES
  ('/gl/photo_1_2026-04-14_13-04-14.jpg'),
  ('/gl/photo_2_2026-04-14_13-04-14.jpg'),
  ('/gl/photo_3_2026-04-14_13-04-14.jpg'),
  ('/gl/photo_4_2026-04-14_13-04-14.jpg'),
  ('/gl/photo_9_2026-04-14_13-04-14.jpg'),
  ('/gl/photo_10_2026-04-14_13-04-14.jpg'),
  ('/gl/photo_11_2026-04-14_13-04-14.jpg'),
  ('/gl/photo_12_2026-04-14_13-04-14.jpg'),
  ('/gl/photo_13_2026-04-14_13-04-14.jpg'),
  ('/gl/photo_14_2026-04-14_13-04-15.jpg'),
  ('/gl/photo_15_2026-04-14_13-04-15.jpg'),
  ('/gl/photo_16_2026-04-14_13-04-15.jpg'),
  ('/gl/photo_17_2026-04-14_13-04-15.jpg'),
  ('/gl/photo_18_2026-04-14_13-04-15.jpg'),
  ('/gl/photo_19_2026-04-14_13-04-15.jpg'),
  ('/gl/photo_20_2026-04-14_13-04-15.jpg'),
  ('/gl/subs/photo_1_2026-04-27_15-59-26.jpg'),
  ('/gl/subs/photo_2_2026-04-27_15-59-26.jpg'),
  ('/gl/subs/photo_3_2026-04-27_15-59-26.jpg'),
  ('/gl/subs/photo_4_2026-04-27_15-59-26.jpg'),
  ('/gl/subs/photo_5_2026-04-27_15-59-26.jpg'),
  ('/gl/subs/photo_6_2026-04-27_15-59-26.jpg'),
  ('/gl/subs/photo_7_2026-04-27_15-59-26.jpg'),
  ('/gl/subs/photo_1_2026-04-27_16-06-28.jpg'),
  ('/gl/subs/photo_2_2026-04-27_16-06-28.jpg'),
  ('/gl/subs/photo_3_2026-04-27_16-06-28.jpg'),
  ('/gl/subs/photo_4_2026-04-27_16-06-28.jpg'),
  ('/gl/subs/photo_5_2026-04-27_16-06-28.jpg'),
  ('/gl/subs/photo_6_2026-04-27_16-06-28.jpg'),
  ('/gl/subs/photo_7_2026-04-27_16-06-28.jpg'),
  ('/gl/subs/photo_8_2026-04-27_16-06-28.jpg');

-- Step 6: Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
