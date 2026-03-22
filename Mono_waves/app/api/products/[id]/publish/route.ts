import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/productService'

/**
 * POST /api/products/[id]/publish - Publish product (admin)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add admin authentication check
    // const user = await requireAdmin(request)
    
    const product = await productService.publishProduct(params.id)
    
    return NextResponse.json(product)
  } catch (error) {
    console.error('Error publishing product:', error)
    return NextResponse.json(
      { error: 'Failed to publish product' },
      { status: 500 }
    )
  }
}
