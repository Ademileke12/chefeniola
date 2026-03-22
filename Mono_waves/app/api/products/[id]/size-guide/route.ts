import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/productService'
import { gelatoService } from '@/lib/services/gelatoService'

/**
 * GET /api/products/[id]/size-guide
 * Fetches real-time size guide data from Gelato
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const productId = params.id
    console.log(`[API] Fetching size guide for product ID: ${productId}`)

    try {

        // 1. Fetch our internal product
        const product = await productService.getProductById(productId)
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        if (!product.gelatoProductUid) {
            return NextResponse.json({ error: 'Gelato product UID not found' }, { status: 400 })
        }

        // 2. Fetch Gelato product details for measurements
        const gelatoDetails = await gelatoService.getProductDetails(product.gelatoProductUid)

        // 3. Return the measurements or attributes that form the size chart
        // Note: Gelato API v3 returns measurements in product details
        return NextResponse.json({
            measurements: gelatoDetails.dimensions || null,
            attributes: gelatoDetails.attributes || null
        })

    } catch (error) {
        console.error('Error fetching size guide:', error)
        return NextResponse.json(
            { error: 'Failed to fetch size guide' },
            { status: 500 }
        )
    }
}
