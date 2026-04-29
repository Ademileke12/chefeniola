-- Add createdAt column to gallery table if it doesn't exist
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add createdAt column to kitchen_videos table if it doesn't exist
ALTER TABLE kitchen_videos ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add createdAt column to image_reviews table if it doesn't exist
ALTER TABLE image_reviews ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW();
