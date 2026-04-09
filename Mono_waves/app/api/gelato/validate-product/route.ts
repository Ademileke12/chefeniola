import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { validateProductUid } from '@/lib/utils/productUidValidator'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * POST /api/gelato/validate-product
 * Validate a Gelato product UID
 */
export async function POST(request: NextRequest) {
  try {
    // Security check
    const { isAdmin } = await requireAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productUid } = body

    if (!productUid) {
      return NextResponse.json(
        { error: 'Product UID is required' },
        { status: 400 }
      )
    }

    // Validate the product UID
    const validation = await validateProductUid(productUid)

    if (validation.isValid) {
      return NextResponse.json({
        valid: true,
        productDetails: validation.productDetails,
      })
    } else {
      return NextResponse.json({
        valid: false,
        error: validation.error,
      })
    }
  } catch (error) {
    console.error('Error validating product UID:', error)
    return NextResponse.json(
      { error: 'Failed to validate product UID' },
      { status: 500 }
    )
  }
}
