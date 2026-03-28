import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/orderService'
import { logger } from '@/lib/logger'

/**
 * POST /api/orders/[id]/submit-to-gelato
 * 
 * Submit an order to Gelato for fulfillment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Submit order to Gelato
    await orderService.submitToGelato(orderId)

    return NextResponse.json({
      success: true,
      message: 'Order successfully submitted to Gelato for fulfillment'
    })

  } catch (error) {
    logger.error('Error submitting order to Gelato', error)

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Order not found')) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }

      if (error.message.includes('cannot be submitted')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      if (error.message.includes('GELATO_API_KEY')) {
        return NextResponse.json(
          { error: 'Gelato API is not configured' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to submit order to Gelato' },
      { status: 500 }
    )
  }
}
