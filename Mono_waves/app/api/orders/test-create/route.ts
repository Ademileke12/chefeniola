/**
 * TEST ENDPOINT - Create test order
 * 
 * This endpoint allows you to manually create an order for testing
 * the confirmation page without going through the full Stripe flow.
 * 
 * DELETE THIS FILE IN PRODUCTION!
 */

import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/services/orderService'

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const sessionId = body.sessionId || 'cs_test_b1CTYbGE5bN8BjF1BbUWAOKqZna1gtNHrHIq5pyoiPyVfX7OSWt9EstiHQ'

    // Calculate costs
    const subtotal = 59.98 + 49.99 // 2 * 29.99 + 1 * 49.99
    const shippingCost = 10.00
    const tax = 8.50
    const total = subtotal + shippingCost + tax // 118.47

    // Create a test order
    const order = await orderService.createOrder({
      customerEmail: 'test@example.com',
      stripePaymentId: 'pi_test_' + Date.now(),
      stripeSessionId: sessionId,
      items: [
        {
          productId: 'test-product-1',
          productName: 'Test T-Shirt',
          size: 'M',
          color: 'Black',
          quantity: 2,
          price: 29.99,
          designUrl: 'https://example.com/design.png',
          gelatoProductUid: 'test-uid-123',
        },
        {
          productId: 'test-product-2',
          productName: 'Test Hoodie',
          size: 'L',
          color: 'White',
          quantity: 1,
          price: 49.99,
          designUrl: 'https://example.com/design2.png',
          gelatoProductUid: 'test-uid-456',
        },
      ],
      shippingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Test Street',
        addressLine2: 'Apt 4B',
        city: 'San Francisco',
        state: 'CA',
        postCode: '94102',
        country: 'US',
        phone: '+1 (555) 123-4567',
      },
      subtotal,
      shippingCost,
      tax,
      total,
    })

    return NextResponse.json({
      success: true,
      order,
      confirmationUrl: `/confirmation?session_id=${sessionId}`,
      message: 'Test order created successfully',
    })
  } catch (error) {
    console.error('Error creating test order:', error)
    return NextResponse.json(
      {
        error: 'Failed to create test order',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
