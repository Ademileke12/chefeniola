/**
 * GET /api/orders/session/[sessionId]
 * 
 * Fetch order by Stripe session ID
 * Used by the confirmation page after payment
 */

import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/orderService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    console.log('[Order API] Fetching order by session ID:', sessionId)

    if (!sessionId) {
      console.error('[Order API] No session ID provided')
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Fetch order by session ID
    const order = await orderService.getOrderBySessionId(sessionId)

    if (!order) {
      console.warn('[Order API] Order not found for session:', sessionId)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    console.log('[Order API] Order found:', order.orderNumber)
    return NextResponse.json({ order })
  } catch (error) {
    console.error('[Order API] Error fetching order by session ID:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
