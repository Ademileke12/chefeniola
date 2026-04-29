# Admin Login Setup Guide

## Overview

The admin panel now uses **email/password authentication** instead of Google OAuth.

## Admin Credentials

- **Email**: oluwafemieniolavico@gmail.com
- **Password**: Semilore1

These credentials are configured in your `.env` file.

## Setup Instructions

### Option 1: Automatic Setup (Recommended)

Run the admin user creation script:

```bash
npm run create-admin
```

This will:
- Create the admin user in Supabase
- Use credentials from `.env` file
- Provide instructions if manual setup is needed

### Option 2: Manual Setup

If the automatic script doesn't work, create the user manually:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"**
4. Fill in the details:
   - **Email**: oluwafemieniolavico@gmail.com
   - **Password**: Semilore1
   - **Auto Confirm User**: ✅ Yes (Important!)
5. Click **"Create user"**

### Option 3: Enable Email Confirmation

If you want users to confirm their email:

1. Go to Supabase Dashboard → **Authentication** → **Settings**
2. Under **Email Auth**, enable:
   - ✅ Enable email confirmations
3. Configure email templates if needed
4. User will receive confirmation email after signup

## Configuration

### Environment Variables

Your `.env` file should contain:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Master Admin Credentials
VITE_MASTER_ADMIN_EMAIL=oluwafemieniolavico@gmail.com
VITE_MASTER_ADMIN_PASSWORD=Semilore1

# Upload Limits
VITE_MAX_VIDEO_SIZE_MB=5
VITE_MAX_VIDEOS_COUNT=8
```

### Enable Email/Password Authentication

Ensure email/password auth is enabled in Supabase:

1. Go to **Authentication** → **Providers**
2. Find **Email** provider
3. Ensure it's **enabled**
4. Configure settings:
   - ✅ Enable email provider
   - ✅ Confirm email (optional)
   - ✅ Secure email change (recommended)

## Login Process

### For Admin

1. Navigate to: http://localhost:3000/admin
2. Enter credentials:
   - **Email**: oluwafemieniolavico@gmail.com
   - **Password**: Semilore1
3. Click **"Sign In"**
4. You'll be redirected to the admin dashboard

### Login Form Features

- Email and password input fields
- Form validation
- Error messages for invalid credentials
- Loading state during login
- Secure password input (hidden characters)

## Security Notes

### Password Security

⚠️ **IMPORTANT**: The password is stored in the `.env` file for convenience during development. For production:

1. **Change the password** to something more secure
2. **Never commit** `.env` file to version control
3. Use environment variables in your hosting platform
4. Consider using a password manager

### Recommended Production Password

For production, use a strong password:
- At least 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Not easily guessable
- Unique to this application

Example strong password: `Ch3f3n!0la@2026$ecur3`

### Environment Variable Security

- `.env` file is in `.gitignore` ✅
- Never share credentials publicly
- Use different passwords for dev/staging/production
- Rotate passwords regularly

## Troubleshooting

### "Invalid login credentials"

**Causes:**
- User not created in Supabase
- Wrong email or password
- User not confirmed

**Solutions:**
1. Run `npm run create-admin` to create user
2. Check credentials in `.env` file
3. Verify user exists in Supabase Dashboard
4. Ensure "Auto Confirm User" was enabled

### "Email not confirmed"

**Solution:**
1. Go to Supabase Dashboard → Authentication → Users
2. Find the user
3. Click the three dots → "Confirm email"

Or enable auto-confirmation:
1. Go to Authentication → Settings
2. Disable "Enable email confirmations"

### "User already registered"

This means the user exists. Try logging in with the credentials.

If you forgot the password:
1. Go to Supabase Dashboard → Authentication → Users
2. Find the user
3. Click three dots → "Reset password"
4. Or delete and recreate the user

### Login form not appearing

**Check:**
1. You're navigating to `/admin` route
2. You're not already logged in (logout first)
3. No console errors in browser

## Testing

### Test Login Flow

1. Navigate to admin page
2. Enter correct credentials → Should login successfully
3. Enter wrong password → Should show error
4. Enter wrong email → Should show error
5. Leave fields empty → Should show validation error

### Test Admin Access

After logging in:
1. Verify all admin tabs are visible
2. Test uploading a video
3. Test adding an image
4. Test deleting content
5. Verify real-time updates work

## Changing Credentials

### Change Email

1. Update `VITE_MASTER_ADMIN_EMAIL` in `.env`
2. Create new user with new email
3. Delete old user from Supabase Dashboard

### Change Password

1. Update `VITE_MASTER_ADMIN_PASSWORD` in `.env`
2. Go to Supabase Dashboard → Authentication → Users
3. Find user → Reset password
4. Or delete and recreate user with `npm run create-admin`

## Migration from Google OAuth

If you were using Google OAuth before:

1. Old Google login will no longer work
2. Users need to be created with email/password
3. Update any documentation referencing Google login
4. Inform users of the new login method

## Additional Users

To add more admin users:

1. Create user in Supabase Dashboard
2. Add their email to `users` table with `role='admin'`
3. They can login with their email/password
4. Master admin (from `.env`) always has access

## Quick Reference

```bash
# Create admin user
npm run create-admin

# Start dev server
npm run dev

# Access admin panel
# http://localhost:3000/admin

# Login credentials
# Email: oluwafemieniolavico@gmail.com
# Password: Semilore1
```

## Support

For issues:
1. Check Supabase Dashboard for user status
2. Verify credentials in `.env` file
3. Check browser console for errors
4. Review Supabase auth logs

---

**Master Admin**: oluwafemieniolavico@gmail.com  
**Password**: Semilore1  
**Auth Method**: Email/Password  
**Created by**: [Anakincoco](https://x.com/anakincoco)
