/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for payment processing:
 * - checkout.session.completed: Create order and submit to Gelato
 * - payment_intent.payment_failed: Log payment failure
 * 
 * Requirements: 7.2, 7.3, 7.4, 8.1
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripeService } from '@/lib/services/stripeService'
import { orderService } from '@/lib/services/orderService'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { CreateWebhookLogData } from '@/types'
import type Stripe from 'stripe'

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
 * Handle checkout.session.completed event
 * Creates order and submits to Gelato
 * 
 * Requirements: 7.4, 8.1
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  try {
    // Extract payment data
    const paymentData = await stripeService.handlePaymentSuccess(session)

    // Fetch product details to get gelatoProductUid and designUrl
    const orderItems = await Promise.all(
      paymentData.cartItems.map(async (item) => {
        // Fetch product from database
        const { data: product, error } = await supabaseAdmin
          .from('products')
          .select('gelato_product_uid, design_url')
          .eq('id', item.productId)
          .single()

        if (error || !product) {
          throw new Error(`Product not found: ${item.productId}`)
        }

        return {
          productId: item.productId,
          productName: item.productName,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          price: item.price,
          designUrl: product.design_url,
          gelatoProductUid: product.gelato_product_uid,
        }
      })
    )

    // Create order in database
    const order = await orderService.createOrder({
      customerEmail: paymentData.customerEmail,
      stripePaymentId: paymentData.stripePaymentId,
      items: orderItems,
      shippingAddress: paymentData.shippingAddress,
      total: paymentData.total,
    })

    console.log(`Order created: ${order.orderNumber}`)

    // Submit order to Gelato for fulfillment
    await orderService.submitToGelato(order.id)

    console.log(`Order submitted to Gelato: ${order.orderNumber}`)
  } catch (error) {
    console.error('Failed to process checkout session:', error)
    throw error
  }
}

/**
 * Handle payment_intent.payment_failed event
 * Logs payment failure
 * 
 * Requirements: 7.5
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  try {
    logger.error('Payment failed', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      lastPaymentError: paymentIntent.last_payment_error,
    })

    // Log to webhook_logs for tracking
    await logWebhookEvent({
      source: 'stripe',
      eventType: 'payment_intent.payment_failed',
      eventId: paymentIntent.id,
      payload: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        error: paymentIntent.last_payment_error,
      },
    })
  } catch (error) {
    console.error('Failed to log payment failure:', error)
  }
}

/**
 * POST /api/webhooks/stripe
 * 
 * Stripe webhook endpoint
 * Verifies signature and processes webhook events
 * 
 * Requirements: 7.2, 7.3, 7.4, 8.1
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body and signature
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature (Requirement 7.3)
    let event: Stripe.Event
    try {
      event = stripeService.verifyWebhookSignature(body, signature)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Log webhook event
    await logWebhookEvent({
      source: 'stripe',
      eventType: event.type,
      eventId: event.id,
      payload: event.data.object,
    })

    console.log(`Processing Stripe webhook: ${event.type}`)

    // Handle different event types
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          await handleCheckoutSessionCompleted(session)
          break
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent
          await handlePaymentFailed(paymentIntent)
          break
        }

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      // Mark webhook as processed
      await markWebhookProcessed(event.id)

      return NextResponse.json({ received: true })
    } catch (error) {
      // Mark webhook as processed with error
      await markWebhookProcessed(
        event.id,
        error instanceof Error ? error.message : 'Unknown error'
      )

      console.error('Error processing webhook event:', error)

      // Return 500 to trigger Stripe retry
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
