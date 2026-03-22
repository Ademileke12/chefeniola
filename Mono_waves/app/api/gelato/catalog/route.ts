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

    // Transform and group Gelato API response to match our GelatoProduct interface
    const groupedProducts = new Map<string, any>()

    rawProducts.forEach(product => {
      const attributes = product.attributes || {}

      // Heuristic to find base product ID: strip size and color from productUid
      // Typical format: apparel_men_t-shirt_cotton_crew-neck_white_s
      const parts = product.productUid.split('_')
      // Guess that last 2 parts are color and size
      const baseId = parts.slice(0, parts.length - 2).join('_') || product.productUid

      const size = attributes.Size || attributes.size || attributes.PaperFormat || 'One Size'
      const colorName = attributes.Color || attributes.color || attributes.ColorType || 'Default'
      const colorCode = attributes.ColorCode || '#000000'

      if (!groupedProducts.has(baseId)) {
        const title = baseId
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        groupedProducts.set(baseId, {
          uid: baseId,
          title: title,
          description: `High-quality ${title} from Gelato.`,
          availableSizes: new Set<string>(),
          availableColors: new Map<string, { name: string, code: string }>(),
          basePrice: 25.00,
          imageUrl: `https://placehold.co/400x500/e5e7eb/1f2937?text=${encodeURIComponent(title.substring(0, 20))}`,
          variants: {}
        })
      }

      const p = groupedProducts.get(baseId)
      p.availableSizes.add(size)
      if (!p.availableColors.has(colorName)) {
        p.availableColors.set(colorName, { name: colorName, code: colorCode })
      }
      p.variants[`${size}:${colorName}`] = product.productUid
    })

    // Convert Map back to array and finalize structure
    const products = Array.from(groupedProducts.values()).map(p => ({
      ...p,
      availableSizes: Array.from(p.availableSizes),
      availableColors: Array.from(p.availableColors.values()),
    }))

    console.log(`Successfully fetched and transformed ${products.length} products from Gelato`)

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
