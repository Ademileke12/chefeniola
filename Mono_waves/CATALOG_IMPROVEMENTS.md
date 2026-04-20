# Gelato Catalog Improvements

## Issue
The catalog was only showing 7 products with size/color variations because the filtering was too strict and the catalog fetching approach was unreliable.

## Root Cause
The `getExpandedProductCatalog()` function was attempting to fetch from 28 different catalog names (like 'hats', 'caps', 'beanies', 'bags', 'tote-bags', 'backpacks', 'mugs', 'cups', 'drinkware', 'home-living', 'posters', 'prints', 'canvas', 'wall-art', 'phone-cases', 'tech-accessories', 'stickers', 'decals', 'labels', etc.), but most of these catalog names don't exist in Gelato's API, causing the requests to fail.

## Solution Implemented

### 1. Changed Catalog Fetching Strategy
Instead of trying to fetch from 28 specific catalogs (most of which don't exist), we now:

1. **Primary approach**: Use the general `/v3/products:search` endpoint with a limit of 500 products
   - This fetches all available products in one request
   - More reliable and efficient

2. **Fallback approach**: If the general search fails, fall back to only the most common catalogs that are likely to exist:
   - `apparel`
   - `t-shirts`
   - `hoodies`
   - `sweatshirts`

### 2. Kept Minimal Filtering
The filtering remains minimal - we only exclude:
- Gift cards and vouchers
- Sample packs and test products
- Discontinued and legacy items

This ensures we get the maximum number of real products while excluding only truly irrelevant items.

### 3. Deduplication
Products are deduplicated by their `productUid` to ensure we only show unique products.

## Expected Results

With these changes, you should see:
- **Many more products** in the catalog (potentially 100-500 depending on what Gelato returns)
- **Faster catalog loading** (fewer API requests)
- **More reliable fetching** (using endpoints that actually exist)
- **Better error handling** (graceful fallback if primary approach fails)

## Testing

To test the changes:

1. Navigate to the admin catalog page: `/admin/products/catalog`
2. Click "Refresh Catalog" to fetch fresh data from Gelato
3. You should see significantly more products than before
4. Each product should have size and color variations based on its type

## Notes

- The catalog uses 24-hour caching, so after the first fetch, subsequent requests will be served from cache
- Use the "Refresh Catalog" button to force a fresh fetch from Gelato
- In TEST_MODE (when `GELATO_TEST_MODE=true`), mock products are returned instead of real API calls
- The `catalogService.ts` handles transformation of raw Gelato products into our format with default sizes/colors based on product type

## Files Modified

- `lib/services/gelatoService.ts` - Updated `getExpandedProductCatalog()` function
- `CATALOG_IMPROVEMENTS.md` - This documentation file
