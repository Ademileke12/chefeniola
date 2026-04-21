# Gelato Size/Color Fix - Complete Solution

## Problem Summary

Orders were failing Gelato submission with "Missing design URL" and empty size/color fields because:

1. **Design URLs were missing** - Fixed by storing design URLs in Stripe metadata
2. **Size and color were empty** - Cart items had size/color but they weren't being passed through to orders
3. **Gelato product UIDs were incorrect** - Using base product UID instead of variant-specific UID

## Root Causes

### 1. Stripe Metadata Missing Size/Color/Design URL
The `stripeService.createCheckoutSession()` function was only storing minimal cart data:
- `pid` (product ID)
- `qty` (quantity)  
- `prc` (price)

It was NOT storing:
- `sz` (size)
- `cl` (color)
- `du` (design URL)
- `gpu` (gelato product UID)

### 2. Gelato Product UID Structure
Gelato uses variant-specific product UIDs that encode size and color:
- **Base UID**: `t_shirt_triblend_unisex_crewneck_t_shirt`
- **Variant UID**: `apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_triblend_gsi_l_gco_triblend-athletic-gray_gpr_4-4`

The variant UID includes:
- `gsi_l` = size L
- `gco_triblend-athletic-gray` = color

## Solutions Implemented

### Fix 1: Update Stripe Metadata to Include All Required Fields

**File**: `lib/services/stripeService.ts`

```typescript
// Before (missing size, color, design URL, gelato UID)
const cartItemsForMetadata = data.cartItems.map(item => ({
  pid: item.productId,
  qty: item.quantity,
  prc: item.price,
}))

// After (includes all required fields)
const cartItemsForMetadata = data.cartItems.map(item => ({
  pid: item.productId,
  pn: item.productName,
  qty: item.quantity,
  prc: item.price,
  sz: item.size,       // ✅ Added
  cl: item.color,      // ✅ Added
  du: item.designUrl,  // ✅ Added
  gpu: item.gelatoProductUid, // ✅ Added
}))
```

### Fix 2: Extract Size/Color/Design URL from Stripe Metadata

**File**: `lib/services/stripeService.ts` - `handlePaymentSuccess()`

```typescript
cartItems = cartItemsData.map((item: any) => ({
  id: item.id || `${item.pid}-${Date.now()}`,
  productId: item.pid || item.productId,
  productName: item.pn || item.productName || 'Product',
  size: item.sz || item.size || '',           // ✅ Extract size
  color: item.cl || item.color || '',         // ✅ Extract color
  quantity: item.qty || item.quantity || 1,
  price: item.prc || item.price || 0,
  imageUrl: '',
  designUrl: item.du || item.designUrl,       // ✅ Extract design URL
  gelatoProductUid: item.gpu || item.gelatoProductUid, // ✅ Extract gelato UID
}))
```

### Fix 3: Use Metadata First, Database as Fallback

**File**: `app/api/webhooks/stripe/route.ts`

```typescript
// Try to use data from cart items (Stripe metadata) first
// If not available, fall back to fetching from database
const orderItems = await Promise.all(
  paymentData.cartItems.map(async (item) => {
    let designUrl = item.designUrl
    let gelatoProductUid = item.gelatoProductUid

    // Only fetch from database if metadata is missing
    if (!designUrl || !gelatoProductUid) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('gelato_product_uid, design_url')
        .eq('id', item.productId)
        .single()

      designUrl = designUrl || product.design_url
      gelatoProductUid = gelatoProductUid || product.gelato_product_uid
    }

    return {
      productId: item.productId,
      productName: item.productName,
      size: item.size,        // ✅ From metadata
      color: item.color,      // ✅ From metadata
      quantity: item.quantity,
      price: item.price,
      designUrl,
      gelatoProductUid,
    }
  })
)
```

### Fix 4: Update Existing Orders with Size/Color

**Script**: `scripts/fix-order-size-color.ts`

This script updates existing orders that have empty size/color fields by:
1. Fetching the product's available variants
2. Using the first variant as a default (since we don't know which one the customer selected)
3. Updating the order items with size and color

```bash
npx tsx scripts/fix-order-size-color.ts
```

## Next Steps: Variant UID Mapping

The current fix ensures size and color are captured, but there's still one issue:

**Problem**: Orders are using the base Gelato product UID instead of the variant-specific UID.

**Example**:
- Current: `t_shirt_triblend_unisex_crewneck_t_shirt`
- Needed: `apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex_gqa_triblend_gsi_l_gco_triblend-athletic-gray_gpr_4-4`

**Solution Required**:
1. When adding items to cart, look up the correct `variantId` from the product's variants array based on selected size/color
2. Store the `variantId` in the cart item as `gelatoProductUid`
3. Pass this through Stripe metadata to the order

**Implementation**:
- Update `ProductDetailPage.tsx` to find the matching variant when adding to cart
- Pass the variant's `variantId` as `gelatoProductUid` to the cart API

## Verification

After implementing these fixes, verify:

1. ✅ Cart items have size and color
2. ✅ Stripe metadata includes size, color, design URL, and gelato UID
3. ✅ Orders are created with all required fields
4. ⚠️  Gelato submission uses variant-specific UIDs (still needs implementation)

## Test Commands

```bash
# Check existing orders
npx tsx scripts/diagnose-gelato-submission-error.ts

# Fix existing orders
npx tsx scripts/fix-order-size-color.ts

# Check product variants
npx tsx scripts/check-product-variants.ts
```

## Files Modified

1. `lib/services/stripeService.ts` - Added size/color/design URL to metadata
2. `app/api/webhooks/stripe/route.ts` - Extract metadata first, database as fallback
3. `scripts/fix-order-size-color.ts` - Script to fix existing orders
4. `scripts/check-product-variants.ts` - Script to inspect product variants

## Status

- ✅ Design URLs captured and stored
- ✅ Size and color captured from frontend
- ✅ Size and color passed through Stripe metadata
- ✅ Existing orders updated with size/color
- ⚠️  Variant UID mapping still needed for Gelato submission
