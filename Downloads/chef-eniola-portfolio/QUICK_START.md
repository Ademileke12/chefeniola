# 🚀 Quick Start Guide

## Admin Login - Email/Password

### Credentials
- **Email**: oluwafemieniolavico@gmail.com
- **Password**: Semilore1

### Setup (3 Steps)

```bash
# 1. Create admin user
npm run create-admin

# 2. Start development server
npm run dev

# 3. Login at http://localhost:3000/admin
```

## What's Configured

✅ Email/password authentication (no Google OAuth)  
✅ Master admin: oluwafemieniolavico@gmail.com  
✅ Password: Semilore1  
✅ Video upload: 5MB max, 8 videos max  
✅ Supabase integration ready  

## Files You Need

### `.env` (Already configured)
```env
VITE_SUPABASE_URL=https://bebbuodjsegcdheheujo.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
VITE_MASTER_ADMIN_EMAIL=oluwafemieniolavico@gmail.com
VITE_MASTER_ADMIN_PASSWORD=Semilore1
VITE_MAX_VIDEO_SIZE_MB=5
VITE_MAX_VIDEOS_COUNT=8
```

## Database Setup

### Run SQL Migration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. SQL Editor → Copy `supabase-schema.sql` → Run

### Create Storage Bucket

1. Storage → New bucket
2. Name: `videos`
3. Public: ✅ Yes

## Create Admin User

### Automatic (Recommended)
```bash
npm run create-admin
```

### Manual
1. Supabase Dashboard → Authentication → Users
2. Add user:
   - Email: oluwafemieniolavico@gmail.com
   - Password: Semilore1
   - Auto Confirm: ✅ Yes

## Login

1. Navigate to: http://localhost:3000/admin
2. Enter email and password
3. Click "Sign In"

## Troubleshooting

### Can't login?
```bash
# Create user again
npm run create-admin
```

### User not found?
- Check Supabase Dashboard → Authentication → Users
- Ensure user exists and is confirmed

### Wrong credentials?
- Check `.env` file
- Email: oluwafemieniolavico@gmail.com
- Password: Semilore1

## Documentation

- **ADMIN_LOGIN_SETUP.md** - Complete login setup guide
- **LOGIN_UPDATE_SUMMARY.md** - What changed
- **SUPABASE_SETUP_GUIDE.md** - Database setup
- **SETUP_COMPLETE.md** - Full setup guide

## Commands

```bash
npm run dev              # Start dev server
npm run create-admin     # Create admin user
npm run migrate          # Migrate content
npm run build           # Build for production
npm run lint            # Type check
```

## Admin Features

After login, you can:
- ✅ Manage Visual Menu images
- ✅ Upload/delete kitchen videos (5MB max, 8 max)
- ✅ Manage dishes gallery
- ✅ Manage customer reviews
- ✅ Manage TikTok videos

## Security Notes

⚠️ For production:
- Change password to something stronger
- Never commit `.env` to version control
- Use environment variables in hosting platform

---

**Ready to go!** 🎉

Run `npm run create-admin` then `npm run dev` to get started.

**Login**: http://localhost:3000/admin  
**Email**: oluwafemieniolavico@gmail.com  
**Password**: Semilore1
