# Gelato Catalog Fix - Real Data Pull

## Problem
The Gelato API was only returning 100 products by default, limiting the catalog available for the admin dashboard.

## Root Cause
The `/v3/products` endpoint without parameters returns only 100 products. The Gelato API supports a `limit` query parameter to fetch more products.

## Solution Applied
Updated `lib/services/gelatoService.ts` in the `getExpandedProductCatalog()` function to use `limit=500`:

```typescript
const productsResponse = await gelatoFetch<{ products: GelatoProductDetails[] }>(
  GELATO_PRODUCT_API_BASE_URL,
  '/v3/products?limit=500',  // ← Added limit parameter
  {
    method: 'GET'
  }
)
```

## Results
- **Before**: 100 products
- **After**: 500 products (maximum supported by Gelato API)

### Product Distribution (with limit=500)
- **Apparel**: 305 products
  - Hoodies: 230 variants
  - T-Shirts: 28 variants
  - Sweatshirts: 46 variants
  - Onesies: 82 variants
  - Polo: 1 variant

- **Non-Apparel**: 84 products
  - Wall Art: 30 variants
  - Cards: 27 variants
  - Posters: 11 variants
  - Canvas: 8 variants
  - Stickers: 8 variants
  - Business Cards: 3 variants
  - Phone Cases: 1 variant
  - And more...

- **Total Unique Product Types**: 23
- **Total Unique Product Names**: 47

## Configuration
Ensure your `.env.local` has:
```bash
GELATO_TEST_MODE=false  # Set to false to pull real data
GELATO_API_KEY=your-api-key-here
```

## Testing
The catalog endpoint `/api/gelato/catalog` now returns 500 products from Gelato's real catalog.

To test:
1. Navigate to the admin dashboard
2. Go to Products → Import from Catalog
3. You should see 500 products available

## API Limits Discovered
- `limit=100`: Returns 100 products (default)
- `limit=200`: Returns 200 products
- `limit=300`: Returns 300 products
- `limit=500`: Returns 500 products ✓ (maximum)
- `limit=600+`: Returns 0 products (exceeds limit)

## Files Modified
- `lib/services/gelatoService.ts` - Added `?limit=500` to API endpoint

## Status
✅ **FIXED** - Catalog now pulls 500 real products from Gelato API
