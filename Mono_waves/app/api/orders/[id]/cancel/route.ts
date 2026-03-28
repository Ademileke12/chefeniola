import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/orderService'
import { stripeService } from '@/lib/services/stripeService'
import { logger } from '@/lib/logger'

/**
 * POST /api/orders/[id]/cancel
 * 
 * Cancel an order and issue a refund if payment was processed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const body = await request.json()
    const { reason } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Get the order
    const order = await orderService.getOrderById(orderId)
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if order can be cancelled
    if (order.status === 'delivered') {
      return NextResponse.json(
        { error: 'Cannot cancel a delivered order' },
        { status: 400 }
      )
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Order is already cancelled' },
        { status: 400 }
      )
    }

    // If order was submitted to Gelato, warn admin
    if (order.status === 'submitted_to_gelato' || order.status === 'printing' || order.status === 'shipped') {
      return NextResponse.json(
        { 
          error: 'Order has already been sent to production. Contact Gelato support to cancel.',
          gelatoOrderId: order.gelatoOrderId
        },
        { status: 400 }
      )
    }

    // Issue refund via Stripe
    let refundId: string | undefined
    try {
      if (order.stripePaymentId) {
        const refund = await stripeService.refundPayment(order.stripePaymentId, reason)
        refundId = refund.id
      }
    } catch (refundError) {
      logger.error('Failed to process refund', refundError)
      return NextResponse.json(
        { error: 'Failed to process refund. Please try again or contact support.' },
        { status: 500 }
      )
    }

    // Update order status to cancelled
    await orderService.updateOrderStatus(orderId, 'cancelled')

    // TODO: Send cancellation email to customer

    return NextResponse.json({
      success: true,
      message: 'Order cancelled and refund processed successfully',
      refundId
    })

  } catch (error) {
    logger.error('Error cancelling order', error)

    if (error instanceof Error) {
      if (error.message.includes('Order not found')) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    )
  }
}
