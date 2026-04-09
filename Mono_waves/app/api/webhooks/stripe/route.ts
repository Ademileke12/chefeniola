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
import { orderService, calculateEstimatedDelivery } from '@/lib/services/orderService'
import { emailService } from '@/lib/services/emailService'
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
 * Creates order, submits to Gelato, and sends confirmation email
 * 
 * Requirements: 2.3, 3.1, 4.1, 4.5, 7.4, 8.1
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@monowaves.com'
  
  console.log('[Webhook] Processing checkout.session.completed')
  console.log('[Webhook] Session ID:', session.id)
  console.log('[Webhook] Customer email:', session.customer_details?.email)
  
  try {
    // Extract payment data
    const paymentData = await stripeService.handlePaymentSuccess(session)
    console.log('[Webhook] Payment data extracted successfully')

    // Extract tax amount from Stripe session (Requirement 4.1, 4.5)
    const tax = session.total_details?.amount_tax 
      ? session.total_details.amount_tax / 100 
      : 0

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
    console.log('[Webhook] Product details fetched for', orderItems.length, 'items')

    // Create order in database with tax and session ID (Requirement 4.5)
    console.log('[Webhook] Creating order in database...')
    const order = await orderService.createOrder({
      customerEmail: paymentData.customerEmail,
      stripePaymentId: paymentData.stripePaymentId,
      stripeSessionId: session.id,
      items: orderItems,
      shippingAddress: paymentData.shippingAddress,
      tax,
      total: paymentData.total,
    })

    console.log(`[Webhook] ✅ Order created: ${order.orderNumber} (ID: ${order.id})`)
    console.log(`[Webhook] Session ID stored: ${order.stripeSessionId}`)

    // Send confirmation email to customer FIRST (before Gelato submission)
    // This ensures customers get their confirmation even if Gelato fails
    try {
      const estimatedDelivery = calculateEstimatedDelivery(order.createdAt)
      
      await emailService.sendOrderConfirmation({
        to: order.customerEmail,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        items: order.items,
        shippingAddress: order.shippingAddress,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        tax: order.tax,
        total: order.total,
        estimatedDelivery,
      })

      console.log(`[Webhook] ✅ Confirmation email sent to: ${order.customerEmail}`)
    } catch (emailError) {
      // Log email failure but don't fail the webhook
      logger.error('Failed to send confirmation email', {
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
      })

      // Notify admin about email failure
      await emailService.sendAdminNotification({
        to: adminEmail,
        subject: 'Order Confirmation Email Failed',
        message: `Failed to send confirmation email for order ${order.orderNumber} to ${order.customerEmail}.`,
        orderNumber: order.orderNumber,
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
      })
    }

    // Submit order to Gelato for fulfillment
    try {
      console.log('[Webhook] Submitting order to Gelato...')
      await orderService.submitToGelato(order.id)
      console.log(`[Webhook] ✅ Order submitted to Gelato: ${order.orderNumber}`)
    } catch (gelatoError) {
      // Log Gelato submission failure and notify admin
      logger.error('Gelato submission failed', {
        orderNumber: order.orderNumber,
        orderId: order.id,
        error: gelatoError instanceof Error ? gelatoError.message : 'Unknown error',
      })

      // Send admin notification about Gelato failure
      await emailService.sendAdminNotification({
        to: adminEmail,
        subject: 'Gelato Order Submission Failed',
        message: `Failed to submit order ${order.orderNumber} to Gelato for fulfillment.`,
        orderNumber: order.orderNumber,
        error: gelatoError instanceof Error ? gelatoError.message : 'Unknown error',
      })

      // DON'T re-throw - allow order to complete even if Gelato fails
      // This is important for testing and ensures customers get their confirmation
      console.warn(`[Webhook] ⚠️  Gelato submission failed for order ${order.orderNumber}, but order was created successfully`)
    }
  } catch (error) {
    console.error('[Webhook] ❌ Failed to process checkout session:', error)
    
    // Send admin notification for any unhandled errors (Requirement 2.3)
    try {
      await emailService.sendAdminNotification({
        to: adminEmail,
        subject: 'Order Processing Error',
        message: 'An error occurred while processing a checkout session.',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } catch (notificationError) {
      console.error('[Webhook] Failed to send admin notification:', notificationError)
    }
    
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
  console.log('🔔 WEBHOOK RECEIVED - Stripe webhook endpoint called!')
  console.log('Timestamp:', new Date().toISOString())
  
  try {
    // Get raw body and signature
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    console.log('Body length:', body.length)
    console.log('Has signature:', !!signature)

    if (!signature) {
      console.error('❌ Missing stripe-signature header')
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
