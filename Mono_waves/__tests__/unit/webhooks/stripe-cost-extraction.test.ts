/**
 * Unit Tests for Stripe Webhook Cost Extraction
 * 
 * Tests the cost extraction logic in the webhook handler:
 * - Shipping cost extraction from metadata (Requirement 3.1)
 * - Tax extraction from total_details (Requirement 2.4)
 * - Total validation logic (Requirement 3.3)
 * - Logging of cost components (Requirement 5.2)
 * 
 * Requirements: 3.1, 3.3, 5.2
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals'
import type Stripe from 'stripe'

// Import services
import { stripeService } from '@/lib/services/stripeService'
import { orderService } from '@/lib/services/orderService'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Import the route
import { POST } from '@/app/api/webhooks/stripe/route'

/**
 * Helper to create mock request
 */
function createMockRequest(body: string, signature?: string): Request {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (signature) {
    headers.set('stripe-signature', signature)
  }
  
  return new Request('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body,
  })
}

/**
 * Helper to create checkout session with cost components
 */
function createCheckoutSession(
  shippingCost?: string,
  amountTax?: number,
  amountTotal?: number
): Stripe.Checkout.Session {
  return {
    id: 'cs_test_cost_extraction',
    object: 'checkout.session',
    payment_status: 'paid',
    customer_email: '[email protected]',
    payment_intent: 'pi_test_cost',
    amount_total: amountTotal ?? 7998, // Default $79.98
    total_details: amountTax !== undefined ? {
      amount_tax: amountTax,
    } as any : undefined,
    metadata: shippingCost !== undefined ? {
      cartItems: JSON.stringify([
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Test Product',
          size: 'M',
          color: 'Blue',
          quantity: 2,
          price: 29.99,
          imageUrl: 'https://example.com/image.jpg',
        },
      ]),
      shippingAddress: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postCode: '10001',
        country: 'US',
        phone: '+1-555-123-4567',
      }),
      shippingCost,
    } : {
      cartItems: JSON.stringify([
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Test Product',
          size: 'M',
          color: 'Blue',
          quantity: 2,
          price: 29.99,
          imageUrl: 'https://example.com/image.jpg',
        },
      ]),
      shippingAddress: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postCode: '10001',
        country: 'US',
        phone: '+1-555-123-4567',
      }),
    },
  } as any
}

describe('Stripe Webhook Cost Extraction', () => {
  // Shared mock references
  let mockFrom: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockSelect: jest.Mock
  let mockEq: jest.Mock
  let mockSingle: jest.Mock

  // Spy references
  let verifyWebhookSignatureSpy: jest.SpiedFunction<typeof stripeService.verifyWebhookSignature>
  let handlePaymentSuccessSpy: jest.SpiedFunction<typeof stripeService.handlePaymentSuccess>
  let getOrderBySessionIdSpy: jest.SpiedFunction<typeof orderService.getOrderBySessionId>
  let createOrderSpy: jest.SpiedFunction<typeof orderService.createOrder>
  let submitToGelatoSpy: jest.SpiedFunction<typeof orderService.submitToGelato>
  let loggerErrorSpy: jest.SpiedFunction<typeof logger.error>

  beforeEach(() => {
    // Create spies on the actual service methods
    verifyWebhookSignatureSpy = jest.spyOn(stripeService, 'verifyWebhookSignature')
    handlePaymentSuccessSpy = jest.spyOn(stripeService, 'handlePaymentSuccess')
    getOrderBySessionIdSpy = jest.spyOn(orderService, 'getOrderBySessionId')
    createOrderSpy = jest.spyOn(orderService, 'createOrder')
    submitToGelatoSpy = jest.spyOn(orderService, 'submitToGelato')
    loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    
    // Default: no existing order found
    getOrderBySessionIdSpy.mockResolvedValue(null)

    // Setup default Supabase mock chain
    mockEq = jest.fn().mockReturnThis()
    mockSingle = jest.fn().mockResolvedValue({ 
      data: {
        gelato_product_uid: 'gelato-uid-1',
        design_url: 'https://example.com/design.jpg',
      }, 
      error: null 
    })
    mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
      single: mockSingle,
    })
    mockUpdate = jest.fn().mockReturnValue({
      eq: mockEq,
    })
    mockInsert = jest.fn().mockReturnValue({
      select: mockSelect,
    })
    mockFrom = jest.fn().mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
    })

    ;(supabaseAdmin.from as any) = mockFrom

    // Mock submitToGelato to avoid actual API calls
    submitToGelatoSpy.mockResolvedValue(undefined)
  })

  afterEach(() => {
    // Restore all spies
    jest.restoreAllMocks()
  })

  describe('Shipping cost extraction from metadata (Requirement 3.1)', () => {
    it('should extract shipping cost from session metadata', async () => {
      const session = createCheckoutSession('15.00', 598, 7998)
      const event: Stripe.Event = {
        id: 'evt_test_shipping',
        type: 'checkout.session.completed',
        data: { object: session },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_cost',
        stripeSessionId: 'cs_test_cost_extraction',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            size: 'M',
            color: 'Blue',
            quantity: 2,
            price: 29.99,
            imageUrl: 'https://example.com/image.jpg',
          },
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '+1-555-123-4567',
        },
        tax: 5.98,
        total: 79.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'MW-123',
        stripeSessionId: 'cs_test_cost_extraction',
      } as any)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          shippingCost: 15.00,
        })
      )
    })

    it('should use default shipping cost when metadata is missing', async () => {
      const session = createCheckoutSession(undefined, 598, 7998)
      const event: Stripe.Event = {
        id: 'evt_test_default_shipping',
        type: 'checkout.session.completed',
        data: { object: session },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_cost',
        stripeSessionId: 'cs_test_cost_extraction',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            size: 'M',
            color: 'Blue',
            quantity: 2,
            price: 29.99,
            imageUrl: 'https://example.com/image.jpg',
          },
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '+1-555-123-4567',
        },
        tax: 5.98,
        total: 79.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'MW-123',
        stripeSessionId: 'cs_test_cost_extraction',
      } as any)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          shippingCost: 10.00, // Default fallback
        })
      )
    })

    it('should handle zero shipping cost', async () => {
      const session = createCheckoutSession('0.00', 598, 6598)
      const event: Stripe.Event = {
        id: 'evt_test_zero_shipping',
        type: 'checkout.session.completed',
        data: { object: session },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_cost',
        stripeSessionId: 'cs_test_cost_extraction',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            size: 'M',
            color: 'Blue',
            quantity: 2,
            price: 29.99,
            imageUrl: 'https://example.com/image.jpg',
          },
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '+1-555-123-4567',
        },
        tax: 5.98,
        total: 65.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'MW-123',
        stripeSessionId: 'cs_test_cost_extraction',
      } as any)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          shippingCost: 0.00,
        })
      )
    })
  })

  describe('Tax extraction from total_details (Requirement 2.4)', () => {
    it('should extract tax from session total_details', async () => {
      const session = createCheckoutSession('10.00', 598, 7998) // $5.98 tax
      const event: Stripe.Event = {
        id: 'evt_test_tax',
        type: 'checkout.session.completed',
        data: { object: session },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_cost',
        stripeSessionId: 'cs_test_cost_extraction',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            size: 'M',
            color: 'Blue',
            quantity: 2,
            price: 29.99,
            imageUrl: 'https://example.com/image.jpg',
          },
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '+1-555-123-4567',
        },
        tax: 5.98,
        total: 79.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'MW-123',
        stripeSessionId: 'cs_test_cost_extraction',
      } as any)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tax: 5.98,
        })
      )
    })

    it('should use zero tax when total_details is missing', async () => {
      const session = createCheckoutSession('10.00', undefined, 7000)
      const event: Stripe.Event = {
        id: 'evt_test_no_tax',
        type: 'checkout.session.completed',
        data: { object: session },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_cost',
        stripeSessionId: 'cs_test_cost_extraction',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            size: 'M',
            color: 'Blue',
            quantity: 2,
            price: 29.99,
            imageUrl: 'https://example.com/image.jpg',
          },
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '+1-555-123-4567',
        },
        tax: 5.98,
        total: 70.00,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'MW-123',
        stripeSessionId: 'cs_test_cost_extraction',
      } as any)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tax: 0,
        })
      )
    })

    it('should convert tax from cents to dollars', async () => {
      const session = createCheckoutSession('10.00', 1250, 8250) // $12.50 tax
      const event: Stripe.Event = {
        id: 'evt_test_tax_conversion',
        type: 'checkout.session.completed',
        data: { object: session },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_cost',
        stripeSessionId: 'cs_test_cost_extraction',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            size: 'M',
            color: 'Blue',
            quantity: 2,
            price: 29.99,
            imageUrl: 'https://example.com/image.jpg',
          },
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '+1-555-123-4567',
        },
        tax: 12.50,
        total: 82.50,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'MW-123',
        stripeSessionId: 'cs_test_cost_extraction',
      } as any)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tax: 12.50,
        })
      )
    })
  })

  describe('Total validation logic (Requirement 3.3)', () => {
    it('should validate total matches calculated total within tolerance', async () => {
      // subtotal: 59.98, shipping: 10.00, tax: 5.98 = 75.96
      // Stripe total: 75.96 (7596 cents)
      const session = createCheckoutSession('10.00', 598, 7596)
      const event: Stripe.Event = {
        id: 'evt_test_valid_total',
        type: 'checkout.session.completed',
        data: { object: session },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_cost',
        stripeSessionId: 'cs_test_cost_extraction',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            size: 'M',
            color: 'Blue',
            quantity: 2,
            price: 29.99,
            imageUrl: 'https://example.com/image.jpg',
          },
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '+1-555-123-4567',
        },
        tax: 5.98,
        total: 75.96,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'MW-123',
        stripeSessionId: 'cs_test_cost_extraction',
      } as any)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(loggerErrorSpy).not.toHaveBeenCalledWith(
        'Total mismatch detected',
        expect.any(Object)
      )
    })

    it('should log warning when total mismatch exceeds tolerance', async () => {
      // subtotal: 59.98, shipping: 10.00, tax: 5.98 = 75.96
      // Stripe total: 80.00 (mismatch > 1 cent)
      const session = createCheckoutSession('10.00', 598, 8000)
      const event: Stripe.Event = {
        id: 'evt_test_mismatch',
        type: 'checkout.session.completed',
        data: { object: session },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_cost',
        stripeSessionId: 'cs_test_cost_extraction',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            size: 'M',
            color: 'Blue',
            quantity: 2,
            price: 29.99,
            imageUrl: 'https://example.com/image.jpg',
          },
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '+1-555-123-4567',
        },
        tax: 5.98,
        total: 80.00,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'MW-123',
        stripeSessionId: 'cs_test_cost_extraction',
      } as any)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Total mismatch detected',
        expect.objectContaining({
          sessionId: 'cs_test_cost_extraction',
          calculated: expect.any(Number),
          stripe: 80.00,
        })
      )
    })

    it('should use Stripe total as source of truth despite mismatch', async () => {
      // Even with mismatch, should use Stripe's total
      const session = createCheckoutSession('10.00', 598, 8000)
      const event: Stripe.Event = {
        id: 'evt_test_stripe_total',
        type: 'checkout.session.completed',
        data: { object: session },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_cost',
        stripeSessionId: 'cs_test_cost_extraction',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            size: 'M',
            color: 'Blue',
            quantity: 2,
            price: 29.99,
            imageUrl: 'https://example.com/image.jpg',
          },
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '+1-555-123-4567',
        },
        tax: 5.98,
        total: 80.00,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'MW-123',
        stripeSessionId: 'cs_test_cost_extraction',
      } as any)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 80.00, // Uses Stripe's total
        })
      )
    })
  })

  describe('Logging of cost components (Requirement 5.2)', () => {
    it('should log all cost components with session ID', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
      
      const session = createCheckoutSession('15.00', 750, 8250)
      const event: Stripe.Event = {
        id: 'evt_test_logging',
        type: 'checkout.session.completed',
        data: { object: session },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_cost',
        stripeSessionId: 'cs_test_cost_extraction',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            size: 'M',
            color: 'Blue',
            quantity: 2,
            price: 29.99,
            imageUrl: 'https://example.com/image.jpg',
          },
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '+1-555-123-4567',
        },
        tax: 7.50,
        total: 82.50,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'MW-123',
        stripeSessionId: 'cs_test_cost_extraction',
      } as any)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      await POST(request as any)

      // Verify shipping cost logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Shipping cost extracted:',
        15.00,
        'from session:',
        'cs_test_cost_extraction'
      )

      // Verify tax logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Tax extracted:',
        7.50
      )

      // Verify cost components logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Cost components:',
        expect.objectContaining({
          sessionId: 'cs_test_cost_extraction',
          correlationId: expect.any(String),
          subtotal: expect.any(Number),
          shippingCost: 15.00,
          tax: 7.50,
          calculatedTotal: expect.any(Number),
          stripeTotal: 82.50,
        })
      )

      consoleLogSpy.mockRestore()
    })

    it('should log correlation ID with cost components', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
      
      const session = createCheckoutSession('10.00', 598, 7998)
      const event: Stripe.Event = {
        id: 'evt_test_correlation',
        type: 'checkout.session.completed',
        data: { object: session },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_cost',
        stripeSessionId: 'cs_test_cost_extraction',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            size: 'M',
            color: 'Blue',
            quantity: 2,
            price: 29.99,
            imageUrl: 'https://example.com/image.jpg',
          },
        ],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postCode: '10001',
          country: 'US',
          phone: '+1-555-123-4567',
        },
        tax: 5.98,
        total: 79.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'MW-123',
        stripeSessionId: 'cs_test_cost_extraction',
      } as any)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      await POST(request as any)

      // Verify correlation ID is logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Correlation ID:',
        expect.stringMatching(/^[a-f0-9-]+$/)
      )

      consoleLogSpy.mockRestore()
    })
  })
})
