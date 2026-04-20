import { NextRequest, NextResponse } from 'next/server'
import { stripeService } from '@/lib/services/stripeService'
import { cartService } from '@/lib/services/cartService'
import { shippingService } from '@/lib/services/shippingService'
import { securityCheck } from '@/lib/security'
import { logger } from '@/lib/logger'
import { isValidEmail } from '@/lib/utils/validation'
import type { CheckoutData, ShippingAddress, CartItem } from '@/types'

/**
 * Validate shipping address
 */
function validateShippingAddress(address: Partial<ShippingAddress>): string[] {
  const errors: string[] = []
  const requiredFields: (keyof ShippingAddress)[] = [
    'firstName',
    'lastName',
    'addressLine1',
    'city',
    'state',
    'postCode',
    'country',
    'phone',
  ]

  requiredFields.forEach((field) => {
    const value = address[field]
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(field)
    }
  })

  return errors
}

/**
 * Validate phone number format
 */
function isValidPhone(phone: string): boolean {
  // Allow digits, spaces, dashes, plus, parentheses
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  return phoneRegex.test(phone) && phone.trim().length >= 10
}

/**
 * POST /api/checkout - Create Stripe checkout session
 * 
 * Validates checkout data and creates a Stripe checkout session for payment processing.
 * 
 * Requirements: 6.2, 6.4, 7.1
 */
export async function POST(request: NextRequest) {
  try {
    // Apply security checks (CSRF, Rate Limiting)
    const securityError = await securityCheck(request)
    if (securityError) return securityError

    const body = await request.json()

    // Validate required fields
    if (!body.sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    if (!body.customerEmail) {
      return NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      )
    }

    if (!body.shippingAddress) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
        { status: 400 }
      )
    }

    // Validate email format (Requirement 6.2)
    if (!isValidEmail(body.customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate shipping address (Requirement 6.2)
    const addressErrors = validateShippingAddress(body.shippingAddress)
    if (addressErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid shipping address',
          details: {
            missingFields: addressErrors
          }
        },
        { status: 400 }
      )
    }

    // Validate phone number format
    if (!isValidPhone(body.shippingAddress.phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Get cart items from session
    const cart = await cartService.getCart(body.sessionId)

    console.log('[Checkout] Cart retrieved:', {
      sessionId: body.sessionId,
      itemCount: cart.items?.length || 0,
      items: cart.items
    })

    if (!cart.items || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      )
    }

    // Validate cart items
    for (const item of cart.items) {
      if (item.quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity for item ${item.productName}` },
          { status: 400 }
        )
      }
      if (item.price <= 0) {
        return NextResponse.json(
          { error: `Invalid price for item ${item.productName}` },
          { status: 400 }
        )
      }
    }

    // Get app URL for success/cancel URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Calculate shipping cost (Requirements 2.1, 2.2)
    let shippingCost: number
    try {
      // Extract product UIDs from cart items for shipping calculation
      const shippingItems = cart.items.map(item => ({
        productUid: item.productId, // Assuming productId is the Gelato product UID
        quantity: item.quantity
      }))

      const shippingQuote = await shippingService.getShippingCost({
        items: shippingItems,
        shippingAddress: {
          country: body.shippingAddress.country,
          state: body.shippingAddress.state,
          postCode: body.shippingAddress.postCode
        }
      })

      shippingCost = shippingQuote.cost

      console.log('[Checkout] Shipping cost calculated:', {
        cost: shippingCost,
        method: shippingQuote.method,
        estimatedDays: shippingQuote.estimatedDays
      })
    } catch (error) {
      // If shipping calculation fails, use fallback
      shippingCost = 10.00
      console.warn('[Checkout] Failed to calculate shipping cost, using fallback:', error)
    }

    // Create checkout session data
    const checkoutData = {
      cartItems: cart.items,
      customerEmail: body.customerEmail,
      shippingAddress: body.shippingAddress,
      successUrl: `${appUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/cart?cancelled=true`,
      shippingCost, // Pass shipping cost to Stripe service (Requirements 2.1, 2.2)
    }

    console.log('[Checkout] Creating Stripe session with data:', {
      itemCount: checkoutData.cartItems.length,
      customerEmail: checkoutData.customerEmail,
      hasShippingAddress: !!checkoutData.shippingAddress
    })

    // Create Stripe checkout session (Requirements 6.4, 7.1)
    const checkoutUrl = await stripeService.createCheckoutSession(checkoutData)

    return NextResponse.json({
      url: checkoutUrl,
      message: 'Checkout session created successfully'
    })

  } catch (error) {
    // Masked log for security
    logger.error('Error creating checkout session', error)

    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('Cart is empty')) {
        return NextResponse.json(
          { error: 'Cart is empty' },
          { status: 400 }
        )
      }

      if (error.message.includes('STRIPE_SECRET_KEY')) {
        return NextResponse.json(
          { error: 'Payment service configuration error' },
          { status: 500 }
        )
      }

      if (error.message.includes('Stripe API error')) {
        return NextResponse.json(
          { error: 'Payment service error' },
          { status: 502 }
        )
      }

      if (error.message.includes('Failed to fetch cart')) {
        return NextResponse.json(
          { error: 'Unable to retrieve cart' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}