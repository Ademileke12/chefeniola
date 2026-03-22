/**
 * Gelato Webhook Handler
 * 
 * Handles Gelato webhook events for order fulfillment:
 * - order.status.updated: Update order status in database
 * - order.shipped: Store tracking information
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/orderService'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { CreateWebhookLogData, OrderStatus } from '@/types'
import crypto from 'crypto'

/**
 * Gelato webhook event payload structure
 */
interface GelatoWebhookEvent {
  eventType: string
  eventId: string
  timestamp: string
  data: {
    orderId: string
    orderReferenceId: string
    status: string
    trackingNumber?: string
    carrier?: string
    [key: string]: any
  }
}

/**
 * Log webhook event to database
 */
async function logWebhookEvent(data: CreateWebhookLogData): Promise<void> {
  try {
    await supabaseAdmin.from('webhook_logs').insert({
      source: data.source,
      event_type: data.eventType,
      event_id: data.eventId,
      payload: data.payload,
      processed: false,
    })
  } catch (error) {
    console.error('Failed to log webhook event:', error)
  }
}

/**
 * Mark webhook as processed
 */
async function markWebhookProcessed(
  eventId: string,
  error?: string
): Promise<void> {
  try {
    await supabaseAdmin
      .from('webhook_logs')
      .update({
        processed: true,
        error: error || null,
      })
      .eq('event_id', eventId)
  } catch (err) {
    console.error('Failed to mark webhook as processed:', err)
  }
}

/**
 * Verify Gelato webhook signature
 * 
 * Gelato uses HMAC-SHA256 signature verification
 * Requirements: 10.2, 20.1
 */
function verifyGelatoSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature) {
    return false
  }

  const webhookSecret = process.env.GELATO_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('GELATO_WEBHOOK_SECRET is not configured')
    return false
  }

  try {
    // Compute HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', webhookSecret)
    hmac.update(payload)
    const computedSignature = hmac.digest('hex')

    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    )
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Map Gelato order status to internal OrderStatus
 */
function mapGelatoStatus(gelatoStatus: string): OrderStatus {
  const statusMap: Record<string, OrderStatus> = {
    'pending': 'submitted_to_gelato',
    'processing': 'printing',
    'in_production': 'printing',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'failed': 'failed',
  }

  const mappedStatus = statusMap[gelatoStatus.toLowerCase()]
  if (!mappedStatus) {
    console.warn(`Unknown Gelato status: ${gelatoStatus}, defaulting to submitted_to_gelato`)
    return 'submitted_to_gelato'
  }

  return mappedStatus
}

/**
 * Handle order status update event
 * 
 * Requirements: 10.3, 10.4, 10.5
 */
async function handleOrderStatusUpdate(event: GelatoWebhookEvent): Promise<void> {
  try {
    const { orderReferenceId, status, trackingNumber, carrier } = event.data

    // Find order by order number (which is our orderReferenceId)
    const { data: orders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('order_number', orderReferenceId)
      .limit(1)

    if (fetchError) {
      throw new Error(`Failed to fetch order: ${fetchError.message}`)
    }

    if (!orders || orders.length === 0) {
      throw new Error(`Order not found: ${orderReferenceId}`)
    }

    const orderId = orders[0].id

    // Map Gelato status to internal status
    const internalStatus = mapGelatoStatus(status)

    // Update order status with tracking information if available
    const trackingData = trackingNumber && carrier
      ? { trackingNumber, carrier }
      : undefined

    await orderService.updateOrderStatus(orderId, internalStatus, trackingData)

    console.log(`Order ${orderReferenceId} updated to status: ${internalStatus}`)

    if (trackingData) {
      console.log(`Tracking info: ${carrier} - ${trackingNumber}`)
    }
  } catch (error) {
    logger.error('Failed to process order status update', error)
    throw error
  }
}

/**
 * POST /api/webhooks/gelato
 * 
 * Gelato webhook endpoint
 * Verifies signature and processes webhook events
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body and signature
    const body = await request.text()
    const signature = request.headers.get('x-gelato-signature')

    // Verify webhook signature (Requirement 10.2)
    if (!signature || !verifyGelatoSignature(body, signature)) {
      console.error('Gelato webhook signature verification failed')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Parse webhook event
    let event: GelatoWebhookEvent
    try {
      event = JSON.parse(body)
    } catch (error) {
      console.error('Failed to parse webhook payload:', error)
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      )
    }

    // Log webhook event
    await logWebhookEvent({
      source: 'gelato',
      eventType: event.eventType,
      eventId: event.eventId,
      payload: event.data,
    })

    console.log(`Processing Gelato webhook: ${event.eventType}`)

    // Handle different event types
    try {
      switch (event.eventType) {
        case 'order.status.updated':
        case 'order.shipped':
        case 'order.delivered':
        case 'order.cancelled':
        case 'order.failed':
          await handleOrderStatusUpdate(event)
          break

        default:
          console.log(`Unhandled event type: ${event.eventType}`)
      }

      // Mark webhook as processed
      await markWebhookProcessed(event.eventId)

      return NextResponse.json({ received: true })
    } catch (error) {
      // Mark webhook as processed with error
      await markWebhookProcessed(
        event.eventId,
        error instanceof Error ? error.message : 'Unknown error'
      )

      console.error('Error processing webhook event:', error)

      // Return 500 to trigger Gelato retry
      return NextResponse.json(
        { error: 'Processing failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
