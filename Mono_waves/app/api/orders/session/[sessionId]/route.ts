/**
 * GET /api/orders/session/[sessionId]
 * 
 * Fetch order by Stripe session ID
 * Used by the confirmation page after payment
 * 
 * Requirements: 4.1, 5.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/orderService'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // Log all lookups with session ID (Requirements: 5.3)
    logger.info('Fetching order by session ID', { sessionId })

    if (!sessionId) {
      logger.error('No session ID provided in request')
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Fetch order by session ID (Requirements: 4.1)
    const order = await orderService.getOrderBySessionId(sessionId)

    // Return 404 if order not found
    if (!order) {
      logger.info('Order not found for session', { sessionId })
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    logger.info('Order found successfully', { 
      sessionId, 
      orderNumber: order.orderNumber 
    })
    return NextResponse.json({ order })
  } catch (error) {
    // Return 500 with logging if database error occurs (Requirements: 5.3)
    logger.error('Error fetching order by session ID', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: (await params).sessionId,
    })
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
