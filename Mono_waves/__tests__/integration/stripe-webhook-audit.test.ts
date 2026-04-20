/**
 * Integration Tests for Stripe Webhook Audit Logging
 * 
 * Tests that audit events are properly logged for:
 * - webhook.received
 * - webhook.signature_verified / webhook.signature_failed
 * - payment.completed
 * - order.created
 * - order.submitted_to_gelato / order.gelato_submission_failed
 * - payment.failed
 * 
 * Requirements: 1.8, 4.1-4.5
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals'
import type Stripe from 'stripe'

// Import services
import { stripeService } from '@/lib/services/stripeService'
import { orderService } from '@/lib/services/orderService'
import { auditService } from '@/lib/services/auditService'
import { supabaseAdmin } from '@/lib/supabase/server'

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

describe('Stripe Webhook Audit Logging', () => {
  const validCheckoutSession: Stripe.Checkout.Session = {
    id: 'cs_test_audit_123',
    object: 'checkout.session',
    payment_status: 'paid',
    customer_email: '[email protected]',
    payment_intent: 'pi_test_audit_123',
    amount_total: 7998,
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
  let createOrderSpy: jest.SpiedFunction<typeof orderService.createOrder>
  let submitToGelatoSpy: jest.SpiedFunction<typeof orderService.submitToGelato>
  let auditLogEventSpy: jest.SpiedFunction<typeof auditService.logEvent>

  beforeEach(() => {
    // Create spies
    verifyWebhookSignatureSpy = jest.spyOn(stripeService, 'verifyWebhookSignature')
    handlePaymentSuccessSpy = jest.spyOn(stripeService, 'handlePaymentSuccess')
    createOrderSpy = jest.spyOn(orderService, 'createOrder')
    submitToGelatoSpy = jest.spyOn(orderService, 'submitToGelato')
    auditLogEventSpy = jest.spyOn(auditService, 'logEvent')

    // Setup Supabase mock chain
    mockEq = jest.fn().mockReturnThis()
    mockSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
      single: mockSingle,
    })
    mockUpdate = jest.fn().mockReturnValue({
      eq: mockEq,
    })
    mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
    mockFrom = jest.fn().mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
    })

    ;(supabaseAdmin.from as any) = mockFrom
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('webhook.received event', () => {
    it('should log webhook.received event with correlation ID', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_received',
        type: 'customer.created',
        data: { object: {} as any },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      await POST(request as any)

      // Verify webhook.received was logged
      expect(auditLogEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'webhook.received',
          severity: 'info',
          source: 'stripe',
          metadata: expect.objectContaining({
            hasSignature: true,
            bodyLength: expect.any(Number),
          }),
        })
      )
    })
  })

  describe('webhook.signature_verified event', () => {
    it('should log successful signature verification', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_verified',
        type: 'customer.created',
        data: { object: {} as any },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      await POST(request as any)

      // Verify signature verification was logged
      expect(auditLogEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'webhook.signature_verified',
          severity: 'info',
          source: 'stripe',
          metadata: expect.objectContaining({
            eventId: 'evt_test_verified',
            eventType: 'customer.created',
          }),
        })
      )
    })
  })

  describe('webhook.signature_failed event', () => {
    it('should log missing signature with security flag', async () => {
      const request = createMockRequest(JSON.stringify({ type: 'test' }))
      await POST(request as any)

      // Verify signature failure was logged
      expect(auditLogEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'webhook.signature_failed',
          severity: 'error',
          source: 'stripe',
          metadata: expect.objectContaining({
            reason: 'Missing signature header',
          }),
          securityFlags: ['MISSING_SIGNATURE'],
        })
      )
    })

    it('should log invalid signature with security flag', async () => {
      verifyWebhookSignatureSpy.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const request = createMockRequest(
        JSON.stringify({ type: 'test' }),
        'invalid_signature'
      )
      await POST(request as any)

      // Verify signature failure was logged
      expect(auditLogEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'webhook.signature_failed',
          severity: 'error',
          source: 'stripe',
          metadata: expect.objectContaining({
            reason: 'Invalid signature',
            error: 'Invalid signature',
          }),
          securityFlags: ['INVALID_SIGNATURE'],
        })
      )
    })
  })

  describe('payment.completed event', () => {
    it('should log payment completion with payment details', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_payment',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_audit_123',
        stripeSessionId: 'cs_test_audit_123',
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
      await POST(request as any)

      // Verify payment.completed was logged
      expect(auditLogEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'payment.completed',
          severity: 'info',
          source: 'stripe',
          metadata: expect.objectContaining({
            sessionId: 'cs_test_audit_123',
            paymentIntentId: 'pi_test_audit_123',
            customerEmail: '[email protected]',
            amount: 79.98,
            currency: 'usd',
            itemCount: 1,
          }),
        })
      )
    })
  })

  describe('order.created event', () => {
    it('should log order creation with order details', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_order',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_audit_123',
        stripeSessionId: 'cs_test_audit_123',
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
        total: 79.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-audit-1',
        orderNumber: 'MW-AUDIT-123',
        customerEmail: '[email protected]',
        total: 79.98,
        items: [{ id: 'item-1' }],
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
      await POST(request as any)

      // Verify order.created was logged
      expect(auditLogEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.created',
          severity: 'info',
          source: 'stripe',
          metadata: expect.objectContaining({
            orderId: 'order-audit-1',
            orderNumber: 'MW-AUDIT-123',
            customerEmail: '[email protected]',
            total: 79.98,
            itemCount: 1,
            sessionId: 'cs_test_audit_123',
          }),
        })
      )
    })
  })

  describe('order.submitted_to_gelato event', () => {
    it('should log successful Gelato submission', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_gelato',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_audit_123',
        stripeSessionId: 'cs_test_audit_123',
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
        total: 79.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-gelato-1',
        orderNumber: 'MW-GELATO-123',
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
      await POST(request as any)

      // Verify order.submitted_to_gelato was logged
      expect(auditLogEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.submitted_to_gelato',
          severity: 'info',
          source: 'gelato',
          metadata: expect.objectContaining({
            orderId: 'order-gelato-1',
            orderNumber: 'MW-GELATO-123',
          }),
        })
      )
    })
  })

  describe('order.gelato_submission_failed event', () => {
    it('should log Gelato submission failure with error details', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_gelato_fail',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_audit_123',
        stripeSessionId: 'cs_test_audit_123',
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
        total: 79.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-fail-1',
        orderNumber: 'MW-FAIL-123',
      } as any)
      submitToGelatoSpy.mockRejectedValue(new Error('Gelato API error'))
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
      await POST(request as any)

      // Verify order.gelato_submission_failed was logged
      expect(auditLogEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order.gelato_submission_failed',
          severity: 'error',
          source: 'gelato',
          metadata: expect.objectContaining({
            orderId: 'order-fail-1',
            orderNumber: 'MW-FAIL-123',
            error: 'Gelato API error',
          }),
        })
      )
    })
  })

  describe('payment.failed event', () => {
    it('should log payment failure with error context', async () => {
      const paymentIntent: Stripe.PaymentIntent = {
        id: 'pi_test_failed_audit',
        object: 'payment_intent',
        amount: 7998,
        currency: 'usd',
        status: 'failed',
        last_payment_error: {
          code: 'card_declined',
          message: 'Your card was declined',
        },
      } as any

      const event: Stripe.Event = {
        id: 'evt_test_payment_failed_audit',
        type: 'payment_intent.payment_failed',
        data: { object: paymentIntent },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      await POST(request as any)

      // Verify payment.failed was logged
      expect(auditLogEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'payment.failed',
          severity: 'error',
          source: 'stripe',
          metadata: expect.objectContaining({
            paymentIntentId: 'pi_test_failed_audit',
            amount: 79.98,
            currency: 'usd',
            status: 'failed',
            errorCode: 'card_declined',
            errorMessage: 'Your card was declined',
          }),
        })
      )
    })
  })

  describe('Error handling with audit logging', () => {
    it('should log errors with full context when order creation fails', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_error',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_audit_123',
        stripeSessionId: 'cs_test_audit_123',
        cartItems: [{ id: 'item-1', productId: 'prod-1' } as any],
        shippingAddress: {} as any,
        total: 79.98,
      })
      mockSingle.mockResolvedValue({
        data: { gelato_product_uid: 'uid', design_url: 'url' },
        error: null,
      })
      createOrderSpy.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest(
        JSON.stringify(event),
        'valid_signature'
      )
      await POST(request as any)

      // Verify error was logged with full context
      expect(auditLogEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'payment.failed',
          severity: 'error',
          source: 'stripe',
          metadata: expect.objectContaining({
            sessionId: 'cs_test_audit_123',
            customerEmail: '[email protected]',
            error: 'Database connection failed',
            stack: expect.any(String),
          }),
        })
      )
    })
  })

  describe('Correlation ID tracking', () => {
    it('should use same correlation ID for all events in webhook processing', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_correlation',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(event)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_audit_123',
        stripeSessionId: 'cs_test_audit_123',
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
      await POST(request as any)

      // Get all correlation IDs from audit log calls
      const correlationIds = auditLogEventSpy.mock.calls.map(
        (call) => call[0].correlationId
      )

      // All correlation IDs should be the same
      expect(correlationIds.length).toBeGreaterThan(0)
      const firstCorrelationId = correlationIds[0]
      expect(correlationIds.every((id) => id === firstCorrelationId)).toBe(true)
    })
  })
})
