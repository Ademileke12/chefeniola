import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/productService'
import { requireAdmin } from '@/lib/auth'
import type { UpdateProductData } from '@/types'

/**
 * GET /api/products/[id] - Get product by ID (public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await productService.getProductById(params.id)

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/products/[id] - Update product (admin)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Security check
    const { isAdmin } = await requireAdmin(request)
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Validate price if provided
    if (body.price !== undefined && body.price <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than zero' },
        { status: 400 }
      )
    }

    const updateData: UpdateProductData = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.price !== undefined) updateData.price = body.price
    if (body.variants !== undefined) updateData.variants = body.variants
    if (body.designFileUrl !== undefined) updateData.designFileUrl = body.designFileUrl
    if (body.images !== undefined) updateData.images = body.images
    if (body.designData !== undefined) updateData.designData = body.designData

    const product = await productService.updateProduct(params.id, updateData)

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id] - Delete product (admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Security check
    const { isAdmin } = await requireAdmin(request)
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await productService.deleteProduct(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
