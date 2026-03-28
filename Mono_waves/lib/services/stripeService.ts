/**
 * Stripe Service
 * 
 * Handles integration with Stripe payment processing API for:
 * - Creating checkout sessions
 * - Verifying webhook signatures
 * - Processing payment success/failure events
 */

import Stripe from 'stripe'
import { logger } from '../logger'
import type { CheckoutSessionData, CartItem, ShippingAddress } from '@/types'

/**
 * Initialize Stripe client
 */
function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  })
}

/**
 * Get Stripe webhook secret
 */
function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }
  return secret
}

/**
 * Custom error class for Stripe service errors
 */
export class StripeServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'StripeServiceError'
  }
}

/**
 * Create a Stripe checkout session
 * 
 * Requirements: 6.4, 7.1
 */
export async function createCheckoutSession(
  data: CheckoutSessionData
): Promise<string> {
  // Validate input
  if (!data.cartItems || data.cartItems.length === 0) {
    throw new StripeServiceError('Cart items are required', 'INVALID_INPUT')
  }
  if (!data.customerEmail || !data.customerEmail.includes('@')) {
    throw new StripeServiceError('Valid customer email is required', 'INVALID_INPUT')
  }
  if (!data.shippingAddress) {
    throw new StripeServiceError('Shipping address is required', 'INVALID_INPUT')
  }
  if (!data.successUrl || !data.cancelUrl) {
    throw new StripeServiceError('Success and cancel URLs are required', 'INVALID_INPUT')
  }

  const stripe = getStripeClient()

  try {
    // Convert cart items to Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = data.cartItems.map(
      (item: CartItem) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.productName,
            description: `Size: ${item.size}, Color: ${item.color}`,
            images: item.imageUrl ? [item.imageUrl] : undefined,
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })
    )

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: data.customerEmail,
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: {
        cartItems: JSON.stringify(data.cartItems),
        shippingAddress: JSON.stringify(data.shippingAddress),
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES'],
      },
    })

    if (!session.url) {
      throw new StripeServiceError('Failed to create checkout session URL', 'SESSION_CREATION_FAILED')
    }

    return session.url
  } catch (error) {
    if (error instanceof StripeServiceError) {
      throw error
    }

    if (error instanceof Stripe.errors.StripeError) {
      throw new StripeServiceError(
        `Stripe API error: ${error.message}`,
        error.code,
        error.statusCode
      )
    }

    throw new StripeServiceError(
      `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN_ERROR'
    )
  }
}

/**
 * Verify Stripe webhook signature
 * 
 * Requirements: 7.2, 7.3
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient()
  const webhookSecret = getWebhookSecret()

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    )
    return event
  } catch (error) {
    if (error instanceof Error) {
      throw new StripeServiceError(
        `Webhook signature verification failed: ${error.message}`,
        'SIGNATURE_VERIFICATION_FAILED',
        400
      )
    }
    throw new StripeServiceError(
      'Webhook signature verification failed',
      'SIGNATURE_VERIFICATION_FAILED',
      400
    )
  }
}

/**
 * Handle successful payment
 * 
 * Requirements: 7.4
 */
export async function handlePaymentSuccess(
  session: Stripe.Checkout.Session
): Promise<{
  customerEmail: string
  stripePaymentId: string
  stripeSessionId: string
  cartItems: CartItem[]
  shippingAddress: ShippingAddress
  total: number
}> {
  // Validate session
  if (!session.id) {
    throw new StripeServiceError('Session ID is missing', 'INVALID_SESSION')
  }
  if (session.payment_status !== 'paid') {
    throw new StripeServiceError('Payment not completed', 'PAYMENT_NOT_COMPLETED')
  }
  if (!session.customer_email) {
    throw new StripeServiceError('Customer email is missing', 'INVALID_SESSION')
  }
  if (!session.payment_intent) {
    throw new StripeServiceError('Payment intent is missing', 'INVALID_SESSION')
  }

  // Extract metadata
  const metadata = session.metadata
  if (!metadata || !metadata.cartItems || !metadata.shippingAddress) {
    throw new StripeServiceError('Session metadata is incomplete', 'INVALID_METADATA')
  }

  try {
    const cartItems: CartItem[] = JSON.parse(metadata.cartItems)
    const shippingAddress: ShippingAddress = JSON.parse(metadata.shippingAddress)

    // Calculate total from session amount
    const total = session.amount_total ? session.amount_total / 100 : 0

    return {
      customerEmail: session.customer_email,
      stripePaymentId: session.payment_intent as string,
      stripeSessionId: session.id,
      cartItems,
      shippingAddress,
      total,
    }
  } catch (error) {
    throw new StripeServiceError(
      `Failed to parse session metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'METADATA_PARSE_ERROR'
    )
  }
}

/**
 * Handle failed payment
 * 
 * Requirements: 7.4
 */
export async function handlePaymentFailure(
  session: Stripe.Checkout.Session
): Promise<{
  sessionId: string
  customerEmail: string | null
  reason: string
}> {
  return {
    sessionId: session.id,
    customerEmail: session.customer_email,
    reason: session.payment_status || 'unknown',
  }
}

/**
 * Refund a payment
 * 
 * Used when cancelling orders before fulfillment
 */
export async function refundPayment(
  paymentIntentId: string,
  reason?: string
): Promise<Stripe.Refund> {
  if (!paymentIntentId) {
    throw new StripeServiceError('Payment intent ID is required', 'INVALID_INPUT')
  }

  const stripe = getStripeClient()

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer',
      metadata: {
        refund_reason: reason || 'Order cancelled by admin'
      }
    })

    return refund
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new StripeServiceError(
        `Stripe refund error: ${error.message}`,
        error.code,
        error.statusCode
      )
    }

    throw new StripeServiceError(
      `Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'REFUND_FAILED'
    )
  }
}

/**
 * Stripe service object for easier imports
 */
export const stripeService = {
  createCheckoutSession,
  verifyWebhookSignature,
  handlePaymentSuccess,
  handlePaymentFailure,
  refundPayment,
}
