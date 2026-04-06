# Production vs Local Development - Webhook Setup

## Your Current Setup

**Production URL**: `https://monowave-one.vercel.app/`
**Local URL**: `http://localhost:3000`

**Current Webhook Secret in `.env.local`**: 
```
STRIPE_WEBHOOK_SECRET=whsec_66faa3b9f0b3dfefe095dfbd22cb16b3e4c915891446faf33d0cec1420150250
```

This secret is likely from your **production webhook** configured in Stripe Dashboard.

## The Problem

You're trying to test locally with a production webhook secret. This doesn't work because:

1. **Production webhook** in Stripe Dashboard points to: `https://monowave-one.vercel.app/api/webhooks/stripe`
2. **Your local server** runs on: `http://localhost:3000/api/webhooks/stripe`
3. When you test locally, Stripe sends webhooks to production URL, not localhost

## The Solution: Two Separate Webhook Configurations

### Production (Vercel) - Already Working ✅

**Stripe Dashboard Webhook**:
- URL: `https://monowave-one.vercel.app/api/webhooks/stripe`
- Secret: `whsec_66faa3b9f0b3dfefe095dfbd22cb16b3e4c915891446faf33d0cec1420150250`
- Status: ✅ Working (webhooks reach Vercel)

**Vercel Environment Variable**:
```
STRIPE_WEBHOOK_SECRET=whsec_66faa3b9f0b3dfefe095dfbd22cb16b3e4c915891446faf33d0cec1420150250
```

### Local Development - Needs Stripe CLI ❌

**For local testing, you need Stripe CLI**:

```bash
# Terminal 1: Start Stripe CLI forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# This outputs a NEW secret like:
# > Ready! Your webhook signing secret is whsec_LOCAL_SECRET_HERE
```

**Update `.env.local` with the LOCAL secret**:
```bash
# .env.local (for local development only)
STRIPE_WEBHOOK_SECRET=whsec_LOCAL_SECRET_FROM_STRIPE_CLI
```

**Restart dev server**:
```bash
npm run dev
```

## Why You Need Two Secrets

| Environment | Webhook Destination | Secret Source | Secret Location |
|-------------|-------------------|---------------|-----------------|
| **Production** | Vercel URL | Stripe Dashboard | Vercel Env Vars |
| **Local Dev** | localhost via CLI | Stripe CLI | `.env.local` |

## Step-by-Step: Fix Local Development

### 1. Check Your Production Webhook (Optional)

Go to: https://dashboard.stripe.com/test/webhooks

You should see a webhook endpoint like:
- URL: `https://monowave-one.vercel.app/api/webhooks/stripe`
- Secret: `whsec_66faa...` (matches your current secret)
- Status: Active

**Don't change this!** It's for production.

### 2. Set Up Local Development

**Install Stripe CLI** (if not installed):
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

**Login**:
```bash
stripe login
```

**Start forwarding** (keep this terminal open):
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Output will show:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (for local testing only)
```

**Copy that secret and update `.env.local`**:
```bash
# Replace the production secret with the local one
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Restart your dev server**:
```bash
npm run dev
```

### 3. Test Locally

Now when you test checkout locally:
1. Stripe sends webhook to Stripe CLI
2. Stripe CLI forwards to localhost:3000
3. Order gets created
4. Confirmation page works! ✅

## Important Notes

### Don't Mix Secrets

- ❌ **Don't use production secret for local dev** (webhooks won't arrive)
- ❌ **Don't use local secret for production** (webhooks will fail)
- ✅ **Use production secret in Vercel** (already set up)
- ✅ **Use Stripe CLI secret locally** (need to set up)

### `.env.local` vs Vercel Environment Variables

Your `.env.local` file is ONLY for local development. It doesn't affect production.

**Local** (`.env.local`):
```bash
STRIPE_WEBHOOK_SECRET=whsec_LOCAL_FROM_STRIPE_CLI
```

**Production** (Vercel Dashboard → Settings → Environment Variables):
```bash
STRIPE_WEBHOOK_SECRET=whsec_66faa3b9f0b3dfefe095dfbd22cb16b3e4c915891446faf33d0cec1420150250
```

### When to Use Each

**Use Stripe CLI** when:
- Developing locally
- Testing checkout flow on localhost
- Debugging webhook issues

**Use Stripe Dashboard webhook** when:
- Deploying to production
- Testing on Vercel preview deployments
- Running on any public URL

## Quick Test Without Stripe CLI

If you want to test the confirmation page UI without setting up Stripe CLI:

```bash
# Create a test order
curl -X POST http://localhost:3000/api/orders/test-create \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "cs_test_YOUR_SESSION_ID"}'

# Then visit the confirmation page
```

**Remember**: Delete `app/api/orders/test-create/route.ts` before deploying to production!

## Summary

Your production setup is fine. The webhook secret you have works for production (Vercel). For local development, you need a separate secret from Stripe CLI because Stripe can't send webhooks directly to localhost.

Think of it like having two phone numbers:
- **Production**: Public phone number (Vercel URL) - anyone can call
- **Local**: Home phone (localhost) - needs a forwarding service (Stripe CLI)
