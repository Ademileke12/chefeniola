# Quick Reference Card

## 🚀 Getting Started (3 Steps)

```bash
# 1. Setup environment
npm run setup

# 2. Run SQL migration in Supabase Dashboard
# Copy supabase-schema.sql → SQL Editor → Run

# 3. Migrate content
npm run migrate
```

## 🔑 Master Admin

**Email**: oluwafemieniolavico@gmail.com  
**Access**: Full admin privileges

## 📹 Video Upload Limits

- **Max Size**: 5MB per video
- **Max Count**: 8 videos total
- **Format**: Any video format
- **Action**: Delete before adding when limit reached

## 🛠️ Common Commands

```bash
npm run dev              # Start development
npm run migrate          # Migrate videos/images
npm run setup            # Configure Supabase
npm run supabase:login   # Login to Supabase CLI
```

## 📁 Admin Panel Sections

1. **Visual Menu** - Gallery images (31 images)
2. **Kitchen Videos** - Kitchen videos (12 videos, max 8 after migration)
3. **Dishes Gallery** - Curated dishes
4. **Customer Reviews** - Testimonials
5. **TikTok Videos** - External videos

## 🔧 Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MASTER_ADMIN_EMAIL=oluwafemieniolavico@gmail.com
VITE_MAX_VIDEO_SIZE_MB=5
VITE_MAX_VIDEOS_COUNT=8
```

## 📊 Database Tables

- `gallery` - Visual Menu images
- `kitchen_videos` - Kitchen videos
- `dishes` - Curated dishes
- `reviews` - Customer reviews
- `videos` - TikTok videos
- `users` - User accounts

## 🎯 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't login | Check Supabase credentials in `.env` |
| Video too large | Max 5MB - compress video |
| Can't add video | Max 8 videos - delete one first |
| Upload fails | Create `videos` storage bucket |

## 📚 Documentation Files

- `SETUP_COMPLETE.md` - Complete setup guide
- `SUPABASE_SETUP_GUIDE.md` - Detailed Supabase setup
- `ADMIN_SETUP.md` - Admin panel guide
- `CHANGES_SUMMARY.md` - What changed

## 🔗 Useful Links

- Admin Panel: http://localhost:3000/admin
- Supabase Dashboard: https://supabase.com/dashboard
- Creator: https://x.com/anakincoco

---

**Status**: ✅ Ready  
**Version**: 1.0  
**Last Updated**: 2026-04-27
