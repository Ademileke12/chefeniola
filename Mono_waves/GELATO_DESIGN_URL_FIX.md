# Gelato Design URL Missing - Root Cause & Fix

## Problem
Orders are failing Gelato submission with error: "Missing design URL"

## Root Cause Analysis

### Issue 1: Products Don't Have Design URLs
When checking the database, products have `design_url: null`. This is because:
- Products are created from the Gelato catalog without design URLs
- Design URLs should be set when products are created/edited in the admin panel
- The `design_url` column exists in the products table but is not being populated

### Issue 2: Cart Items Don't Store Design URLs
The `CartItem` type doesn't include `designUrl` or `gelatoProductUid` fields, so even if products had design URLs, they wouldn't be passed through the cart to the order.

### Issue 3: Stripe Metadata Doesn't Include Design URLs
When creating a Stripe checkout session, the cart items are compressed to fit in metadata (500 char limit per field), and `designUrl` and `gelatoProductUid` are not included.

## Current Flow
```
1. Product created from Gelato catalog → design_url = null
2. User adds product to cart → CartItem has no designUrl field
3. Checkout creates Stripe session → metadata doesn't include designUrl
4. Webhook receives payment → tries to fetch design_url from products table
5. design_url is null → Gelato submission fails
```

## Solution

### Option 1: Store Design URLs in Products Table (Recommended)
This is the proper solution for a production e-commerce site where products have pre-designed templates.

**Steps:**
1. Update products in database to have design URLs
2. Ensure new products are created with design URLs
3. Webhook will fetch design URLs from products table

**Implementation:**
```sql
-- Update existing products with design URLs
UPDATE products 
SET design_url = mockup_urls[1] 
WHERE design_url IS NULL AND mockup_urls IS NOT NULL AND array_length(mockup_urls, 1) > 0;

-- For products without mockup URLs, set a placeholder
UPDATE products 
SET design_url = 'https://placeholder-design-url.com/default-design.png'
WHERE design_url IS NULL;
```

### Option 2: Pass Design URLs Through Cart (For Custom Designs)
This solution is needed if users upload custom designs for each order.

**Steps:**
1. Add `designUrl` and `gelatoProductUid` to `CartItem` type ✅ (Already done)
2. Update cart service to store these fields
3. Update Stripe metadata to include design URLs (if space allows)
4. Update webhook to use design URLs from cart items

### Option 3: Hybrid Approach (Best for Flexibility)
Use product design URLs as defaults, but allow cart items to override with custom designs.

**Implementation:**
- Products have default design URLs
- Cart items can optionally include custom design URLs
- Webhook uses cart design URL if available, otherwise falls back to product design URL ✅ (Already implemented)

## Immediate Fix

### Step 1: Update Existing Products with Design URLs

Run this script to update products:

```typescript
// scripts/fix-product-design-urls.ts
import { supabaseAdmin } from '../lib/supabase/server'

async function fixProductDesignUrls() {
  console.log('Fixing product design URLs...')
  
  // Get all products without design URLs
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, mockup_urls, gelato_product_uid')
    .is('design_url', null)
  
  if (error) {
    console.error('Error fetching products:', error)
    return
  }
  
  console.log(`Found ${products?.length || 0} products without design URLs`)
  
  for (const product of products || []) {
    let designUrl: string | null = null
    
    // Try to use first mockup URL as design URL
    if (product.mockup_urls && product.mockup_urls.length > 0) {
      designUrl = product.mockup_urls[0]
    } else {
      // Use a placeholder design URL
      // In production, you'd want to generate actual design files
      designUrl = `https://via.placeholder.com/800x1000.png?text=${encodeURIComponent(product.name)}`
    }
    
    // Update product
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ design_url: designUrl })
      .eq('id', product.id)
    
    if (updateError) {
      console.error(`Error updating product ${product.id}:`, updateError)
    } else {
      console.log(`✅ Updated ${product.name} with design URL: ${designUrl}`)
    }
  }
  
  console.log('Done!')
}

fixProductDesignUrls()
```

### Step 2: Ensure New Products Have Design URLs

When creating products in the admin panel, ensure the `design_url` field is populated:

```typescript
// In product creation form
const productData = {
  name: formData.name,
  description: formData.description,
  price: formData.price,
  gelato_product_uid: formData.gelatoProductUid,
  design_url: formData.designUrl || mockupUrls[0], // Use first mockup as default
  mockup_urls: mockupUrls,
  // ... other fields
}
```

### Step 3: Update Existing Orders (Manual Retry)

For orders that already failed, you can manually retry Gelato submission after fixing the products:

1. Go to admin panel → Orders
2. Find the failed order
3. Click "Retry Gelato Submission" button (if available)
4. Or use the API: `POST /api/admin/orders/{orderId}/retry-gelato`

## Testing

After implementing the fix:

1. Create a test order with the fixed products
2. Verify the order items have design URLs
3. Check that Gelato submission succeeds
4. Monitor the admin panel for any validation errors

## Prevention

To prevent this issue in the future:

1. **Validation**: Add validation in product creation to require design URLs
2. **Default Values**: Set default design URLs for products imported from Gelato catalog
3. **Monitoring**: Add alerts for orders with missing design URLs
4. **Documentation**: Document the requirement for design URLs in product creation workflow

## Related Files

- `types/cart.ts` - CartItem type definition ✅ Updated
- `lib/services/stripeService.ts` - Stripe metadata handling
- `app/api/webhooks/stripe/route.ts` - Webhook handler ✅ Updated
- `lib/services/orderService.ts` - Order validation
- `app/admin/products/new/page.tsx` - Product creation form

## Status

- ✅ CartItem type updated to include designUrl and gelatoProductUid
- ✅ Webhook updated to use cart design URL with fallback to product design URL
- ⏳ Need to update existing products with design URLs
- ⏳ Need to update product creation form to require design URLs
- ⏳ Need to test with real orders

## Next Steps

1. Run the fix script to update existing products
2. Test order creation with updated products
3. Implement design URL requirement in product creation form
4. Add validation to prevent products without design URLs
