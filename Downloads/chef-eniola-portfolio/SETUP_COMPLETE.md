# Setup Complete! 🎉

## What's Been Configured

### ✅ Environment Variables
- `.env` file created with Supabase configuration
- Master admin email set to: **oluwafemieniolavico@gmail.com**
- Video upload limits configured:
  - Max file size: **5MB**
  - Max videos: **8 videos**

### ✅ Admin Panel Features
- **Visual Menu Management** - Add/delete gallery images
- **Kitchen Videos Management** - Upload videos with size validation
- **Video Upload Limits** - Enforced 5MB limit and 8 video maximum
- **Real-time Updates** - Changes sync instantly to frontend
- **Master Admin Access** - oluwafemieniolavico@gmail.com has full access

### ✅ Database Schema
- `gallery` table for Visual Menu images
- `kitchen_videos` table for Kitchen videos
- Row Level Security policies configured
- Storage bucket setup for video uploads

### ✅ Supabase CLI
- Installed as dev dependency
- Available via `npx supabase` or `npm run supabase:*` commands

### ✅ Migration Tools
- `migrate-videos.js` - Migrate existing videos to database
- `setup-supabase.sh` - Interactive setup script

## Quick Start

### 1. Configure Supabase

**Option A: Use Setup Script**
```bash
npm run setup
```

**Option B: Manual Configuration**
Edit `.env` file with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Run Database Migration

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase-schema.sql`
3. Paste and click **Run**

### 3. Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create new bucket named `videos`
3. Make it **public**

### 4. Migrate Existing Content

```bash
npm run migrate
```

This will migrate all 12 videos and 31 images to your database.

### 5. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000/admin

## Admin Panel Usage

### Login
- Navigate to `/admin`
- Sign in with Google using: **oluwafemieniolavico@gmail.com**

### Managing Videos

**Upload Video:**
1. Click "Kitchen Videos" tab
2. Click "Add Video"
3. Choose upload method:
   - **Upload File**: Select video file (max 5MB)
   - **Enter URL**: Provide video URL or local path
4. Click "Save Video"

**Limitations:**
- Maximum 8 videos allowed
- Maximum 5MB per video
- Must delete a video before adding new one when limit reached

**Delete Video:**
1. Hover over video thumbnail
2. Click red trash icon
3. Confirm deletion

### Managing Images

**Add Image:**
1. Click "Visual Menu" tab
2. Click "Add Image"
3. Enter image URL or local path
4. Click "Save Image"

**Delete Image:**
1. Hover over image
2. Click red trash icon
3. Confirm deletion

## Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build

# Supabase
npm run setup           # Interactive Supabase setup
npm run migrate         # Migrate videos/images to database
npm run supabase:login  # Login to Supabase CLI
npm run supabase:link   # Link to Supabase project
npm run supabase:types  # Generate TypeScript types
npm run supabase:status # Check database status

# Other
npm run lint            # Type check
npm run clean           # Clean build files
```

## File Structure

```
.
├── .env                          # Environment variables (DO NOT COMMIT)
├── .env.example                  # Environment template
├── supabase-schema.sql           # Database schema
├── migrate-videos.js             # Migration script
├── setup-supabase.sh             # Setup script
├── SUPABASE_SETUP_GUIDE.md       # Detailed setup guide
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminGallery.tsx        # Gallery management
│   │   │   └── AdminKitchenVideos.tsx  # Video management
│   │   ├── LocalGallery.tsx            # Frontend gallery
│   │   └── LocalVideos.tsx             # Frontend videos
│   ├── contexts/
│   │   └── AuthContext.tsx             # Authentication
│   └── pages/
│       └── Admin.tsx                   # Admin panel
```

## Configuration Reference

### Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Your project URL | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your anon key | Supabase anonymous key |
| `VITE_MASTER_ADMIN_EMAIL` | oluwafemieniolavico@gmail.com | Master admin email |
| `VITE_MAX_VIDEO_SIZE_MB` | 5 | Max video size in MB |
| `VITE_MAX_VIDEOS_COUNT` | 8 | Max number of videos |

### Video Upload Validation

The admin panel enforces:
- ✅ File type validation (must be video)
- ✅ File size validation (max 5MB)
- ✅ Video count limit (max 8 videos)
- ✅ Clear error messages
- ✅ Upload progress indicator

### Security Features

- ✅ Row Level Security on all tables
- ✅ Master admin authentication
- ✅ Authenticated-only modifications
- ✅ Public read access
- ✅ Secure storage policies

## Troubleshooting

### "Failed to add video"
**Solution:** Ensure storage bucket is created and policies are set

### "Video size exceeds limit"
**Solution:** Compress video or adjust `VITE_MAX_VIDEO_SIZE_MB`

### "Maximum videos reached"
**Solution:** Delete an existing video first

### Authentication not working
**Solution:** 
- Verify Supabase credentials in `.env`
- Enable Google OAuth in Supabase Dashboard
- Check master admin email matches

## Next Steps

1. ✅ Complete Supabase setup
2. ✅ Run database migration
3. ✅ Test admin login
4. ✅ Upload a test video
5. ✅ Verify frontend displays correctly
6. 🚀 Deploy to production!

## Support & Documentation

- **Supabase Setup Guide**: `SUPABASE_SETUP_GUIDE.md`
- **Admin Setup Guide**: `ADMIN_SETUP.md`
- **Changes Summary**: `CHANGES_SUMMARY.md`
- **Supabase Docs**: https://supabase.com/docs

## Credits

Created by [Anakincoco](https://x.com/anakincoco)

---

**Master Admin**: oluwafemieniolavico@gmail.com
**Video Limits**: 5MB max, 8 videos max
**Status**: ✅ Ready to use!
