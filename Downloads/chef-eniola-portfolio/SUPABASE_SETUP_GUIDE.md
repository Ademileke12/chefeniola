# Supabase Setup Guide

## Quick Setup

### Option 1: Automated Setup Script

Run the setup script to configure your environment:

```bash
./setup-supabase.sh
```

This will:
- Create/update your `.env` file
- Prompt you for Supabase credentials
- Provide next steps for database setup

### Option 2: Manual Setup

1. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_MASTER_ADMIN_EMAIL=oluwafemieniolavico@gmail.com
   VITE_MAX_VIDEO_SIZE_MB=5
   VITE_MAX_VIDEOS_COUNT=8
   ```

## Database Setup

### 1. Create Tables

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-schema.sql`
4. Paste and click **Run**

This creates:
- `gallery` table for Visual Menu images
- `kitchen_videos` table for Kitchen videos
- Row Level Security policies
- Pre-populated data with existing images/videos

### 2. Create Storage Bucket

1. Go to **Storage** in your Supabase Dashboard
2. Click **New bucket**
3. Configure:
   - **Name**: `videos`
   - **Public**: ✅ Yes
   - Click **Create bucket**

### 3. Set Storage Policies

Run this SQL in the SQL Editor:

```sql
-- Allow public read access to videos
CREATE POLICY "Allow public read access to videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'videos');

-- Allow authenticated users to upload videos
CREATE POLICY "Allow authenticated users to upload videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'videos');

-- Allow authenticated users to delete videos
CREATE POLICY "Allow authenticated users to delete videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'videos');
```

## Configuration Details

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Required |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Required |
| `VITE_MASTER_ADMIN_EMAIL` | Master admin email address | oluwafemieniolavico@gmail.com |
| `VITE_MAX_VIDEO_SIZE_MB` | Maximum video upload size in MB | 5 |
| `VITE_MAX_VIDEOS_COUNT` | Maximum number of videos allowed | 8 |

### Master Admin

The master admin email is set to: **oluwafemieniolavico@gmail.com**

This user will have full admin access without needing database configuration.

### Video Upload Limits

- **Maximum file size**: 5MB (configurable via `VITE_MAX_VIDEO_SIZE_MB`)
- **Maximum videos**: 8 videos (configurable via `VITE_MAX_VIDEOS_COUNT`)
- Admin must delete a video before adding a new one when limit is reached

## Using Supabase CLI

### Install Supabase CLI

The Supabase CLI is already installed as a dev dependency. You can use it via npm:

```bash
npx supabase --help
```

### Common Commands

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Generate TypeScript types from your database
npx supabase gen types typescript --linked > src/types/supabase.ts

# Run migrations
npx supabase db push

# View database status
npx supabase db status
```

### Initialize Supabase Project (Optional)

If you want to use local development:

```bash
# Initialize Supabase in your project
npx supabase init

# Start local Supabase
npx supabase start

# Stop local Supabase
npx supabase stop
```

## Testing the Setup

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Access the admin panel**
   - Navigate to: http://localhost:3000/admin
   - Sign in with Google using: oluwafemieniolavico@gmail.com

3. **Test functionality**
   - Add/delete gallery images
   - Upload videos (max 5MB)
   - Verify video count limit (8 videos max)
   - Check real-time updates on frontend

## Troubleshooting

### "Failed to add video"
- Ensure you're logged in as admin
- Check that storage bucket is created and public
- Verify storage policies are set correctly

### "Video size exceeds limit"
- Videos must be under 5MB
- Compress your video or adjust `VITE_MAX_VIDEO_SIZE_MB`

### "Maximum videos reached"
- Delete an existing video before adding a new one
- Or increase `VITE_MAX_VIDEOS_COUNT` in `.env`

### Authentication Issues
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check that Google OAuth is enabled in Supabase Dashboard
- Ensure master admin email matches in `.env`

## Security Notes

- Never commit `.env` file to version control
- Keep your Supabase keys secure
- Row Level Security (RLS) is enabled on all tables
- Only authenticated users can modify content
- Public users can only read content

## Next Steps

After setup is complete:

1. ✅ Test admin login
2. ✅ Upload a test video
3. ✅ Add gallery images
4. ✅ Verify frontend displays correctly
5. ✅ Test real-time updates
6. 🚀 Deploy to production!

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs
- Review error messages in browser console
- Verify all environment variables are set correctly
