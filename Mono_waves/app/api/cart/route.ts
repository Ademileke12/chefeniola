import { NextRequest, NextResponse } from 'next/server'
import { cartService } from '@/lib/services/cartService'
import type { CartItem } from '@/types'

/**
 * GET /api/cart?sessionId=xxx - Get cart by session ID
 * Requirements: 5.1, 5.2
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const cart = await cartService.getCart(sessionId)
    return NextResponse.json(cart)
  } catch (error) {
    console.error('Error fetching cart:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cart - Add item to cart
 * Requirements: 5.1
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    if (!body.productId || !body.productName || !body.size || !body.color) {
      return NextResponse.json(
        { error: 'Missing required item fields' },
        { status: 400 }
      )
    }

    if (!body.price || body.price <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than zero' },
        { status: 400 }
      )
    }

    if (!body.quantity || body.quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than zero' },
        { status: 400 }
      )
    }

    if (!body.imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    const item: Omit<CartItem, 'id'> = {
      productId: body.productId,
      productName: body.productName,
      size: body.size,
      color: body.color,
      quantity: body.quantity,
      price: body.price,
      imageUrl: body.imageUrl,
    }

    const cart = await cartService.addItem(body.sessionId, item)
    return NextResponse.json(cart, { status: 201 })
  } catch (error) {
    console.error('Error adding item to cart:', error)
    
    // Handle validation errors from service
    if (error instanceof Error && error.message.includes('Quantity must be greater than zero')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to add item to cart' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/cart - Update item quantity
 * Requirements: 5.3
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    if (!body.itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    if (!body.quantity || body.quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than zero' },
        { status: 400 }
      )
    }

    const cart = await cartService.updateItemQuantity(
      body.sessionId,
      body.itemId,
      body.quantity
    )
    
    return NextResponse.json(cart)
  } catch (error) {
    console.error('Error updating cart item:', error)
    
    // Handle validation errors from service
    if (error instanceof Error) {
      if (error.message.includes('Quantity must be greater than zero')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('Item not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update cart item' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/cart - Remove item from cart
 * Requirements: 5.4
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    if (!body.itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const cart = await cartService.removeItem(body.sessionId, body.itemId)
    return NextResponse.json(cart)
  } catch (error) {
    console.error('Error removing cart item:', error)
    return NextResponse.json(
      { error: 'Failed to remove cart item' },
      { status: 500 }
    )
  }
}
