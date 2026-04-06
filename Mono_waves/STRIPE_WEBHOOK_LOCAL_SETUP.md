# Stripe Webhook Local Development Setup

## Problem Identified

After purchasing with Stripe session ID `cs_test_b1CTYbGE5bN8BjF1BbUWAOKqZna1gtNHrHIq5pyoiPyVfX7OSWt9EstiHQ`:

- ❌ No webhook logs found in database
- ❌ No order created with this session ID
- ❌ Confirmation page shows "Order not found"

**Root Cause**: Stripe webhooks cannot reach `localhost:3000` directly. Stripe needs a publicly accessible URL to send webhook events.

## Solution: Use Stripe CLI for Local Development

The Stripe CLI can forward webhook events from Stripe to your local development server.

### Step 1: Install Stripe CLI

**macOS (Homebrew)**:
```bash
brew install stripe/stripe-cli/stripe
```

**Linux**:
```bash
# Download and install
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

**Windows**:
Download from: https://github.com/stripe/stripe-cli/releases

### Step 2: Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate with your Stripe account.

### Step 3: Forward Webhooks to Local Server

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Important**: This command will output a webhook signing secret that looks like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

### Step 4: Update Your .env.local

Copy the webhook signing secret from Step 3 and update your `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # Use the secret from stripe listen
```

### Step 5: Restart Your Development Server

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 6: Test the Complete Flow

1. Keep the `stripe listen` command running in one terminal
2. Keep your dev server running in another terminal
3. Go to http://localhost:3000
4. Add a product to cart
5. Go to checkout
6. Use Stripe test card: `4242 4242 4242 4242`
7. Complete the payment

You should see:
- Webhook events in the `stripe listen` terminal
- Order created in database
- Confirmation page showing order details

## Stripe Test Cards

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requires Authentication**: 4000 0025 0000 3155

Use any future expiry date, any 3-digit CVC, and any ZIP code.

## Troubleshooting

### Webhook Not Received

Check that:
1. `stripe listen` is running
2. The webhook secret in `.env.local` matches the one from `stripe listen`
3. Your dev server is running on port 3000
4. The webhook endpoint is `/api/webhooks/stripe`

### Order Still Not Found

1. Check the `stripe listen` terminal for errors
2. Check your dev server logs for errors
3. Run the debug script:
   ```bash
   export NEXT_PUBLIC_SUPABASE_URL="your_url"
   export SUPABASE_SERVICE_ROLE_KEY="your_key"
   npx tsx scripts/check-order-debug.ts
   ```

### Database Connection Issues

Make sure your Supabase credentials are correct in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Production Deployment

For production, you'll need to:

1. Set up a webhook endpoint in Stripe Dashboard
2. Point it to your production URL: `https://yourdomain.com/api/webhooks/stripe`
3. Copy the webhook signing secret from Stripe Dashboard
4. Add it to your production environment variables

## Current Status

- ✅ Webhook endpoint implemented: `/api/webhooks/stripe`
- ✅ Order creation logic working
- ✅ Confirmation page UI updated
- ❌ **Webhooks not reaching local server** (needs Stripe CLI)

## Next Steps

1. Install and run Stripe CLI with `stripe listen`
2. Update `STRIPE_WEBHOOK_SECRET` in `.env.local`
3. Restart dev server
4. Test complete checkout flow
