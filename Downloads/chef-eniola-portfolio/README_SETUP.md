# Chef Eniola Portfolio - Setup Guide

## 🎯 Quick Start (3 Commands)

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Setup Supabase configuration
npm run setup

# 3. Migrate existing content to database
npm run migrate
```

Then run the SQL migration in your Supabase Dashboard (see below).

## 📋 Prerequisites

- Node.js installed
- Supabase account (free tier works)
- Google OAuth enabled in Supabase

## 🔧 Detailed Setup

### Step 1: Environment Configuration

**Option A: Automated Setup**
```bash
npm run setup
```
This will prompt you for your Supabase credentials and update `.env` automatically.

**Option B: Manual Setup**
```bash
cp .env.example .env
```
Then edit `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MASTER_ADMIN_EMAIL=oluwafemieniolavico@gmail.com
VITE_MAX_VIDEO_SIZE_MB=5
VITE_MAX_VIDEOS_COUNT=8
```

### Step 2: Database Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-schema.sql`
4. Paste and click **Run**

This creates:
- `gallery` table (Visual Menu images)
- `kitchen_videos` table (Kitchen videos)
- Row Level Security policies
- Pre-populated data

### Step 3: Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Name: `videos`
4. Make it **public**
5. Click **Create bucket**

### Step 4: Migrate Content

```bash
npm run migrate
```

This migrates:
- 12 existing videos → `kitchen_videos` table
- 31 existing images → `gallery` table

### Step 5: Start Development

```bash
npm run dev
```

Visit: http://localhost:3000

## 👤 Admin Access

### Master Admin
- **Email**: oluwafemieniolavico@gmail.com
- **Access**: Full admin privileges
- **Login**: Navigate to `/admin` and sign in with Google

### Admin Panel Features
1. **Visual Menu** - Manage gallery images
2. **Kitchen Videos** - Upload/delete videos (5MB max, 8 videos max)
3. **Dishes Gallery** - Manage curated dishes
4. **Customer Reviews** - Manage testimonials
5. **TikTok Videos** - Manage external video links

## 📹 Video Upload Limits

- **Maximum file size**: 5MB per video
- **Maximum videos**: 8 videos total
- **Validation**: Automatic file size and type checking
- **Behavior**: Must delete a video before adding new one when limit reached

## 🛠️ Available Commands

### Development
```bash
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Type check
npm run clean           # Clean build files
```

### Supabase
```bash
npm run setup           # Interactive Supabase setup
npm run migrate         # Migrate videos/images to database
npm run supabase:login  # Login to Supabase CLI
npm run supabase:link   # Link to Supabase project
npm run supabase:types  # Generate TypeScript types
npm run supabase:status # Check database status
```

## 📚 Documentation

- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - Complete setup guide with all features
- **[SUPABASE_SETUP_GUIDE.md](SUPABASE_SETUP_GUIDE.md)** - Detailed Supabase configuration
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick reference card
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- **[ADMIN_SETUP.md](ADMIN_SETUP.md)** - Admin panel usage guide

## 🔍 Troubleshooting

### Can't login to admin panel
- Verify Supabase credentials in `.env`
- Enable Google OAuth in Supabase Dashboard → Authentication → Providers
- Ensure master admin email matches in `.env`

### Video upload fails
- Check storage bucket `videos` exists and is public
- Verify video is under 5MB
- Ensure you haven't reached 8 video limit

### Migration fails
- Verify Supabase credentials are correct
- Check database tables are created
- Run SQL migration first before running `npm run migrate`

### Real-time updates not working
- Check Supabase Realtime is enabled
- Verify Row Level Security policies are set
- Check browser console for errors

## 🏗️ Project Structure

```
.
├── .env                          # Environment variables (DO NOT COMMIT)
├── .env.example                  # Environment template
├── supabase-schema.sql           # Database schema
├── migrate-videos.js             # Migration script
├── setup-supabase.sh             # Setup script
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminGallery.tsx        # Gallery management
│   │   │   ├── AdminKitchenVideos.tsx  # Video management (with limits)
│   │   │   ├── AdminDishes.tsx         # Dishes management
│   │   │   ├── AdminReviews.tsx        # Reviews management
│   │   │   └── AdminVideos.tsx         # TikTok videos management
│   │   ├── LocalGallery.tsx            # Frontend gallery display
│   │   └── LocalVideos.tsx             # Frontend videos display
│   ├── contexts/
│   │   └── AuthContext.tsx             # Authentication (master admin)
│   ├── pages/
│   │   ├── Admin.tsx                   # Admin panel
│   │   └── Home.tsx                    # Homepage
│   └── supabase.ts                     # Supabase client
└── package.json                        # Dependencies and scripts
```

## 🔐 Security

- ✅ Row Level Security enabled on all tables
- ✅ Master admin authentication via environment variable
- ✅ Authenticated-only modifications
- ✅ Public read access for frontend
- ✅ Secure storage policies
- ✅ `.env` file in `.gitignore`

## 🎨 Features

### Frontend
- Responsive design with Tailwind CSS
- Smooth animations with Framer Motion
- Real-time content updates
- Parallax scrolling gallery
- Auto-playing video grid

### Admin Panel
- Modern, clean interface
- Real-time content management
- File upload with validation
- Drag-and-drop support
- Error handling and feedback
- Loading states and progress indicators

## 📊 Database Tables

| Table | Purpose | Fields |
|-------|---------|--------|
| `gallery` | Visual Menu images | id, imageUrl, createdAt |
| `kitchen_videos` | Kitchen videos | id, videoUrl, createdAt |
| `dishes` | Curated dishes | id, title, description, imageUrl, createdAt |
| `reviews` | Customer reviews | id, name, review, rating, createdAt |
| `videos` | TikTok videos | id, title, videoUrl, thumbnailUrl, createdAt |
| `users` | User accounts | id, email, role, createdAt |

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables for Production
Ensure these are set in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MASTER_ADMIN_EMAIL`
- `VITE_MAX_VIDEO_SIZE_MB`
- `VITE_MAX_VIDEOS_COUNT`

## 📞 Support

For issues or questions:
1. Check the documentation files listed above
2. Review error messages in browser console
3. Verify all environment variables are set
4. Check Supabase Dashboard for database/storage issues

## 👨‍💻 Credits

**Created by**: [Anakincoco](https://x.com/anakincoco)

**Master Admin**: oluwafemieniolavico@gmail.com

---

## ✅ Setup Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Environment configured (`.env` file)
- [ ] Database tables created (SQL migration)
- [ ] Storage bucket created (`videos`)
- [ ] Content migrated (`npm run migrate`)
- [ ] Development server running (`npm run dev`)
- [ ] Admin login tested
- [ ] Video upload tested
- [ ] Frontend displays correctly

**Status**: Ready to use! 🎉
