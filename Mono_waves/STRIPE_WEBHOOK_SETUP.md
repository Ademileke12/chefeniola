# Stripe Webhook Setup Guide

## ✅ Stripe CLI Installed
The Stripe CLI has been successfully installed on your system.

## Step 1: Login to Stripe

Run this command in your terminal:
```bash
stripe login
```

This will:
1. Open your browser
2. Ask you to log in to your Stripe account
3. Grant access to the CLI

## Step 2: Start the Webhook Listener

Your Next.js server is running on **port 3001**, so run:
```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

This command will:
- Start listening for Stripe webhook events
- Forward them to your local server
- Display a **webhook signing secret** (starts with `whsec_...`)

## Step 3: Update Your Environment Variables

1. Copy the webhook signing secret from the terminal output
2. Open `.env.local`
3. Replace this line:
   ```
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```
   With:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
   ```
4. Save the file
5. Restart your Next.js dev server (Ctrl+C and `npm run dev`)

## Step 4: Test the Webhook

In a new terminal, trigger a test event:
```bash
stripe trigger checkout.session.completed
```

You should see:
- The event in the `stripe listen` terminal
- Logs in your Next.js server terminal
- A new order created in your database

## Common Test Events

```bash
# Test successful payment
stripe trigger checkout.session.completed

# Test failed payment
stripe trigger payment_intent.payment_failed

# Test charge succeeded
stripe trigger charge.succeeded
```

## Troubleshooting

### "Ready for new requests" not showing
- Make sure your Next.js server is running on port 3001
- Check that the webhook endpoint exists at `/api/webhooks/stripe`

### Webhook signature verification failed
- Make sure you copied the correct `whsec_...` secret
- Restart your Next.js server after updating `.env.local`

### Events not being received
- Check that `stripe listen` is still running
- Verify the forward URL matches your server port

## Production Setup

For production, you'll need to:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `payment_intent.payment_failed`
4. Copy the signing secret
5. Add it to your production environment variables

## Current Configuration

- **Server Port**: 3001
- **Webhook Endpoint**: `/api/webhooks/stripe`
- **Events Handled**:
  - `checkout.session.completed` - Creates order and submits to Gelato
  - `payment_intent.payment_failed` - Logs failed payment

## Next Steps

1. Run `stripe login` in your terminal
2. Run `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
3. Copy the webhook secret to `.env.local`
4. Test with `stripe trigger checkout.session.completed`
