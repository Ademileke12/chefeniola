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

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Fetch order by session ID
    const order = await orderService.getOrderBySessionId(sessionId)

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error fetching order by session ID:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
