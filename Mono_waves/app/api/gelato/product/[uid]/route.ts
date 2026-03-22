import { NextRequest, NextResponse } from 'next/server'
import { getProductDetails } from '@/lib/services/gelatoService'

/**
 * GET /api/gelato/product/[uid] - Get Gelato product details (admin)
 * 
 * Fetches detailed information about a specific Gelato product by its UID.
 * This endpoint is intended for admin use only to view product specifications,
 * available sizes, colors, and other details when creating store products.
 * 
 * Requirements: 1.2, 2.1
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    // TODO: Add admin authentication check
    // const user = await requireAdmin(request)

    const { uid } = params

    // Validate UID parameter
    if (!uid || uid.trim() === '') {
      return NextResponse.json(
        { error: 'Product UID is required' },
        { status: 400 }
      )
    }

    // Fetch product details from Gelato
    const product = await getProductDetails(uid)

    return NextResponse.json({
      product,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Error fetching Gelato product details:', error)
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('GELATO_API_KEY')) {
        return NextResponse.json(
          { error: 'Gelato API is not configured' },
          { status: 500 }
        )
      }
      
      if (error.message.includes('Product UID is required')) {
        return NextResponse.json(
          { error: 'Invalid product UID' },
          { status: 400 }
        )
      }
      
      if (error.name === 'GelatoApiError') {
        return NextResponse.json(
          { error: 'Failed to fetch product details from Gelato API' },
          { status: 502 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch product details' },
      { status: 500 }
    )
  }
}
