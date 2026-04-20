# Checkout 502 Error Fix

## Problem
Users were experiencing a 502 Bad Gateway error when attempting to checkout:
```
Failed to load resource: the server responded with a status of 502 (Bad Gateway)
Checkout failed: Error: Payment service error
```

## Root Cause
The Stripe service was using an invalid API version: `'2024-12-18.acacia'`

This caused Stripe API calls to fail, resulting in the 502 error being returned from the checkout endpoint.

## Solution
Fixed the Stripe API version in `lib/services/stripeService.ts`:

**Before:**
```typescript
return new Stripe(secretKey, {
  apiVersion: '2024-12-18.acacia' as any,
  typescript: true,
})
```

**After:**
```typescript
return new Stripe(secretKey, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})
```

## Files Modified
1. `lib/services/stripeService.ts` - Fixed Stripe API version
2. `tsconfig.json` - Excluded scripts directory from TypeScript compilation
3. `scripts/test-stripe-connection.ts` - Created diagnostic script to test Stripe connection

## Verification
- ✅ Stripe connection test passes
- ✅ Checkout session creation works
- ✅ Production build completes successfully
- ✅ No TypeScript errors

## Testing
Run the Stripe connection test:
```bash
npx tsx scripts/test-stripe-connection.ts
```

Expected output:
```
✅ Successfully connected to Stripe
✅ Successfully created test checkout session
✅ All Stripe tests passed!
```

## Next Steps
1. Restart the development server
2. Test the checkout flow in the browser
3. Verify that checkout redirects to Stripe successfully

The 502 error should now be resolved and checkout should work properly.
