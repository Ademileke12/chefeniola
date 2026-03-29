import { NextRequest, NextResponse } from 'next/server'
import { getProductCatalog } from '@/lib/services/gelatoService'

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

    console.log('Fetching Gelato product catalog...')

    // Check if API key is configured
    if (!process.env.GELATO_API_KEY) {
      console.error('GELATO_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Gelato API key is not configured. Please set GELATO_API_KEY in your environment variables.' },
        { status: 500 }
      )
    }

    // Fetch product catalog from Gelato
    const rawProducts = await getProductCatalog()

    // Debug: Log first few products to see what attributes Gelato provides
    if (rawProducts.length > 0) {
      console.log('Sample Gelato products (first 3):')
      rawProducts.slice(0, 3).forEach((p, i) => {
        console.log(`\nProduct ${i + 1}:`)
        console.log(`  productUid: ${p.productUid}`)
        console.log(`  attributes:`, JSON.stringify(p.attributes, null, 2))
      })
    }

    // Transform and group Gelato API response to match our GelatoProduct interface
    const groupedProducts = new Map<string, any>()
    let skippedDeactivated = 0
    let processedCount = 0

    rawProducts.forEach(product => {
      const attributes = product.attributes || {}

      // Skip deactivated products ONLY
      const productStatus = attributes.ProductStatus || attributes.productStatus || ''
      if (productStatus === 'deactivated') {
        skippedDeactivated++
        return
      }

      processedCount++

      // Extract Gelato-specific attributes
      const manufacturer = attributes.ApparelManufacturer || attributes.apparelManufacturer || 'Generic'
      const manufacturerSKU = attributes.ApparelManufacturerSKU || attributes.apparelManufacturerSKU || ''
      const category = attributes.GarmentCategory || attributes.garmentCategory || 'apparel'
      const subcategory = attributes.GarmentSubcategory || attributes.garmentSubcategory || ''
      const cut = attributes.GarmentCut || attributes.garmentCut || ''
      const quality = attributes.GarmentQuality || attributes.garmentQuality || ''
      const size = attributes.GarmentSize || attributes.garmentSize || 'One Size'
      const color = attributes.GarmentColor || attributes.garmentColor || 'default'
      const printArea = attributes.GarmentPrint || attributes.garmentPrint || ''
      
      // Create human-readable product name
      const categoryName = category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      const subcategoryName = subcategory ? subcategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : ''
      const cutName = cut && cut !== 'none' ? cut.charAt(0).toUpperCase() + cut.slice(1) : ''
      const qualityName = quality && quality !== 'classic' ? quality.charAt(0).toUpperCase() + quality.slice(1) : ''
      
      // Build product title
      const titleParts = []
      if (qualityName) titleParts.push(qualityName)
      if (cutName) titleParts.push(cutName)
      if (subcategoryName) titleParts.push(subcategoryName)
      titleParts.push(categoryName)
      
      const productTitle = titleParts.join(' ')
      
      // Add manufacturer info if available and not "none"
      const displayName = manufacturer && manufacturer !== 'none' && manufacturer !== 'Generic'
        ? `${productTitle} | ${manufacturer.toUpperCase()} ${manufacturerSKU}`
        : productTitle

      // Create a stable base ID for grouping variants (same product, different sizes/colors)
      // Group by: category + subcategory + cut + quality + manufacturer + SKU
      const baseId = `${category}_${subcategory}_${cut}_${quality}_${manufacturer}_${manufacturerSKU}`
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')

      // Determine main category for filtering
      let mainCategory = 'Apparel'
      if (cut === 'men' || cut === 'male') {
        mainCategory = "Men's Clothing"
      } else if (cut === 'women' || cut === 'female' || cut === 'ladies') {
        mainCategory = "Women's Clothing"
      } else if (cut === 'kids' || cut === 'baby' || cut === 'youth' || cut === 'toddler') {
        mainCategory = "Kids & Baby"
      } else if (cut === 'unisex') {
        mainCategory = "Unisex"
      }

      // Extract pricing if available (Gelato usually provides this in cents)
      let basePrice = 25.00 // Default fallback
      if (attributes.BasePrice || attributes.basePrice) {
        const priceValue = parseFloat(attributes.BasePrice || attributes.basePrice)
        basePrice = priceValue > 100 ? priceValue / 100 : priceValue
      }

      // Color formatting
      const colorName = color.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      const colorCode = '#CCCCCC' // Gelato doesn't provide hex codes in these attributes

      if (!groupedProducts.has(baseId)) {
        // Create description
        const descParts = []
        if (qualityName) descParts.push(qualityName)
        if (cutName) descParts.push(`${cutName}'s`)
        descParts.push(categoryName)
        if (manufacturer && manufacturer !== 'none' && manufacturer !== 'Generic') {
          descParts.push(`by ${manufacturer.toUpperCase()}`)
        }
        
        const description = `${descParts.join(' ')} - High-quality print-on-demand apparel from Gelato`

        groupedProducts.set(baseId, {
          uid: baseId,
          title: displayName,
          description: description,
          category: mainCategory,
          subcategory: subcategoryName || categoryName,
          brand: manufacturer && manufacturer !== 'none' && manufacturer !== 'Generic' ? manufacturer.toUpperCase() : '',
          availableSizes: new Set<string>(),
          availableColors: new Map<string, { name: string, code: string }>(),
          basePrice: basePrice,
          imageUrl: `https://placehold.co/400x500/e5e7eb/1f2937?text=${encodeURIComponent(productTitle.substring(0, 20))}`,
          variants: {},
          rawProductUid: product.productUid // Keep original for reference
        })
      }

      const p = groupedProducts.get(baseId)
      p.availableSizes.add(size)
      if (!p.availableColors.has(colorName)) {
        p.availableColors.set(colorName, { name: colorName, code: colorCode })
      }
      // Store the actual Gelato productUid for this specific variant
      p.variants[`${size}:${colorName}`] = product.productUid
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
