# Gelato Product Link Implementation

## Overview
Adding clickable links to Gelato product pages in the admin product creation workflow, allowing admins to view product images and specifications directly from Gelato's website.

## Implementation Plan

### 1. Add `gelatoUrl` to Product Types
- Update `types/product.ts` to include `gelatoUrl` field
- Generate URL format: `https://www.gelato.com/products/{product-slug}`

### 2. Generate Gelato URLs in Service
- Update `lib/services/gelatoService.ts` to generate URLs from product UIDs
- Format: Convert UID like `gildan_18000_00` to slug `gildan-18000`

### 3. Update Product Form Component
- Add "View on Gelato" link in `components/admin/ProductForm.tsx`
- Display in Product Details section with external link icon
- Open in new tab with `target="_blank"` and `rel="noopener noreferrer"`

### 4. Benefits for Admin
- Quick access to product images
- View detailed specifications
- Reference product mockups
- Verify product availability

## Files to Modify
1. `types/product.ts` - Add gelatoUrl field
2. `lib/services/gelatoService.ts` - Generate URLs
3. `components/admin/ProductForm.tsx` - Display link
4. `lib/services/catalogService.ts` - Pass through URL

## URL Format
```
Product UID: gildan_18000_00
Gelato URL: https://www.gelato.com/products/gildan-18000
```

## Implementation Status
- [ ] Update product types
- [ ] Generate URLs in service
- [ ] Display link in UI
- [ ] Test with real products
