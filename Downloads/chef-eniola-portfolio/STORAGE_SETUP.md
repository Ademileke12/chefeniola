# Supabase Storage Setup Guide

The "bucket not found" error occurs because the storage bucket needs proper policies configured.

## Steps to Fix:

### 1. Go to Supabase Dashboard
- Navigate to: https://supabase.com/dashboard/project/bebbuodjsegcdheheujo/storage/buckets

### 2. Create/Verify Buckets
Make sure you have these buckets created:
- `images` (for gallery images)
- `videos` (for kitchen videos)

### 3. Set Bucket Policies

Go to each bucket and click on "Policies" tab, then add these policies:

#### For `images` bucket:

**Policy 1: Allow public read access**
```sql
CREATE POLICY "Allow public read access to images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'images');
```

**Policy 2: Allow authenticated users to upload**
```sql
CREATE POLICY "Allow authenticated users to upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');
```

**Policy 3: Allow authenticated users to delete**
```sql
CREATE POLICY "Allow authenticated users to delete images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images');
```

#### For `videos` bucket:

**Policy 1: Allow public read access**
```sql
CREATE POLICY "Allow public read access to videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'videos');
```

**Policy 2: Allow authenticated users to upload**
```sql
CREATE POLICY "Allow authenticated users to upload videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'videos');
```

**Policy 3: Allow authenticated users to delete**
```sql
CREATE POLICY "Allow authenticated users to delete videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'videos');
```

### 4. Make Buckets Public

For each bucket:
1. Click on the bucket name
2. Click "Settings"
3. Toggle "Make bucket public" to ON
4. Save

### 5. Test Upload

Try uploading an image again in the admin panel. It should work now!

## Troubleshooting

If you still get "bucket not found":
1. Refresh the page
2. Check that the bucket name is exactly `images` or `videos` (lowercase)
3. Verify the bucket is public
4. Check that policies are created
