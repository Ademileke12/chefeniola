import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/orderService'

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * POST /api/orders/track - Track order by email and order number (public)
 * 
 * Allows customers to track their orders by providing their email address
 * and order number. This is a public endpoint that doesn't require authentication
 * but validates that the email matches the order.
 * 
 * Request Body:
 * - email: Customer's email address
 * - orderNumber: Order number (e.g., "MW-ABC123-DEF4")
 * 
 * Requirements: 9.2, 9.3
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!body.orderNumber) {
      return NextResponse.json(
        { error: 'Order number is required' },
        { status: 400 }
      )
    }

    // Normalize email to lowercase and trim for consistent matching
    const email = body.email.trim().toLowerCase()

    // Validate email format (Requirement 9.2)
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate order number format (basic check for MW- prefix)
    const orderNumber = body.orderNumber.trim()
    if (!orderNumber.startsWith('MW-')) {
      return NextResponse.json(
        { error: 'Invalid order number format' },
        { status: 400 }
      )
    }

    // Track order using email and order number (Requirements 9.2, 9.3)
    const order = await orderService.trackOrder(email, orderNumber)

    if (!order) {
      // Return generic error message for security (don't reveal if email or order number is wrong)
      return NextResponse.json(
        {
          error: 'Order not found or email does not match',
          message: 'Please check your email address and order number and try again.'
        },
        { status: 404 }
      )
    }

    // Return minimized order information for tracking (Security: Privacy hardening)
    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          size: item.size,
          color: item.color
        })),
        shippingAddress: {
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          country: order.shippingAddress.country
        },
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      message: 'Order tracking state retrieved successfully'
    })

  } catch (error) {
    console.error('Error tracking order:', error)

    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('Valid email is required')) {
        return NextResponse.json(
          { error: 'Valid email is required' },
          { status: 400 }
        )
      }

      if (error.message.includes('Order ID is required')) {
        return NextResponse.json(
          { error: 'Order number is required' },
          { status: 400 }
        )
      }

      if (error.message.includes('Failed to track order')) {
        return NextResponse.json(
          { error: 'Database error while tracking order' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to track order' },
      { status: 500 }
    )
  }
}