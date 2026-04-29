# Admin Panel Setup Guide

## Overview
The admin panel now includes management for:
- **Visual Menu** - Gallery images displayed in the Visual Menu section
- **Kitchen Videos** - Videos displayed in the "In The Kitchen" section
- **Dishes Gallery** - Curated dishes with titles and descriptions
- **Customer Reviews** - Customer testimonials
- **TikTok Videos** - External video links

## Database Setup

### 1. Create Tables in Supabase

Run the SQL commands in `supabase-schema.sql` in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Click "Run" to execute

This will:
- Create `gallery` table for Visual Menu images
- Create `kitchen_videos` table for Kitchen section videos
- Set up Row Level Security policies
- Pre-populate tables with existing images and videos

### 2. Tables Structure

#### Gallery Table
```sql
- id: UUID (Primary Key)
- imageUrl: TEXT (Image URL or path)
- createdAt: TIMESTAMP
```

#### Kitchen Videos Table
```sql
- id: UUID (Primary Key)
- videoUrl: TEXT (Video URL or path)
- createdAt: TIMESTAMP
```

## Admin Panel Features

### Visual Menu Management
- View all gallery images in a grid layout
- Add new images by providing URL or local path (e.g., `/gl/photo.jpg`)
- Delete existing images
- Real-time updates when images are added/deleted

### Kitchen Videos Management
- View all kitchen videos in a grid layout
- Add new videos by providing URL or local path (e.g., `/gl/video.MP4`)
- Delete existing videos
- Real-time updates when videos are added/deleted

### How It Works

1. **Frontend Display**: 
   - `LocalGallery.tsx` loads images from Supabase `gallery` table
   - `LocalVideos.tsx` loads videos from Supabase `kitchen_videos` table
   - Falls back to hardcoded arrays if database is empty

2. **Admin Management**:
   - `AdminGallery.tsx` manages Visual Menu images
   - `AdminKitchenVideos.tsx` manages Kitchen videos
   - Both support add/delete operations with real-time sync

3. **Real-time Updates**:
   - Uses Supabase real-time subscriptions
   - Changes in admin panel instantly reflect on frontend
   - No page refresh needed

## Usage

### Adding Images/Videos

1. Log in to admin panel
2. Navigate to "Visual Menu" or "Kitchen Videos" tab
3. Click "Add Image" or "Add Video"
4. Enter the URL or local path:
   - Local: `/gl/photo_name.jpg` or `/gl/subs/video.MP4`
   - External: `https://example.com/image.jpg`
5. Click "Save"

### Deleting Images/Videos

1. Hover over any image/video in the admin panel
2. Click the red trash icon that appears
3. Confirm deletion

## Footer Credit

The admin panel footer includes:
- "Created by Anakincoco"
- Link to: https://x.com/anakincoco

## Notes

- All images and videos must be accessible via URL or local path
- Local files should be in the `/gl` or `/gl/subs` directories
- Admin authentication is required for add/delete operations
- Public users can view but not modify content
