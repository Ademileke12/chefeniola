# Supabase Storage Setup Guide

This guide explains how to set up Supabase Storage for design file uploads.

## Creating the Storage Bucket

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `designs`
   - **Public bucket**: ✅ Enable (so uploaded files are publicly accessible)
   - **File size limit**: 10 MB (or higher if needed)
   - **Allowed MIME types**: Leave empty or add: `image/jpeg`, `image/png`, `image/svg+xml`, `application/pdf`
5. Click **Create bucket**

## Setting Bucket Policies

After creating the bucket, you need to set up policies to allow uploads:

1. Click on the `designs` bucket
2. Go to **Policies** tab
3. Click **New policy**
4. Create the following policies:

### Policy 1: Allow Public Read Access

```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'designs');
```

### Policy 2: Allow Authenticated Uploads

```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'designs');
```

### Policy 3: Allow Service Role Full Access

```sql
CREATE POLICY "Service role has full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'designs');
```

## Alternative: Quick Setup via SQL

You can also run this SQL in the Supabase SQL Editor:

```sql
-- Create the designs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('designs', 'designs', true);

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'designs');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'designs');

-- Allow service role full access
CREATE POLICY "Service role has full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'designs');
```

## Verifying the Setup

1. Go back to **Storage** in your Supabase dashboard
2. You should see the `designs` bucket listed
3. Try uploading a test file through the dashboard
4. If successful, try uploading through the admin panel at `/admin/products/new`

## Troubleshooting

### "Failed to upload file to storage"

This error usually means:
- The `designs` bucket doesn't exist
- The bucket policies are not configured correctly
- The service role key is incorrect

**Solution**: Follow the steps above to create the bucket and set up policies.

### "Bucket not found"

- Make sure the bucket name is exactly `designs` (lowercase)
- Check that the bucket was created successfully in the Supabase dashboard

### "Permission denied"

- Verify that the service role policy is set up correctly
- Check that `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is correct
- Make sure you're using the service role key, not the anon key

## File Upload Limits

The current configuration allows:
- **File types**: JPEG, PNG, SVG, PDF
- **Max file size**: 10 MB
- **Storage location**: `designs/` folder in the bucket

To change these limits, edit `lib/services/fileService.ts`.

## Security Notes

- The bucket is public, meaning uploaded files are accessible via their URL
- Only authenticated users (via service role) can upload files
- Consider adding file scanning for malware in production
- Implement rate limiting to prevent abuse
- Regularly clean up unused design files to save storage space
