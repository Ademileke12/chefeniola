/**
 * Order Tracking API Route
 * 
 * Allows customers to track their orders by providing email and order number.
 * 
 * Requirements: 6.2, 6.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/orderService'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, orderNumber } = body

    // Validate inputs
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!orderNumber || typeof orderNumber !== 'string') {
      return NextResponse.json(
        { error: 'Order number is required' },
        { status: 400 }
      )
    }

    // Track order
    const order = await orderService.trackOrder(email, orderNumber)

    if (!order) {
      // Don't reveal whether email or order number is wrong (security)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Return order data
    return NextResponse.json({ order }, { status: 200 })
  } catch (error) {
    logger.error('Order tracking error', error)
    return NextResponse.json(
      { error: 'Failed to track order' },
      { status: 500 }
    )
  }
}
