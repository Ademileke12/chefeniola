# Route Structure - Order Fulfillment

## Correct Routes

The order fulfillment pages are located in the storefront layout group:

### 1. Order Confirmation Page
- **URL**: `/confirmation?session_id={CHECKOUT_SESSION_ID}`
- **File**: `app/(storefront)/confirmation/page.tsx`
- **Purpose**: Display order details after successful Stripe payment
- **Redirect**: Stripe redirects here after payment completion

### 2. Order Tracking Page
- **URL**: `/track`
- **File**: `app/(storefront)/track/page.tsx`
- **Purpose**: Allow customers to track their orders by entering email and order number
- **Component**: Uses `components/storefront/TrackOrderPage.tsx`

## Why These Routes?

The pages are in the `(storefront)` layout group, which means:
- They inherit the storefront layout (header, footer, etc.)
- The route group `(storefront)` is not included in the URL path
- So `app/(storefront)/confirmation/page.tsx` → `/confirmation`
- And `app/(storefront)/track/page.tsx` → `/track`

## Stripe Configuration

The checkout API sets the success URL to:
```typescript
successUrl: `${appUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}`
```

This is configured in `app/api/checkout/route.ts`.

## Testing

1. **Test Confirmation Page**:
   ```
   http://localhost:3000/confirmation?session_id=test
   ```
   Should show "Order not found" (not a 404)

2. **Test Tracking Page**:
   ```
   http://localhost:3000/track
   ```
   Should show the tracking form

3. **Test Full Flow**:
   - Add items to cart
   - Go to checkout
   - Complete Stripe payment
   - Should redirect to `/confirmation?session_id=cs_test_...`
   - Should see order details

## Common Mistakes

❌ **Wrong**: `/order/confirmation` or `/order/track`
✅ **Correct**: `/confirmation` and `/track`

The `/order/` prefix is NOT part of the route structure.
