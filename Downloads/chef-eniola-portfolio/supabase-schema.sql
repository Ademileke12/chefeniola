-- Gallery table for Visual Menu images
CREATE TABLE IF NOT EXISTS gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imageUrl TEXT NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kitchen Videos table for In The Kitchen section
CREATE TABLE IF NOT EXISTS kitchen_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  videoUrl TEXT NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Image Reviews table for Customer Moments section
CREATE TABLE IF NOT EXISTS image_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imageUrl TEXT NOT NULL,
  customerName TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_reviews ENABLE ROW LEVEL SECURITY;

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

-- Policies for kitchen_videos table
CREATE POLICY "Allow public read access to kitchen_videos"
  ON kitchen_videos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to insert kitchen_videos"
  ON kitchen_videos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete kitchen_videos"
  ON kitchen_videos FOR DELETE
  TO authenticated
  USING (true);

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

-- Create storage bucket for videos (run this in Supabase Dashboard > Storage)
-- Or use Supabase CLI: supabase storage create videos --public
-- Then set policies:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

-- Storage policies for videos bucket
-- CREATE POLICY "Allow public read access to videos"
--   ON storage.objects FOR SELECT
--   TO public
--   USING (bucket_id = 'videos');

-- CREATE POLICY "Allow authenticated users to upload videos"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (bucket_id = 'videos');

-- CREATE POLICY "Allow authenticated users to delete videos"
--   ON storage.objects FOR DELETE
--   TO authenticated
--   USING (bucket_id = 'videos');

-- Insert existing images into gallery table
INSERT INTO gallery (imageUrl, createdAt) VALUES
  ('/gl/photo_1_2026-04-14_13-04-14.jpg', NOW()),
  ('/gl/photo_2_2026-04-14_13-04-14.jpg', NOW()),
  ('/gl/photo_3_2026-04-14_13-04-14.jpg', NOW()),
  ('/gl/photo_4_2026-04-14_13-04-14.jpg', NOW()),
  ('/gl/photo_9_2026-04-14_13-04-14.jpg', NOW()),
  ('/gl/photo_10_2026-04-14_13-04-14.jpg', NOW()),
  ('/gl/photo_11_2026-04-14_13-04-14.jpg', NOW()),
  ('/gl/photo_12_2026-04-14_13-04-14.jpg', NOW()),
  ('/gl/photo_13_2026-04-14_13-04-14.jpg', NOW()),
  ('/gl/photo_14_2026-04-14_13-04-15.jpg', NOW()),
  ('/gl/photo_15_2026-04-14_13-04-15.jpg', NOW()),
  ('/gl/photo_16_2026-04-14_13-04-15.jpg', NOW()),
  ('/gl/photo_17_2026-04-14_13-04-15.jpg', NOW()),
  ('/gl/photo_18_2026-04-14_13-04-15.jpg', NOW()),
  ('/gl/photo_19_2026-04-14_13-04-15.jpg', NOW()),
  ('/gl/photo_20_2026-04-14_13-04-15.jpg', NOW()),
  ('/gl/subs/photo_1_2026-04-27_15-59-26.jpg', NOW()),
  ('/gl/subs/photo_2_2026-04-27_15-59-26.jpg', NOW()),
  ('/gl/subs/photo_3_2026-04-27_15-59-26.jpg', NOW()),
  ('/gl/subs/photo_4_2026-04-27_15-59-26.jpg', NOW()),
  ('/gl/subs/photo_5_2026-04-27_15-59-26.jpg', NOW()),
  ('/gl/subs/photo_6_2026-04-27_15-59-26.jpg', NOW()),
  ('/gl/subs/photo_7_2026-04-27_15-59-26.jpg', NOW()),
  ('/gl/subs/photo_1_2026-04-27_16-06-28.jpg', NOW()),
  ('/gl/subs/photo_2_2026-04-27_16-06-28.jpg', NOW()),
  ('/gl/subs/photo_3_2026-04-27_16-06-28.jpg', NOW()),
  ('/gl/subs/photo_4_2026-04-27_16-06-28.jpg', NOW()),
  ('/gl/subs/photo_5_2026-04-27_16-06-28.jpg', NOW()),
  ('/gl/subs/photo_6_2026-04-27_16-06-28.jpg', NOW()),
  ('/gl/subs/photo_7_2026-04-27_16-06-28.jpg', NOW()),
  ('/gl/subs/photo_8_2026-04-27_16-06-28.jpg', NOW())
ON CONFLICT DO NOTHING;

-- Insert existing videos into kitchen_videos table
INSERT INTO kitchen_videos (videoUrl, createdAt) VALUES
  ('/gl/IMG_5069.MP4', NOW()),
  ('/gl/IMG_5074.MP4', NOW()),
  ('/gl/IMG_5075.MP4', NOW()),
  ('/gl/IMG_5078.MP4', NOW()),
  ('/gl/IMG_5085.MP4', NOW()),
  ('/gl/IMG_5086.MP4', NOW()),
  ('/gl/IMG_5088.MP4', NOW()),
  ('/gl/IMG_5095.MP4', NOW()),
  ('/gl/subs/IMG_5304.MP4', NOW()),
  ('/gl/subs/IMG_5306.MP4', NOW()),
  ('/gl/subs/IMG_5309.MP4', NOW()),
  ('/gl/subs/IMG_5311.MP4', NOW())
ON CONFLICT DO NOTHING;
