import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/productService'
import { requireAdmin } from '@/lib/auth'
import type { CreateProductData } from '@/types'

// Force dynamic rendering - this route uses request headers for auth
export const dynamic = 'force-dynamic'

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
    
    console.log('[POST /api/products] Received product data:', {
      name: body.name,
      price: body.price,
      gelatoProductUid: body.gelatoProductUid,
      hasDesignUrl: !!body.designFileUrl,
      hasDesignData: !!body.designData,
      variantsCount: body.variants?.length || 0
    })

    // Validate required fields
    if (!body.name || !body.price || !body.gelatoProductUid) {
      console.error('[POST /api/products] Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: name, price, and gelatoProductUid are required' },
        { status: 400 }
      )
    }

    // Validate design URL or design data
    const hasDesignUrl = body.designFileUrl && 
                        body.designFileUrl !== 'pending-export' && 
                        body.designFileUrl !== 'design-editor-pending-export'
    const hasDesignData = body.designData && 
                         body.designData.elements && 
                         body.designData.elements.length > 0

    if (!hasDesignUrl && !hasDesignData) {
      return NextResponse.json(
        { error: 'Either designFileUrl or designData is required' },
        { status: 400 }
      )
    }

    // Validate design URL is accessible if provided
    if (hasDesignUrl) {
      try {
        const urlCheck = await fetch(body.designFileUrl, { method: 'HEAD' })
        if (!urlCheck.ok) {
          return NextResponse.json(
            { error: 'Design file URL is not accessible' },
            { status: 400 }
          )
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to verify design file URL accessibility' },
          { status: 400 }
        )
      }
    }

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
    console.error('[POST /api/products] Error creating product:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create product'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
