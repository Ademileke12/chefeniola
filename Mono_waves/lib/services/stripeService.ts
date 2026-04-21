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
    apiVersion: '2024-11-20.acacia',
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
 * Requirements: 6.4, 7.1, 2.1, 2.3, 2.5
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
  
  // Validate shipping cost (Requirement 2.5)
  if (data.shippingCost === undefined || data.shippingCost === null) {
    throw new StripeServiceError('Shipping cost is required', 'INVALID_INPUT')
  }
  if (typeof data.shippingCost !== 'number' || isNaN(data.shippingCost) || !isFinite(data.shippingCost)) {
    throw new StripeServiceError('Shipping cost must be a valid number', 'INVALID_INPUT')
  }
  if (data.shippingCost < 0) {
    throw new StripeServiceError('Shipping cost cannot be negative', 'INVALID_INPUT')
  }

  const stripe = getStripeClient()

  try {
    // Convert cart items to Stripe line items
    const lineItems = data.cartItems.map(
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

    // Add shipping as a line item (Requirement 2.1)
    const shippingLineItem = {
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Shipping',
          description: 'Standard shipping (7-10 business days)',
        },
        unit_amount: Math.round(data.shippingCost * 100), // Convert to cents
      },
      quantity: 1,
    }

    // Combine product line items with shipping line item
    const allLineItems = [...lineItems, shippingLineItem]

    // Prepare metadata - aggressively minimize to stay under 500 char limit per field
    // Store only essential data needed for order creation
    const cartItemsForMetadata = data.cartItems.map(item => ({
      pid: item.productId, // Shortened key
      qty: item.quantity,  // Shortened key
      prc: item.price,     // Shortened key
    }))

    const shippingForMetadata = {
      fn: data.shippingAddress.firstName,
      ln: data.shippingAddress.lastName,
      a1: data.shippingAddress.addressLine1,
      a2: data.shippingAddress.addressLine2 || '',
      ct: data.shippingAddress.city,
      st: data.shippingAddress.state,
      pc: data.shippingAddress.postCode,
      co: data.shippingAddress.country,
      ph: data.shippingAddress.phone,
    }

    // Check metadata size and truncate if needed
    const cartItemsJson = JSON.stringify(cartItemsForMetadata)
    const shippingJson = JSON.stringify(shippingForMetadata)
    
    // Stripe has a 500 character limit per metadata value
    let finalCartItems: string
    if (cartItemsJson.length > 500) {
      console.warn('[StripeService] Cart items metadata exceeds 500 chars, truncating')
      // Store only count and total if too large
      const simplifiedCart = {
        count: data.cartItems.length,
        total: data.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      }
      finalCartItems = JSON.stringify(simplifiedCart)
    } else {
      finalCartItems = cartItemsJson
    }

    let finalShipping: string
    if (shippingJson.length > 500) {
      console.warn('[StripeService] Shipping metadata exceeds 500 chars, truncating')
      // Keep only essential fields
      const simplifiedShipping = {
        fn: data.shippingAddress.firstName,
        ln: data.shippingAddress.lastName,
        ct: data.shippingAddress.city,
        st: data.shippingAddress.state,
        co: data.shippingAddress.country,
      }
      finalShipping = JSON.stringify(simplifiedShipping)
    } else {
      finalShipping = shippingJson
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: allLineItems,
      customer_email: data.customerEmail,
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: {
        cartItems: finalCartItems,
        shippingAddress: finalShipping,
        shippingCost: data.shippingCost.toFixed(2), // Include shipping cost in metadata (Requirement 2.3)
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES'],
      },
      automatic_tax: {
        enabled: true,
      },
    })

    if (!session.url) {
      throw new StripeServiceError('Failed to create checkout session URL', 'SESSION_CREATION_FAILED')
    }

    return session.url
  } catch (error) {
    // Log the full error for debugging
    console.error('[StripeService] Checkout session creation failed:', error)
    
    if (error instanceof StripeServiceError) {
      throw error
    }

    if (error instanceof Stripe.errors.StripeError) {
      console.error('[StripeService] Stripe API error details:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        type: error.type,
        raw: error.raw
      })
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
  tax: number
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
    const cartItemsData = JSON.parse(metadata.cartItems)
    const shippingData = JSON.parse(metadata.shippingAddress)

    // Check if we have full cart data or simplified data
    let cartItems: CartItem[]
    if (Array.isArray(cartItemsData)) {
      // Full cart data with shortened keys
      cartItems = cartItemsData.map((item: any) => ({
        id: item.id || `${item.pid}-${Date.now()}`, // Generate ID if missing
        productId: item.pid || item.productId,
        productName: item.pn || item.productName || 'Product',
        size: item.sz || item.size || '',
        color: item.cl || item.color || '',
        quantity: item.qty || item.quantity || 1,
        price: item.prc || item.price || 0,
        imageUrl: '', // Not stored in metadata
      }))
    } else if (cartItemsData.count) {
      // Simplified cart data - we'll need to fetch full data from cart service
      // For now, create placeholder items
      console.warn('[StripeService] Cart metadata was truncated, using simplified data')
      cartItems = [{
        id: `placeholder-${Date.now()}`,
        productId: 'unknown',
        productName: 'Product',
        size: '',
        color: '',
        quantity: cartItemsData.count,
        price: cartItemsData.total / cartItemsData.count,
        imageUrl: '',
      }]
    } else {
      throw new Error('Invalid cart items format in metadata')
    }

    // Parse shipping address with both full and shortened keys
    const shippingAddress: ShippingAddress = {
      firstName: shippingData.fn || shippingData.firstName || '',
      lastName: shippingData.ln || shippingData.lastName || '',
      addressLine1: shippingData.a1 || shippingData.addressLine1 || '',
      addressLine2: shippingData.a2 || shippingData.addressLine2,
      city: shippingData.ct || shippingData.city || '',
      state: shippingData.st || shippingData.state || '',
      postCode: shippingData.pc || shippingData.postCode || '',
      country: shippingData.co || shippingData.country || '',
      phone: shippingData.ph || shippingData.phone || '',
    }

    // Calculate total from session amount
    const total = session.amount_total ? session.amount_total / 100 : 0
    
    // Extract tax amount from session
    const tax = session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0

    return {
      customerEmail: session.customer_email,
      stripePaymentId: session.payment_intent as string,
      stripeSessionId: session.id,
      cartItems,
      shippingAddress,
      tax,
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
