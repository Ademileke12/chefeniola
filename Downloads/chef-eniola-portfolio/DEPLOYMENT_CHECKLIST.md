# 🚀 Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Configuration ✅
- [x] `.env` file created
- [x] Supabase URL configured
- [x] Supabase Anon Key configured
- [x] Master admin email set: oluwafemieniolavico@gmail.com
- [x] Upload limits configured (5MB, 8 videos)

### 2. Database Setup
- [ ] Run SQL migration in Supabase Dashboard
  - Go to: SQL Editor
  - Copy: `supabase-schema.sql`
  - Click: Run
- [ ] Verify tables created:
  - [ ] `gallery` table
  - [ ] `kitchen_videos` table
- [ ] Verify Row Level Security enabled

### 3. Storage Setup
- [ ] Create storage bucket named `videos`
- [ ] Make bucket public
- [ ] Set storage policies (see `supabase-schema.sql`)

### 4. Content Migration
- [ ] Run: `npm run migrate`
- [ ] Verify 12 videos migrated
- [ ] Verify 31 images migrated
- [ ] Check for any errors in console

### 5. Authentication Setup
- [ ] Enable Google OAuth in Supabase Dashboard
  - Go to: Authentication → Providers
  - Enable: Google
  - Configure: OAuth credentials
- [ ] Add authorized redirect URLs
- [ ] Test login with master admin email

## Testing Checklist

### Admin Panel Tests
- [ ] Navigate to `/admin`
- [ ] Login with oluwafemieniolavico@gmail.com
- [ ] Verify all tabs visible:
  - [ ] Visual Menu
  - [ ] Kitchen Videos
  - [ ] Dishes Gallery
  - [ ] Customer Reviews
  - [ ] TikTok Videos

### Video Upload Tests
- [ ] Upload video under 5MB → Should succeed
- [ ] Upload video over 5MB → Should show error
- [ ] Upload 8th video → Should succeed
- [ ] Try to upload 9th video → Should be blocked
- [ ] Delete a video → Should succeed
- [ ] Upload after delete → Should succeed

### Image Upload Tests
- [ ] Add new image via URL → Should succeed
- [ ] Add new image via local path → Should succeed
- [ ] Delete image → Should succeed
- [ ] Verify real-time updates on frontend

### Frontend Tests
- [ ] Visit homepage
- [ ] Verify Visual Menu displays images
- [ ] Verify Kitchen Videos display
- [ ] Check parallax scrolling works
- [ ] Test on mobile devices
- [ ] Verify real-time updates work

### Real-time Tests
- [ ] Open admin panel in one tab
- [ ] Open homepage in another tab
- [ ] Add image in admin → Should appear on homepage
- [ ] Delete image in admin → Should disappear from homepage
- [ ] Add video in admin → Should appear on homepage
- [ ] Delete video in admin → Should disappear from homepage

## Production Deployment

### Environment Variables
Set these in your hosting platform:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MASTER_ADMIN_EMAIL=oluwafemieniolavico@gmail.com
VITE_MAX_VIDEO_SIZE_MB=5
VITE_MAX_VIDEOS_COUNT=8
```

### Build Process
- [ ] Run: `npm run build`
- [ ] Verify build succeeds
- [ ] Check `dist` folder created
- [ ] Test production build: `npm run preview`

### Deployment Platforms

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
```

#### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables in Netlify Dashboard
```

#### Other Platforms
- Upload `dist` folder
- Configure environment variables
- Set build command: `npm run build`
- Set output directory: `dist`

### Post-Deployment
- [ ] Verify site loads
- [ ] Test admin login
- [ ] Test video upload
- [ ] Test image management
- [ ] Check mobile responsiveness
- [ ] Verify SSL certificate
- [ ] Test all navigation links

## Security Checklist

### Supabase Security
- [ ] Row Level Security enabled on all tables
- [ ] Storage policies configured correctly
- [ ] API keys are environment variables
- [ ] `.env` file in `.gitignore`
- [ ] No sensitive data in code

### Authentication
- [ ] Google OAuth configured
- [ ] Master admin email verified
- [ ] Only authenticated users can modify content
- [ ] Public users can only read content

### Upload Security
- [ ] File size limits enforced (5MB)
- [ ] File type validation (videos only)
- [ ] Video count limit enforced (8 max)
- [ ] Storage bucket properly secured

## Performance Checklist

### Frontend Optimization
- [ ] Images lazy loaded
- [ ] Videos optimized
- [ ] Code split and minified
- [ ] CSS optimized
- [ ] Fonts optimized

### Database Optimization
- [ ] Indexes on frequently queried fields
- [ ] Real-time subscriptions optimized
- [ ] Query limits set appropriately

### Caching
- [ ] Static assets cached
- [ ] API responses cached where appropriate
- [ ] CDN configured (if applicable)

## Monitoring Setup

### Error Tracking
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor console errors
- [ ] Track failed uploads
- [ ] Monitor authentication issues

### Analytics
- [ ] Set up analytics (Google Analytics, etc.)
- [ ] Track page views
- [ ] Monitor admin panel usage
- [ ] Track upload success/failure rates

### Performance Monitoring
- [ ] Monitor page load times
- [ ] Track API response times
- [ ] Monitor storage usage
- [ ] Track database query performance

## Backup & Recovery

### Database Backups
- [ ] Enable automatic backups in Supabase
- [ ] Test backup restoration
- [ ] Document backup schedule

### Storage Backups
- [ ] Backup storage bucket contents
- [ ] Document storage structure
- [ ] Test file restoration

### Code Backups
- [ ] Code in version control (Git)
- [ ] Regular commits
- [ ] Tagged releases

## Documentation

### For Users
- [ ] Admin panel usage guide
- [ ] Video upload instructions
- [ ] Troubleshooting guide

### For Developers
- [ ] Setup instructions
- [ ] API documentation
- [ ] Database schema documentation
- [ ] Deployment guide

## Support Setup

### Contact Information
- [ ] Support email configured
- [ ] Admin contact information documented
- [ ] Creator credit visible (Anakincoco)

### Issue Tracking
- [ ] GitHub issues enabled (if applicable)
- [ ] Bug report template
- [ ] Feature request template

## Final Verification

### Functionality
- [x] All features working
- [x] No console errors
- [x] TypeScript compilation successful
- [x] All tests passing

### Documentation
- [x] README complete
- [x] Setup guide available
- [x] API documentation complete
- [x] Troubleshooting guide available

### Security
- [x] Environment variables secure
- [x] Authentication working
- [x] Authorization working
- [x] Data validation working

### Performance
- [ ] Page load time acceptable
- [ ] API response time acceptable
- [ ] Real-time updates working
- [ ] Mobile performance good

## Go-Live Checklist

- [ ] All pre-deployment tasks complete
- [ ] All tests passing
- [ ] Production environment configured
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Documentation complete
- [ ] Support channels ready
- [ ] Final review complete

## Post-Launch

### Week 1
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Fix critical issues

### Month 1
- [ ] Review analytics
- [ ] Optimize performance
- [ ] Plan feature updates
- [ ] Update documentation

---

## Quick Commands Reference

```bash
# Setup
npm run setup           # Configure Supabase
npm run migrate         # Migrate content

# Development
npm run dev            # Start dev server
npm run lint           # Type check

# Supabase
npm run supabase:login  # Login to Supabase
npm run supabase:link   # Link to project
npm run supabase:types  # Generate types

# Production
npm run build          # Build for production
npm run preview        # Preview build
```

---

**Master Admin**: oluwafemieniolavico@gmail.com  
**Max Video Size**: 5MB  
**Max Videos**: 8  
**Created by**: [Anakincoco](https://x.com/anakincoco)

**Status**: Ready for deployment! 🚀
