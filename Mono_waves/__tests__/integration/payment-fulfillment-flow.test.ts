/**
 * Integration Tests: Payment to Fulfillment Flow
 * 
 * Tests the complete order flow from payment to Gelato submission to tracking delivery:
 * - Checkout → Payment → Order Creation → Gelato Submission → Tracking
 * - Gelato submission failure handling and retry logic
 * - Idempotency checks for duplicate payments
 * - Email notifications (confirmation and shipping)
 * 
 * Task: 6.1 Write payment flow integration tests
 * Requirements: 1.1-1.8, 2.1-2.8, 3.1-3.7
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals'
import type Stripe from 'stripe'
import { POST as stripeWebhook } from '@/app/api/webhooks/stripe/route'
import { POST as gelatoWebhook } from '@/app/api/webhooks/gelato/route'
import { stripeService } from '@/lib/services/stripeService'
import { orderService } from '@/lib/services/orderService'
import { gelatoService } from '@/lib/services/gelatoService'
import { emailService } from '@/lib/services/emailService'
import { supabaseAdmin } from '@/lib/supabase/server'
import crypto from 'crypto'

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

/**
 * Helper to create mock Stripe webhook request
 */
function createStripeRequest(body: string, signature?: string): Request {
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
 * Helper to create mock Gelato webhook request
 */
function createGelatoRequest(payload: any, secret: string = 'test-secret'): Request {
  const body = JSON.stringify(payload)
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const signature = hmac.digest('hex')
  
  const headers = new Headers({ 'content-type': 'application/json' })
  headers.set('x-gelato-signature', signature)
  
  return new Request('http://localhost:3000/api/webhooks/gelato', {
    method: 'POST',
    headers,
    body,
  })
}

describe('Payment to Fulfillment Flow Integration Tests', () => {
  // Shared mock references
  let mockFrom: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockSelect: jest.Mock
  let mockEq: jest.Mock
  let mockSingle: jest.Mock
  let mockLimit: jest.Mock

  // Spy references
  let verifyWebhookSignatureSpy: jest.SpiedFunction<typeof stripeService.verifyWebhookSignature>
  let handlePaymentSuccessSpy: jest.SpiedFunction<typeof stripeService.handlePaymentSuccess>
  let createOrderSpy: jest.SpiedFunction<typeof orderService.createOrder>
  let submitToGelatoSpy: jest.SpiedFunction<typeof orderService.submitToGelato>
  let updateOrderStatusSpy: jest.SpiedFunction<typeof orderService.updateOrderStatus>
  let sendOrderConfirmationSpy: jest.SpiedFunction<typeof emailService.sendOrderConfirmation>
  let sendShippingNotificationSpy: jest.SpiedFunction<typeof emailService.sendShippingNotification>

  const validCheckoutSession: Stripe.Checkout.Session = {
    id: 'cs_test_flow_123',
    object: 'checkout.session',
    payment_status: 'paid',
    customer_email: '[email protected]',
    payment_intent: 'pi_test_flow_123',
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

  beforeEach(() => {
    // Create spies
    verifyWebhookSignatureSpy = jest.spyOn(stripeService, 'verifyWebhookSignature')
    handlePaymentSuccessSpy = jest.spyOn(stripeService, 'handlePaymentSuccess')
    createOrderSpy = jest.spyOn(orderService, 'createOrder')
    submitToGelatoSpy = jest.spyOn(orderService, 'submitToGelato')
    updateOrderStatusSpy = jest.spyOn(orderService, 'updateOrderStatus')
    sendOrderConfirmationSpy = jest.spyOn(emailService, 'sendOrderConfirmation')
    sendShippingNotificationSpy = jest.spyOn(emailService, 'sendShippingNotification')

    // Setup Supabase mock chain
    mockEq = jest.fn().mockReturnThis()
    mockSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    mockLimit = jest.fn().mockResolvedValue({ data: [], error: null })
    mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      limit: mockLimit,
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

    // Set environment variable
    process.env.GELATO_WEBHOOK_SECRET = 'test-secret'
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Complete Order Flow: Checkout → Payment → Order → Gelato → Tracking', () => {
    it('should process complete flow from payment to tracking delivery', async () => {
      // Step 1: Stripe webhook - checkout.session.completed
      const stripeEvent: Stripe.Event = {
        id: 'evt_test_complete_flow',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(stripeEvent)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_flow_123',
        stripeSessionId: 'cs_test_flow_123',
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
        id: 'order-flow-1',
        orderNumber: 'MW-FLOW-001',
        customerEmail: '[email protected]',
        status: 'payment_confirmed',
      } as any)
      submitToGelatoSpy.mockResolvedValue(undefined)
      sendOrderConfirmationSpy.mockResolvedValue(undefined)
      mockSingle.mockResolvedValue({
        data: {
          gelato_product_uid: 'gelato-uid-1',
          design_url: 'https://example.com/design.jpg',
        },
        error: null,
      })

      const stripeRequest = createStripeRequest(
        JSON.stringify(stripeEvent),
        'valid_signature'
      )
      const stripeResponse = await stripeWebhook(stripeRequest as any)
      const stripeData = await stripeResponse.json()

      // Verify payment processing
      expect(stripeResponse.status).toBe(200)
      expect(stripeData.received).toBe(true)
      expect(createOrderSpy).toHaveBeenCalled()
      expect(submitToGelatoSpy).toHaveBeenCalledWith('order-flow-1')
      expect(sendOrderConfirmationSpy).toHaveBeenCalled()

      // Step 2: Gelato webhook - order.shipped
      const gelatoPayload = {
        eventType: 'order.shipped',
        eventId: 'evt_gelato_shipped',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_123',
          orderReferenceId: 'MW-FLOW-001',
          status: 'shipped',
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        },
      }

      mockLimit.mockResolvedValue({
        data: [{ id: 'order-flow-1' }],
        error: null,
      })
      updateOrderStatusSpy.mockResolvedValue({
        id: 'order-flow-1',
        status: 'shipped',
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
      } as any)
      sendShippingNotificationSpy.mockResolvedValue(undefined)

      const gelatoRequest = createGelatoRequest(gelatoPayload)
      const gelatoResponse = await gelatoWebhook(gelatoRequest as any)
      const gelatoData = await gelatoResponse.json()

      // Verify tracking delivery
      expect(gelatoResponse.status).toBe(200)
      expect(gelatoData.received).toBe(true)
      expect(updateOrderStatusSpy).toHaveBeenCalledWith(
        'order-flow-1',
        'shipped',
        {
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        }
      )
      expect(sendShippingNotificationSpy).toHaveBeenCalled()
    })

    it('should send confirmation email after order creation', async () => {
      const stripeEvent: Stripe.Event = {
        id: 'evt_test_email_confirm',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(stripeEvent)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_email',
        stripeSessionId: 'cs_test_email',
        cartItems: [{ id: 'item-1', productId: 'prod-1' } as any],
        shippingAddress: {} as any,
        total: 79.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-email-1',
        orderNumber: 'MW-EMAIL-001',
        customerEmail: '[email protected]',
      } as any)
      submitToGelatoSpy.mockResolvedValue(undefined)
      sendOrderConfirmationSpy.mockResolvedValue(undefined)
      mockSingle.mockResolvedValue({
        data: { gelato_product_uid: 'uid', design_url: 'url' },
        error: null,
      })

      const request = createStripeRequest(
        JSON.stringify(stripeEvent),
        'valid_signature'
      )
      await stripeWebhook(request as any)

      expect(sendOrderConfirmationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'order-email-1',
          orderNumber: 'MW-EMAIL-001',
          customerEmail: '[email protected]',
        })
      )
    })

    it('should send tracking email when order ships', async () => {
      const gelatoPayload = {
        eventType: 'order.shipped',
        eventId: 'evt_tracking_email',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_456',
          orderReferenceId: 'MW-TRACK-001',
          status: 'shipped',
          trackingNumber: '1Z999AA10123456785',
          carrier: 'FedEx',
        },
      }

      mockLimit.mockResolvedValue({
        data: [{ id: 'order-track-1', customerEmail: '[email protected]' }],
        error: null,
      })
      updateOrderStatusSpy.mockResolvedValue({
        id: 'order-track-1',
        status: 'shipped',
        trackingNumber: '1Z999AA10123456785',
        carrier: 'FedEx',
        customerEmail: '[email protected]',
      } as any)
      sendShippingNotificationSpy.mockResolvedValue(undefined)

      const request = createGelatoRequest(gelatoPayload)
      await gelatoWebhook(request as any)

      expect(sendShippingNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'order-track-1',
          status: 'shipped',
          trackingNumber: '1Z999AA10123456785',
          carrier: 'FedEx',
        })
      )
    })
  })

  describe('Gelato Submission Failure Handling', () => {
    it('should handle Gelato submission failure gracefully', async () => {
      const stripeEvent: Stripe.Event = {
        id: 'evt_gelato_fail',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(stripeEvent)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_fail',
        stripeSessionId: 'cs_test_fail',
        cartItems: [{ id: 'item-1', productId: 'prod-1' } as any],
        shippingAddress: {} as any,
        total: 79.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-fail-1',
        orderNumber: 'MW-FAIL-001',
      } as any)
      submitToGelatoSpy.mockRejectedValue(new Error('Gelato API error'))
      sendOrderConfirmationSpy.mockResolvedValue(undefined)
      mockSingle.mockResolvedValue({
        data: { gelato_product_uid: 'uid', design_url: 'url' },
        error: null,
      })

      const request = createStripeRequest(
        JSON.stringify(stripeEvent),
        'valid_signature'
      )
      const response = await stripeWebhook(request as any)

      // Order should still be created even if Gelato submission fails
      expect(createOrderSpy).toHaveBeenCalled()
      expect(submitToGelatoSpy).toHaveBeenCalled()
      // Webhook should return 500 to trigger retry
      expect(response.status).toBe(500)
    })

    it('should handle missing product UID validation error', async () => {
      const stripeEvent: Stripe.Event = {
        id: 'evt_missing_uid',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(stripeEvent)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_uid',
        stripeSessionId: 'cs_test_uid',
        cartItems: [{ id: 'item-1', productId: 'prod-1' } as any],
        shippingAddress: {} as any,
        total: 79.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-uid-1',
        orderNumber: 'MW-UID-001',
      } as any)
      submitToGelatoSpy.mockRejectedValue(
        new Error('Product missing gelato_product_uid')
      )
      sendOrderConfirmationSpy.mockResolvedValue(undefined)
      mockSingle.mockResolvedValue({
        data: { gelato_product_uid: null, design_url: 'url' },
        error: null,
      })

      const request = createStripeRequest(
        JSON.stringify(stripeEvent),
        'valid_signature'
      )
      const response = await stripeWebhook(request as any)

      expect(submitToGelatoSpy).toHaveBeenCalled()
      expect(response.status).toBe(500)
    })

    it('should handle invalid design URL error', async () => {
      const stripeEvent: Stripe.Event = {
        id: 'evt_invalid_url',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(stripeEvent)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_url',
        stripeSessionId: 'cs_test_url',
        cartItems: [{ id: 'item-1', productId: 'prod-1' } as any],
        shippingAddress: {} as any,
        total: 79.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-url-1',
        orderNumber: 'MW-URL-001',
      } as any)
      submitToGelatoSpy.mockRejectedValue(
        new Error('Invalid design URL')
      )
      sendOrderConfirmationSpy.mockResolvedValue(undefined)
      mockSingle.mockResolvedValue({
        data: { gelato_product_uid: 'uid', design_url: null },
        error: null,
      })

      const request = createStripeRequest(
        JSON.stringify(stripeEvent),
        'valid_signature'
      )
      const response = await stripeWebhook(request as any)

      expect(submitToGelatoSpy).toHaveBeenCalled()
      expect(response.status).toBe(500)
    })
  })

  describe('Idempotency: Duplicate Payment Prevention', () => {
    it('should not create duplicate orders for same payment session', async () => {
      const stripeEvent: Stripe.Event = {
        id: 'evt_duplicate_payment',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(stripeEvent)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_duplicate',
        stripeSessionId: 'cs_test_duplicate',
        cartItems: [{ id: 'item-1', productId: 'prod-1' } as any],
        shippingAddress: {} as any,
        total: 79.98,
      })
      sendOrderConfirmationSpy.mockResolvedValue(undefined)
      mockSingle.mockResolvedValue({
        data: { gelato_product_uid: 'uid', design_url: 'url' },
        error: null,
      })

      // First webhook delivery - succeeds
      createOrderSpy.mockResolvedValueOnce({
        id: 'order-dup-1',
        orderNumber: 'MW-DUP-001',
      } as any)
      submitToGelatoSpy.mockResolvedValue(undefined)

      const request1 = createStripeRequest(
        JSON.stringify(stripeEvent),
        'valid_signature'
      )
      const response1 = await stripeWebhook(request1 as any)

      expect(response1.status).toBe(200)
      expect(createOrderSpy).toHaveBeenCalledTimes(1)

      // Second webhook delivery - fails due to unique constraint
      createOrderSpy.mockRejectedValueOnce(
        new Error('duplicate key value violates unique constraint "orders_stripe_payment_id_key"')
      )

      const request2 = createStripeRequest(
        JSON.stringify(stripeEvent),
        'valid_signature'
      )
      const response2 = await stripeWebhook(request2 as any)

      // Should return 500 to trigger retry, but database prevents duplicate
      expect(response2.status).toBe(500)
      expect(createOrderSpy).toHaveBeenCalledTimes(2)
    })

    it('should handle duplicate Gelato webhook deliveries idempotently', async () => {
      const gelatoPayload = {
        eventType: 'order.shipped',
        eventId: 'evt_duplicate_gelato',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_789',
          orderReferenceId: 'MW-GELDUP-001',
          status: 'shipped',
          trackingNumber: '1Z999AA10123456786',
          carrier: 'USPS',
        },
      }

      mockLimit.mockResolvedValue({
        data: [{ id: 'order-geldup-1' }],
        error: null,
      })
      updateOrderStatusSpy.mockResolvedValue({
        id: 'order-geldup-1',
        status: 'shipped',
        trackingNumber: '1Z999AA10123456786',
        carrier: 'USPS',
      } as any)
      sendShippingNotificationSpy.mockResolvedValue(undefined)

      // First delivery
      const request1 = createGelatoRequest(gelatoPayload)
      const response1 = await gelatoWebhook(request1 as any)

      expect(response1.status).toBe(200)
      expect(updateOrderStatusSpy).toHaveBeenCalledTimes(1)

      // Second delivery (duplicate)
      const request2 = createGelatoRequest(gelatoPayload)
      const response2 = await gelatoWebhook(request2 as any)

      expect(response2.status).toBe(200)
      // Update is called again but with same values (idempotent)
      expect(updateOrderStatusSpy).toHaveBeenCalledTimes(2)
      expect(updateOrderStatusSpy).toHaveBeenNthCalledWith(
        1,
        'order-geldup-1',
        'shipped',
        {
          trackingNumber: '1Z999AA10123456786',
          carrier: 'USPS',
        }
      )
      expect(updateOrderStatusSpy).toHaveBeenNthCalledWith(
        2,
        'order-geldup-1',
        'shipped',
        {
          trackingNumber: '1Z999AA10123456786',
          carrier: 'USPS',
        }
      )
    })
  })

  describe('Email Notification Handling', () => {
    it('should not fail order creation if confirmation email fails', async () => {
      const stripeEvent: Stripe.Event = {
        id: 'evt_email_fail',
        type: 'checkout.session.completed',
        data: { object: validCheckoutSession },
      } as any

      verifyWebhookSignatureSpy.mockReturnValue(stripeEvent)
      handlePaymentSuccessSpy.mockResolvedValue({
        customerEmail: '[email protected]',
        stripePaymentId: 'pi_test_email_fail',
        stripeSessionId: 'cs_test_email_fail',
        cartItems: [{ id: 'item-1', productId: 'prod-1' } as any],
        shippingAddress: {} as any,
        total: 79.98,
      })
      createOrderSpy.mockResolvedValue({
        id: 'order-email-fail-1',
        orderNumber: 'MW-EMAILFAIL-001',
      } as any)
      submitToGelatoSpy.mockResolvedValue(undefined)
      sendOrderConfirmationSpy.mockRejectedValue(new Error('Email service unavailable'))
      mockSingle.mockResolvedValue({
        data: { gelato_product_uid: 'uid', design_url: 'url' },
        error: null,
      })

      const request = createStripeRequest(
        JSON.stringify(stripeEvent),
        'valid_signature'
      )
      const response = await stripeWebhook(request as any)

      // Order should still be created successfully
      expect(response.status).toBe(200)
      expect(createOrderSpy).toHaveBeenCalled()
      expect(submitToGelatoSpy).toHaveBeenCalled()
    })

    it('should not fail webhook processing if tracking email fails', async () => {
      const gelatoPayload = {
        eventType: 'order.shipped',
        eventId: 'evt_tracking_email_fail',
        timestamp: new Date().toISOString(),
        data: {
          orderId: 'gelato_999',
          orderReferenceId: 'MW-TRACKFAIL-001',
          status: 'shipped',
          trackingNumber: '1Z999AA10123456787',
          carrier: 'DHL',
        },
      }

      mockLimit.mockResolvedValue({
        data: [{ id: 'order-trackfail-1' }],
        error: null,
      })
      updateOrderStatusSpy.mockResolvedValue({
        id: 'order-trackfail-1',
        status: 'shipped',
        trackingNumber: '1Z999AA10123456787',
        carrier: 'DHL',
      } as any)
      sendShippingNotificationSpy.mockRejectedValue(new Error('Email service unavailable'))

      const request = createGelatoRequest(gelatoPayload)
      const response = await gelatoWebhook(request as any)

      // Webhook should still succeed
      expect(response.status).toBe(200)
      expect(updateOrderStatusSpy).toHaveBeenCalled()
    })
  })
})
