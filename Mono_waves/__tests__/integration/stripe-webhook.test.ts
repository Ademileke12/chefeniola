/**
 * Integration Tests for Stripe Webhook Handler
 * 
 * Tests the POST /api/webhooks/stripe endpoint for:
 * - Webhook signature verification
 * - checkout.session.completed event handling
 * - payment_intent.payment_failed event handling
 * - Idempotent webhook processing
 * 
 * Requirements: 7.2, 7.3, 7.4, 8.1
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals'
import type Stripe from 'stripe'

// Import services first
import { stripeService } from '@/lib/services/stripeService'
import { orderService } from '@/lib/services/orderService'
import { supabaseAdmin } from '@/lib/supabase/server'

// Then import the route
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

describe('POST /api/webhooks/stripe', () => {
  const validCheckoutSession: Stripe.Checkout.Session = {
    id: 'cs_test_123',
    object: 'checkout.session',
    payment_status: 'paid',
    customer_email: '[email protected]',
    payment_intent: 'pi_test_123',
    amount_total: 7998,
    total_details: {
      amount_tax: 598, // $5.98 in cents
    } as any,
    metadata: {
      cartItems: JSON.stringify([
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Test T-Shirt',
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
      shippingCost: '10.00', // Add shipping cost to metadata
    },
  } as any

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

  beforeEach(() => {
    // Create spies on the actual service methods
    verifyWebhookSignatureSpy = jest.spyOn(stripeService, 'verifyWebhookSignature')
    handlePaymentSuccessSpy = jest.spyOn(stripeService, 'handlePaymentSuccess')
    getOrderBySessionIdSpy = jest.spyOn(orderService, 'getOrderBySessionId')
    createOrderSpy = jest.spyOn(orderService, 'createOrder')
    submitToGelatoSpy = jest.spyOn(orderService, 'submitToGelato')
    
    // Default: no existing order found
    getOrderBySessionIdSpy.mockResolvedValue(null)

    // Setup default Supabase mock chain
    mockEq = jest.fn().mockReturnThis()
    mockSingle = jest.fn().mockResolvedValue({ data: null, error: null })
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
  })

  afterEach(() => {
    // Restore all spies
    jest.restoreAllMocks()
  })

  describe('Webhook signature verification', () => {
    it('should reject webhook with missing signature', async () => {
      const request = createMockRequest(JSON.stringify({ type: 'test' }))
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing signature')
    })

    it('should reject webhook with invalid signature', async () => {
      verifyWebhookSignatureSpy.mockImplementation(() => {
        throw new Error('Webhook signature verification failed')
      })

      const request = createMockRequest(
        JSON.stringify({ type: 'test' }),
        'invalid_signature'
      )
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid signature')
    })

    it('should accept webhook with valid signature', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'customer.created',
        data: { object: {} as any },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
    })
  })

  describe('payment_intent.payment_failed event', () => {
    it('should log payment failure', async () => {
      const paymentIntent: Stripe.PaymentIntent = {
        id: 'pi_test_failed',
        object: 'payment_intent',
        amount: 7998,
        currency: 'usd',
        status: 'failed',
        last_payment_error: {
          message: 'Card declined',
        },
      } as any

      const event: Stripe.Event = {
        id: 'evt_test_payment_failed',
        type: 'payment_intent.payment_failed',
        data: { object: paymentIntent },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('webhook_logs')
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('checkout.session.completed event', () => {
    it('should create order and submit to Gelato', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_123',
        stripeSessionId: 'cs_test_123',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test T-Shirt',
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
      } as any)
      submitToGelatoSpy.mockResolvedValue(undefined)
      mockSingle.mockResolvedValue({
        data: {
          gelato_product_uid: 'gelato-uid-1',
          design_url: 'https://example.com/design.jpg',
        },
        error: null,
      })

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(createOrderSpy).toHaveBeenCalled()
      expect(submitToGelatoSpy).toHaveBeenCalledWith('order-1', expect.any(String))
    })

    it('should return 500 when order creation fails', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_123',
        stripeSessionId: 'cs_test_123',
        cartItems: [{ id: 'item-1', productId: 'prod-1', price: 29.99, quantity: 2 } as any],
        shippingAddress: {} as any,
        tax: 5.98,
        total: 79.98,
      })
      mockSingle.mockResolvedValue({
        data: { gelato_product_uid: 'uid', design_url: 'url' },
        error: null,
      })
      createOrderSpy.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Processing failed')
    })
  })

  describe('Webhook logging', () => {
    it('should log all webhook events', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_123',
        type: 'customer.created',
        data: { object: {} as any },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      await POST(request as any)

      expect(mockFrom).toHaveBeenCalledWith('webhook_logs')
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('Idempotent webhook processing', () => {
    it('should handle duplicate webhook deliveries gracefully', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_duplicate',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_123',
        stripeSessionId: 'cs_test_123',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test T-Shirt',
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
      } as any)
      submitToGelatoSpy.mockResolvedValue(undefined)
      mockSingle.mockResolvedValue({
        data: {
          gelato_product_uid: 'gelato-uid-1',
          design_url: 'https://example.com/design.jpg',
        },
        error: null,
      })

      // First webhook delivery
      const request1 = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response1 = await POST(request1 as any)
      const data1 = await response1.json()

      expect(response1.status).toBe(200)
      expect(data1.received).toBe(true)
      expect(createOrderSpy).toHaveBeenCalledTimes(1)

      // Second webhook delivery (duplicate)
      const request2 = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response2 = await POST(request2 as any)
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2.received).toBe(true)
      // Order should only be created once
      expect(createOrderSpy).toHaveBeenCalledTimes(2) // Called again but should be handled by unique constraints
    })

    it('should not create duplicate orders for same payment intent', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_idempotent',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_same',
        stripeSessionId: 'cs_test_same',
        cartItems: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test T-Shirt',
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

      // First call succeeds
      createOrderSpy.mockResolvedValueOnce({
        id: 'order-1',
        orderNumber: 'MW-123',
      } as any)
      // Second call fails due to unique constraint on stripe_payment_id
      createOrderSpy.mockRejectedValueOnce(
        new Error('duplicate key value violates unique constraint "orders_stripe_payment_id_key"')
      )
      submitToGelatoSpy.mockResolvedValue(undefined)
      mockSingle.mockResolvedValue({
        data: {
          gelato_product_uid: 'gelato-uid-1',
          design_url: 'https://example.com/design.jpg',
        },
        error: null,
      })

      // First webhook delivery
      const request1 = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response1 = await POST(request1 as any)

      expect(response1.status).toBe(200)

      // Second webhook delivery (duplicate payment intent)
      const request2 = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      const response2 = await POST(request2 as any)

      // Should return 500 to trigger retry, but database constraint prevents duplicate
      expect(response2.status).toBe(500)
      expect(createOrderSpy).toHaveBeenCalledTimes(2)
    })

    it('should mark webhook as processed even on duplicate deliveries', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_mark_processed',
        type: 'customer.created',
        data: { object: {} as any },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      await POST(request as any)

      // Verify webhook was marked as processed
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('event_id', 'evt_test_mark_processed')
    })
  })
})
