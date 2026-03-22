import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * POST /api/products/[id]/unpublish - Unpublish product (admin)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add admin authentication check
    // const user = await requireAdmin(request)
    
    const productId = params.id
    
    // Update the product to unpublish it
    const { data: updated, error } = await supabaseAdmin
      .from('products')
      .update({
        published: false,
        published_at: null,
      })
      .eq('id', productId)
      .select()
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }
      throw error
    }
    
    return NextResponse.json({ product: updated })
  } catch (error) {
    console.error('Error unpublishing product:', error)
    return NextResponse.json(
      { error: 'Failed to unpublish product' },
      { status: 500 }
    )
  }
}
