import { NextRequest, NextResponse } from 'next/server'
import { gelatoService } from '@/lib/services/gelatoService'

/**
 * GET /api/gelato/catalog - Get Gelato product catalog (admin)
 * 
 * Fetches the complete product catalog from Gelato API.
 * This endpoint is intended for admin use only to browse available
 * products for creating new items in the store.
 * 
 * Requirements: 1.2, 2.1
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication check
    // const user = await requireAdmin(request)

    console.log('Fetching expanded Gelato product catalog...')

    // Check if API key is configured
    if (!process.env.GELATO_API_KEY) {
      console.error('GELATO_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Gelato API key is not configured. Please set GELATO_API_KEY in your environment variables.' },
        { status: 500 }
      )
    }

    // Fetch expanded product catalog from Gelato (50+ product types)
    const rawProducts = await gelatoService.getExpandedProductCatalog()

    // Debug: Log first few products to see what attributes Gelato provides
    if (rawProducts.length > 0) {
      console.log('Sample Gelato products (first 3):')
      rawProducts.slice(0, 3).forEach((p, i) => {
        console.log(`\nProduct ${i + 1}:`)
        console.log(`  productUid: ${p.productUid}`)
        console.log(`  productNameUid: ${p.productNameUid}`)
        console.log(`  productTypeUid: ${p.productTypeUid}`)
        console.log(`  dimensions:`, JSON.stringify(p.dimensions, null, 2))
      })
    }

    // Transform and group Gelato API response to match our GelatoProduct interface
    const groupedProducts = new Map<string, any>()
    let skippedDeactivated = 0
    let processedCount = 0

    rawProducts.forEach(product => {
      // Extract dimensions into a more usable format
      const dimensionsMap = new Map<string, string>()
      if (product.dimensions && Array.isArray(product.dimensions)) {
        product.dimensions.forEach(dim => {
          dimensionsMap.set(dim.name, dim.value)
        })
      }

      // Get key attributes from dimensions
      const size = dimensionsMap.get('size') || 'One Size'
      const color = dimensionsMap.get('color') || 'default'
      const orientation = dimensionsMap.get('orientation') || ''
      
      // Use productNameUid and productTypeUid for categorization
      const productType = product.productTypeUid || 'product'
      const productName = product.productNameUid || productType
      
      // Create human-readable product name
      const titleParts = productName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1))
      const productTitle = titleParts.join(' ')
      
      // Create a stable base ID for grouping variants
      const baseId = `${productType}_${productName}`
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')

      // Determine main category for filtering
      let mainCategory = 'Products'
      if (productType.includes('t-shirt') || productType.includes('tshirt')) {
        mainCategory = "T-Shirts"
      } else if (productType.includes('hoodie')) {
        mainCategory = "Hoodies"
      } else if (productType.includes('sweatshirt')) {
        mainCategory = "Sweatshirts"
      } else if (productType.includes('poster')) {
        mainCategory = "Posters"
      } else if (productType.includes('canvas')) {
        mainCategory = "Canvas"
      } else if (productType.includes('card')) {
        mainCategory = "Cards"
      } else if (productType.includes('mug')) {
        mainCategory = "Mugs"
      } else if (productType.includes('phone') || productType.includes('device')) {
        mainCategory = "Phone Cases"
      } else if (productType.includes('wall-art')) {
        mainCategory = "Wall Art"
      }

      // Default base price
      let basePrice = 25.00

      // Color formatting
      const colorName = color.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      const colorCode = '#CCCCCC'

      if (!groupedProducts.has(baseId)) {
        const description = `${productTitle} - High-quality print-on-demand product from Gelato`

        groupedProducts.set(baseId, {
          uid: baseId,
          title: productTitle,
          description: description,
          category: mainCategory,
          subcategory: productType,
          brand: '',
          availableSizes: new Set<string>(),
          availableColors: new Map<string, { name: string, code: string }>(),
          basePrice: basePrice,
          imageUrl: `https://placehold.co/400x500/e5e7eb/1f2937?text=${encodeURIComponent(productTitle.substring(0, 20))}`,
          variants: {},
          rawProductUid: product.productUid
        })
      }

      const p = groupedProducts.get(baseId)
      p.availableSizes.add(size)
      if (!p.availableColors.has(colorName)) {
        p.availableColors.set(colorName, { name: colorName, code: colorCode })
      }
      // Store the actual Gelato productUid for this specific variant
      p.variants[`${size}:${colorName}`] = product.productUid
      processedCount++
    })

    // Convert Map back to array and finalize structure
    const products = Array.from(groupedProducts.values()).map(p => ({
      ...p,
      availableSizes: Array.from(p.availableSizes).sort(),
      availableColors: Array.from(p.availableColors.values()),
    }))

    console.log(`\nFiltering summary:`)
    console.log(`  - Raw products from Gelato: ${rawProducts.length}`)
    console.log(`  - Skipped (deactivated): ${skippedDeactivated}`)
    console.log(`  - Processed (activated): ${processedCount}`)
    console.log(`  - Unique products after grouping: ${products.length}`)
    
    // Show distribution of products by category
    const categoryCount = new Map<string, number>()
    products.forEach(p => {
      const cat = p.category || 'Unknown'
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1)
    })
    console.log(`\nProducts by category:`)
    Array.from(categoryCount.entries()).forEach(([cat, count]) => {
      console.log(`  - ${cat}: ${count} products`)
    })
    
    console.log(`\nSuccessfully fetched and transformed ${products.length} products from ${rawProducts.length} raw products`)
    console.log(`Sample transformed products:`)
    products.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.title} (${p.category}) - ${p.availableSizes.length} sizes, ${p.availableColors.length} colors, baseId: ${p.uid}`)
    })
    
    // Debug: Show baseId distribution
    console.log('\nBaseId distribution (first 10):')
    Array.from(groupedProducts.keys()).slice(0, 10).forEach((baseId, i) => {
      const p = groupedProducts.get(baseId)
      console.log(`  ${i + 1}. ${baseId} -> ${p.title}`)
    })

    return NextResponse.json({
      products,
      count: products.length,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Error fetching Gelato product catalog:', error)

    // Handle specific errors
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })

      if (error.message.includes('GELATO_API_KEY')) {
        return NextResponse.json(
          { error: 'Gelato API is not configured', details: error.message },
          { status: 500 }
        )
      }

      if (error.name === 'GelatoApiError') {
        return NextResponse.json(
          {
            error: 'Failed to fetch products from Gelato API',
            details: error.message
          },
          { status: 502 }
        )
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch product catalog',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch product catalog', details: 'Unknown error' },
      { status: 500 }
    )
  }
}
