# Troubleshooting: Blank Page Issue

## Problem
The website loads but shows a blank page with nothing on it.

## Common Causes

### 1. Supabase Connection Issue (Most Likely)

The app is trying to connect to Supabase but failing, which blocks rendering.

**Solution:**

Check your `.env` file has valid Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-actual-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

**How to get your credentials:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### 2. Browser Console Errors

**Check browser console:**

1. Open browser (Chrome/Firefox/Safari)
2. Press `F12` or right-click → Inspect
3. Go to **Console** tab
4. Look for red error messages

**Common errors:**

- `Failed to fetch` → Supabase connection issue
- `Invalid API key` → Wrong Supabase credentials
- `Network error` → Internet connection issue
- `CORS error` → Supabase configuration issue

### 3. Port Already in Use

The dev server might be running on a different port.

**Check the terminal output:**

```
Port 3000 is in use, trying another one...
➜  Local:   http://localhost:3001/
```

**Solution:** Navigate to the correct port (e.g., http://localhost:3001)

### 4. JavaScript Error

A JavaScript error might be preventing the app from rendering.

**Check:**
1. Browser console for errors
2. Terminal for build errors
3. Network tab for failed requests

## Quick Fixes

### Fix 1: Use Fallback Mode (No Database)

If you don't have Supabase set up yet, the app should still work with fallback data.

**Verify `.env` has placeholder values:**

```env
VITE_SUPABASE_URL=https://placeholder-domain.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-key
```

The app will show warnings but should still render with local images/videos.

### Fix 2: Clear Browser Cache

1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Fix 3: Restart Dev Server

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### Fix 4: Check for TypeScript Errors

```bash
npm run lint
```

If there are errors, they need to be fixed.

## Step-by-Step Debugging

### Step 1: Check Terminal

Look at the terminal where `npm run dev` is running:

```
✅ Good: VITE ready in XXXms
❌ Bad: Error messages or warnings
```

### Step 2: Check Browser Console

1. Open http://localhost:3001 (or whatever port shown)
2. Press F12
3. Look at Console tab
4. Look for errors (red text)

### Step 3: Check Network Tab

1. In DevTools, go to Network tab
2. Refresh the page
3. Look for failed requests (red)
4. Check if Supabase requests are failing

### Step 4: Test Without Supabase

Temporarily disable Supabase by commenting out the connection:

In `src/supabase.ts`:
```typescript
// Temporarily disable for testing
export const supabase = {
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
  }),
  removeChannel: () => {},
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
} as any;
```

If the page loads after this, the issue is definitely Supabase connection.

## Specific Error Solutions

### Error: "Failed to fetch"

**Cause:** Can't connect to Supabase

**Solution:**
1. Check internet connection
2. Verify Supabase URL is correct
3. Check if Supabase project is active

### Error: "Invalid API key"

**Cause:** Wrong Supabase anon key

**Solution:**
1. Go to Supabase Dashboard → Settings → API
2. Copy the correct anon/public key
3. Update `.env` file
4. Restart dev server

### Error: "Table does not exist"

**Cause:** Database tables not created

**Solution:**
1. Run SQL migration in Supabase Dashboard
2. Copy `supabase-schema.sql`
3. Paste in SQL Editor
4. Click Run

### White Screen, No Errors

**Cause:** CSS not loading or React not mounting

**Solution:**
1. Check if `index.html` exists
2. Check if `src/main.tsx` exists
3. Clear browser cache
4. Try different browser

## Testing Checklist

- [ ] Terminal shows "VITE ready"
- [ ] No red errors in terminal
- [ ] Browser console has no errors
- [ ] Network tab shows successful requests
- [ ] Correct port (check terminal output)
- [ ] `.env` file exists and has values
- [ ] Internet connection working
- [ ] Browser cache cleared

## Still Not Working?

### Option 1: Use Placeholder Supabase

Update `.env`:
```env
VITE_SUPABASE_URL=https://placeholder-domain.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-key
```

The app will use fallback data (local images/videos).

### Option 2: Check Specific Components

Test if specific components are causing issues:

1. Comment out components in `src/pages/Home.tsx` one by one
2. See which component causes the blank page
3. Fix that specific component

### Option 3: Fresh Start

```bash
# Stop server
# Clear node modules
rm -rf node_modules
rm -rf dist

# Reinstall
npm install

# Restart
npm run dev
```

## Getting Help

When asking for help, provide:

1. **Terminal output** (copy the full output)
2. **Browser console errors** (screenshot or copy)
3. **Network tab** (screenshot of failed requests)
4. **Your `.env` file** (WITHOUT the actual keys!)
5. **Browser and OS** (e.g., Chrome on Windows)

## Quick Reference

```bash
# Check for errors
npm run lint

# Restart server
npm run dev

# Clear and rebuild
rm -rf node_modules dist
npm install
npm run dev

# Check Supabase connection
# Open browser console and look for errors
```

---

**Most Common Fix:** Update `.env` with valid Supabase credentials from your Supabase Dashboard.

**Quick Test:** Open http://localhost:3001 (check terminal for actual port) and press F12 to see console errors.
