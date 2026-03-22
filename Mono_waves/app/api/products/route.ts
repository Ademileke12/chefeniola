import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/productService'
import { requireAdmin } from '@/lib/auth'
import type { CreateProductData } from '@/types'

/**
 * GET /api/products - Get all published products (public)
 * Query params:
 * - includeUnpublished: boolean (admin only) - include unpublished products
 * - bestSellers: boolean - get best selling products
 * - curated: boolean - get curated selection
 * - limit: number - limit number of results
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true'
    const bestSellers = searchParams.get('bestSellers') === 'true'
    const curated = searchParams.get('curated') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10')

    let products

    if (bestSellers) {
      // Get best selling products
      products = await productService.getBestSellers(limit)
    } else if (curated) {
      // Get curated selection
      products = await productService.getCuratedSelection(limit)
    } else if (includeUnpublished) {
      // Security check for unpublished products
      const { isAdmin } = await requireAdmin(request)
      if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const result = await productService.getAllProducts()
      products = result.products
    } else {
      const result = await productService.getPublishedProducts()
      products = result.products
    }

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products - Create product (admin)
 */
export async function POST(request: NextRequest) {
  try {
    // Security check
    const { isAdmin } = await requireAdmin(request)
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.price || !body.gelatoProductUid) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price, and gelatoProductUid are required' },
        { status: 400 }
      )
    }

    // For now, allow products without designUrl if they have designData
    // When task 14 (export) is complete, designUrl will be generated from designData
    // This allows the design editor workflow to work before export is implemented

    // Validate price
    if (body.price <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than zero' },
        { status: 400 }
      )
    }

    const productData: CreateProductData = {
      name: body.name,
      description: body.description || '',
      price: body.price,
      gelatoProductId: body.gelatoProductId || body.gelatoProductUid,
      gelatoProductUid: body.gelatoProductUid,
      variants: body.variants || [],
      designFileUrl: body.designFileUrl || body.designUrl || 'pending-export',
      images: body.images || [],
      designData: body.designData,
    }

    const product = await productService.createProduct(productData)

    // If published flag is set, publish the product immediately
    if (body.published === true) {
      const publishedProduct = await productService.publishProduct(product.id)
      return NextResponse.json({ product: publishedProduct }, { status: 201 })
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
