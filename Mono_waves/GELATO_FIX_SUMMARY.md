# Gelato Order Submission Fix - Summary

## Issue
Orders were failing Gelato submission with errors:
- "Missing design URL"
- Empty size and color fields

## Root Causes Identified

### 1. Design URLs Not in Stripe Metadata
- Cart items had `designUrl` and `gelatoProductUid` fields
- But these weren't being stored in Stripe checkout session metadata
- Webhook couldn't retrieve them when creating orders

### 2. Size and Color Not in Stripe Metadata
- Frontend correctly captured size/color when adding to cart
- But Stripe metadata only stored `pid`, `qty`, `prc`
- Size and color were lost during checkout

### 3. Database Fallback Issues
- Products had `design_url` in `design_file_url` column, not `design_url` column
- Webhook was fetching from wrong column

## Fixes Implemented

### ✅ Fix 1: Store All Required Fields in Stripe Metadata
**File**: `lib/services/stripeService.ts`

Added to cart items metadata:
- `sz` (size)
- `cl` (color)
- `du` (design URL)
- `gpu` (gelato product UID)
- `pn` (product name)

### ✅ Fix 2: Extract All Fields from Metadata
**File**: `lib/services/stripeService.ts` - `handlePaymentSuccess()`

Updated to extract:
- Size from `item.sz`
- Color from `item.cl`
- Design URL from `item.du`
- Gelato product UID from `item.gpu`

### ✅ Fix 3: Metadata-First Approach in Webhook
**File**: `app/api/webhooks/stripe/route.ts`

Changed order item creation to:
1. Try to use data from Stripe metadata first
2. Only fetch from database if metadata is missing
3. Use metadata values as primary source of truth

### ✅ Fix 4: Fixed Existing Orders
**Script**: `scripts/fix-order-size-color.ts`

Updated 2 existing orders with size/color from product variants.

### ✅ Fix 5: Fixed Product Design URLs
**Script**: `scripts/fix-design-urls-from-storage.ts`

Copied design URLs from `design_file_url` to `design_url` column for all products.

## Current Status

### ✅ Working
- Design URLs are captured and stored correctly
- Size and color are captured from frontend
- Size and color pass through Stripe metadata
- Orders are created with all required fields
- Existing orders have been updated

### ⚠️ Remaining Issue: Variant UID Mapping

**Problem**: Orders use base Gelato product UID instead of variant-specific UID.

**Example**:
```
Current:  t_shirt_triblend_unisex_crewneck_t_shirt
Needed:   apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_triblend_gsi_l_gco_triblend-athletic-gray_gpr_4-4
```

The variant UID encodes size (`gsi_l`) and color (`gco_triblend-athletic-gray`).

**Solution Needed**:
1. When adding to cart, look up the matching variant from product's `variants` array
2. Use the variant's `variantId` as the `gelatoProductUid`
3. This ensures Gelato receives the correct variant-specific UID

**Implementation Location**: `components/storefront/ProductDetailPage.tsx`

```typescript
// In handleAddToCart function
const selectedVariant = product.variants?.find(
  v => v.size === selectedSize && v.color === selectedColor
)

await addToCart({
  productId: product.id,
  productName: product.name,
  price: product.price,
  quantity: quantity,
  size: selectedSize,
  color: selectedColor,
  imageUrl: getProductImages()[0],
  gelatoProductUid: selectedVariant?.variantId || product.gelatoProductUid, // Use variant ID
  designUrl: product.designFileUrl || product.designUrl,
})
```

## Verification Steps

1. **Check orders have all fields**:
   ```bash
   npx tsx scripts/diagnose-gelato-submission-error.ts
   ```

2. **Check product variants**:
   ```bash
   npx tsx scripts/check-product-variants.ts
   ```

3. **Test new order flow**:
   - Add product to cart with specific size/color
   - Complete checkout
   - Verify order has correct size, color, design URL, and variant UID

## Files Modified

1. `lib/services/stripeService.ts` - Metadata storage and extraction
2. `app/api/webhooks/stripe/route.ts` - Order creation from metadata
3. `scripts/fix-order-size-color.ts` - Fix existing orders
4. `scripts/fix-design-urls-from-storage.ts` - Fix product design URLs
5. `scripts/check-product-variants.ts` - Inspect product variants
6. `types/cart.ts` - Already had designUrl and gelatoProductUid fields

## Next Action Required

Implement variant UID mapping in the frontend when adding items to cart. This will ensure that the correct Gelato variant UID is used for order submission.

**Priority**: HIGH - Without this, Gelato submissions may still fail or create orders with wrong variants.
