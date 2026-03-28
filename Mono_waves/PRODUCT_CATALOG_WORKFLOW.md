# Product Catalog Workflow

## Overview

The new streamlined product import workflow allows admins to browse Gelato's clothing catalog, select products, customize pricing, and publish them to the storefront with minimal friction.

## Workflow Steps

### 1. Browse Catalog (`/admin/products/catalog`)

**Features:**
- Displays filtered Gelato products (Men's, Women's, Kids & Baby clothing only)
- Real-time product images from Gelato API
- Category filters (Men's, Women's, Kids & Baby)
- Search functionality
- Multi-select capability for bulk import
- Quick import button for individual products

**Categories Shown:**
- Men's clothing (t-shirts, hoodies, sweatshirts, etc.)
- Women's clothing (t-shirts, tank tops, hoodies, etc.)
- Kids & baby clothing (onesies, youth shirts, etc.)

### 2. Quick Import (`/admin/products/import`)

**Features:**
- Auto-populated product details from Gelato:
  - Product name
  - Description
  - Gelato product UID
  - Base cost from Gelato
  
- **Editable Pricing:**
  - Base cost (read-only, from Gelato)
  - Selling price (fully editable)
  - Real-time profit calculation
  - Markup percentage display
  - Quick markup buttons (+50%, +100%, +150%, +200%)

- **Publishing Options:**
  - Publish immediately (visible on storefront)
  - Save as draft (customize design later)

**Example:**
- Base cost: $20.00 (from Gelato)
- Your price: $40.00 (editable)
- Your profit: $20.00 (100% markup)

### 3. Manage Products (`/admin/products`)

**Features:**
- View all imported products
- Toggle publish/unpublish status
- Edit product details and pricing
- Delete products
- Search and filter

**Two Ways to Add Products:**
1. **Browse Catalog** - Import from Gelato with custom pricing
2. **Create Custom** - Design from scratch with full editor

### 4. Storefront Display

**Customer Experience:**
- Only published products appear on the storefront
- Customers see your custom pricing (not Gelato base cost)
- Products can be purchased and ordered
- Orders are automatically fulfilled by Gelato

## Key Benefits

### For Admins:
✅ **Fast Product Import** - Browse and import in seconds
✅ **Flexible Pricing** - Set any markup you want
✅ **No Design Required** - Use Gelato's default product images
✅ **Bulk Import** - Select multiple products at once
✅ **Draft Mode** - Import now, customize later

### For Customers:
✅ **Professional Products** - High-quality Gelato merchandise
✅ **Wide Selection** - Access to full clothing catalog
✅ **Reliable Fulfillment** - Gelato handles production and shipping

## Technical Details

### API Endpoints

**Get Catalog:**
```
GET /api/gelato/catalog
```
Returns filtered clothing products from Gelato

**Import Product:**
```
POST /api/products
Body: {
  name: string
  description: string
  price: number (your selling price)
  gelato_product_uid: string
  published: boolean
  design_data: object
}
```

**Toggle Publish:**
```
POST /api/products/[id]/publish
POST /api/products/[id]/unpublish
```

### Data Flow

```
1. Admin browses catalog
   ↓
2. Selects products
   ↓
3. Customizes pricing
   ↓
4. Imports to database
   ↓
5. Publishes to storefront
   ↓
6. Customer purchases
   ↓
7. Order sent to Gelato
   ↓
8. Gelato fulfills order
```

### Pricing Model

```
Customer pays: $40.00
  ↓
Your revenue: $40.00
  ↓
Gelato cost: -$20.00
  ↓
Your profit: $20.00 (50% margin)
```

## Configuration

### Environment Variables Required:
```
GELATO_API_KEY=your_api_key_here
```

### Gelato API Access:
- Product API: `https://product.gelatoapis.com`
- Order API: `https://order.gelatoapis.com`

## Future Enhancements

### Planned Features:
- [ ] Product variant management (sizes, colors)
- [ ] Bulk pricing updates
- [ ] Automated price rules (e.g., always 100% markup)
- [ ] Product collections/categories
- [ ] Inventory sync with Gelato
- [ ] Sales analytics per product
- [ ] Customer reviews and ratings
- [ ] Related products suggestions

### Design Customization:
- Import products as drafts
- Use design editor to add custom graphics
- Upload custom designs
- Add text overlays
- Publish when ready

## Support

For issues or questions:
1. Check Gelato API documentation
2. Review error logs in browser console
3. Verify API key configuration
4. Test with sample products first

## Best Practices

### Pricing Strategy:
- Research competitor pricing
- Consider your target market
- Factor in marketing costs
- Test different price points
- Monitor conversion rates

### Product Selection:
- Start with popular items
- Test different categories
- Monitor sales data
- Remove low performers
- Add seasonal products

### Publishing Workflow:
- Import as drafts first
- Review product details
- Set competitive pricing
- Test checkout process
- Publish in batches
