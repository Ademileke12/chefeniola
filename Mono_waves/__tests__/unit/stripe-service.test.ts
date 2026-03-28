/**
 * Unit Tests for Stripe Service Webhook Handling
 * Feature: mono-waves-ecommerce
 * 
 * These tests validate specific webhook handling scenarios including
 * successful payment, failed payment, and invalid signature rejection.
 * 
 * Requirements: 7.5
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import Stripe from 'stripe'
import {
  verifyWebhookSignature,
  handlePaymentSuccess,
  handlePaymentFailure,
  StripeServiceError,
} from '@/lib/services/stripeService'

describe('Stripe Webhook Handling', () => {
  let stripeConfigured = false

  beforeAll(() => {
    stripeConfigured = !!(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET
    )

    if (!stripeConfigured) {
      console.warn('⚠️  Stripe is not configured. Skipping unit tests.')
      console.warn('   To run these tests, configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.')
    }
  })

  /**
   * Test successful payment webhook
   * Requirements: 7.5
   */
  describe('Successful Payment Webhook', () => {
    it('should extract order data from successful payment session', async () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      // Create mock successful payment session
      const mockSession = {
        id: 'cs_test_successful_payment',
        object: 'checkout.session',
        payment_status: 'paid',
        customer_email: 'customer@example.com',
        payment_intent: 'pi_test_12345',
        amount_total: 5999, // $59.99
        metadata: {
          cartItems: JSON.stringify([
            {
              id: 'item-1',
              productId: 'prod-123',
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
            city: 'San Francisco',
            state: 'CA',
            postCode: '94102',
            country: 'US',
            phone: '555-1234',
          }),
        },
      } as unknown as Stripe.Checkout.Session

      const result = await handlePaymentSuccess(mockSession)

      expect(result).toBeDefined()
      expect(result.customerEmail).toBe('customer@example.com')
      expect(result.stripePaymentId).toBe('pi_test_12345')
      expect(result.stripeSessionId).toBe('cs_test_successful_payment')
      expect(result.total).toBe(59.99)
      expect(result.cartItems).toHaveLength(1)
      expect(result.cartItems[0].productName).toBe('Test T-Shirt')
      expect(result.shippingAddress.firstName).toBe('John')
      expect(result.shippingAddress.lastName).toBe('Doe')
    })

    it('should handle multiple items in cart', async () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const mockSession = {
        id: 'cs_test_multiple_items',
        object: 'checkout.session',
        payment_status: 'paid',
        customer_email: 'customer@example.com',
        payment_intent: 'pi_test_67890',
        amount_total: 12998, // $129.98
        metadata: {
          cartItems: JSON.stringify([
            {
              id: 'item-1',
              productId: 'prod-123',
              productName: 'T-Shirt',
              size: 'M',
              color: 'Blue',
              quantity: 1,
              price: 29.99,
              imageUrl: 'https://example.com/tshirt.jpg',
            },
            {
              id: 'item-2',
              productId: 'prod-456',
              productName: 'Hoodie',
              size: 'L',
              color: 'Black',
              quantity: 1,
              price: 99.99,
              imageUrl: 'https://example.com/hoodie.jpg',
            },
          ]),
          shippingAddress: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            addressLine1: '456 Oak Ave',
            city: 'Los Angeles',
            state: 'CA',
            postCode: '90001',
            country: 'US',
            phone: '555-5678',
          }),
        },
      } as unknown as Stripe.Checkout.Session

      const result = await handlePaymentSuccess(mockSession)

      expect(result.cartItems).toHaveLength(2)
      expect(result.cartItems[0].productName).toBe('T-Shirt')
      expect(result.cartItems[1].productName).toBe('Hoodie')
      expect(result.total).toBe(129.98)
    })

    it('should reject session without payment intent', async () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const mockSession = {
        id: 'cs_test_no_payment_intent',
        object: 'checkout.session',
        payment_status: 'paid',
        customer_email: 'customer@example.com',
        payment_intent: null,
        amount_total: 5999,
        metadata: {
          cartItems: JSON.stringify([]),
          shippingAddress: JSON.stringify({}),
        },
      } as unknown as Stripe.Checkout.Session

      await expect(handlePaymentSuccess(mockSession)).rejects.toThrow(
        StripeServiceError
      )
    })
  })

  /**
   * Test failed payment webhook
   * Requirements: 7.5
   */
  describe('Failed Payment Webhook', () => {
    it('should handle unpaid session', async () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const mockSession = {
        id: 'cs_test_unpaid',
        object: 'checkout.session',
        payment_status: 'unpaid',
        customer_email: 'customer@example.com',
      } as unknown as Stripe.Checkout.Session

      const result = await handlePaymentFailure(mockSession)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe('cs_test_unpaid')
      expect(result.customerEmail).toBe('customer@example.com')
      expect(result.reason).toBe('unpaid')
    })

    it('should handle canceled session', async () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const mockSession = {
        id: 'cs_test_canceled',
        object: 'checkout.session',
        payment_status: 'canceled',
        customer_email: 'customer@example.com',
      } as unknown as Stripe.Checkout.Session

      const result = await handlePaymentFailure(mockSession)

      expect(result.sessionId).toBe('cs_test_canceled')
      expect(result.reason).toBe('canceled')
    })

    it('should handle failed payment', async () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const mockSession = {
        id: 'cs_test_failed',
        object: 'checkout.session',
        payment_status: 'failed',
        customer_email: 'customer@example.com',
      } as unknown as Stripe.Checkout.Session

      const result = await handlePaymentFailure(mockSession)

      expect(result.sessionId).toBe('cs_test_failed')
      expect(result.reason).toBe('failed')
    })

    it('should handle session without customer email', async () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const mockSession = {
        id: 'cs_test_no_email',
        object: 'checkout.session',
        payment_status: 'unpaid',
        customer_email: null,
      } as unknown as Stripe.Checkout.Session

      const result = await handlePaymentFailure(mockSession)

      expect(result.sessionId).toBe('cs_test_no_email')
      expect(result.customerEmail).toBeNull()
      expect(result.reason).toBe('unpaid')
    })
  })

  /**
   * Test invalid signature rejection
   * Requirements: 7.5
   */
  describe('Invalid Signature Rejection', () => {
    it('should reject webhook with invalid signature', () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const payload = JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
      })
      const invalidSignature = 'invalid_signature_12345'

      expect(() => {
        verifyWebhookSignature(payload, invalidSignature)
      }).toThrow(StripeServiceError)

      expect(() => {
        verifyWebhookSignature(payload, invalidSignature)
      }).toThrow(/signature verification failed/i)
    })

    it('should reject webhook with empty signature', () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const payload = JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
      })
      const emptySignature = ''

      expect(() => {
        verifyWebhookSignature(payload, emptySignature)
      }).toThrow(StripeServiceError)
    })

    it('should reject webhook with malformed signature', () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const payload = JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
      })
      const malformedSignature = 'not-a-valid-stripe-signature'

      expect(() => {
        verifyWebhookSignature(payload, malformedSignature)
      }).toThrow(StripeServiceError)
    })

    it('should throw StripeServiceError with correct status code', () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const payload = 'test payload'
      const invalidSignature = 'invalid'

      try {
        verifyWebhookSignature(payload, invalidSignature)
        fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(StripeServiceError)
        if (error instanceof StripeServiceError) {
          expect(error.statusCode).toBe(400)
          expect(error.code).toBe('SIGNATURE_VERIFICATION_FAILED')
        }
      }
    })
  })

  /**
   * Test edge cases
   */
  describe('Edge Cases', () => {
    it('should handle session with missing customer email', async () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const mockSession = {
        id: 'cs_test_no_email',
        object: 'checkout.session',
        payment_status: 'paid',
        customer_email: null,
        payment_intent: 'pi_test_12345',
        amount_total: 5999,
        metadata: {
          cartItems: JSON.stringify([]),
          shippingAddress: JSON.stringify({}),
        },
      } as unknown as Stripe.Checkout.Session

      await expect(handlePaymentSuccess(mockSession)).rejects.toThrow(
        StripeServiceError
      )
      await expect(handlePaymentSuccess(mockSession)).rejects.toThrow(
        /customer email is missing/i
      )
    })

    it('should handle session with invalid JSON in metadata', async () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const mockSession = {
        id: 'cs_test_invalid_json',
        object: 'checkout.session',
        payment_status: 'paid',
        customer_email: 'customer@example.com',
        payment_intent: 'pi_test_12345',
        amount_total: 5999,
        metadata: {
          cartItems: 'invalid json {',
          shippingAddress: JSON.stringify({}),
        },
      } as unknown as Stripe.Checkout.Session

      await expect(handlePaymentSuccess(mockSession)).rejects.toThrow(
        StripeServiceError
      )
      await expect(handlePaymentSuccess(mockSession)).rejects.toThrow(
        /failed to parse session metadata/i
      )
    })

    it('should handle session with zero amount', async () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const mockSession = {
        id: 'cs_test_zero_amount',
        object: 'checkout.session',
        payment_status: 'paid',
        customer_email: 'customer@example.com',
        payment_intent: 'pi_test_12345',
        amount_total: 0,
        metadata: {
          cartItems: JSON.stringify([]),
          shippingAddress: JSON.stringify({
            firstName: 'Test',
            lastName: 'User',
            addressLine1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            postCode: '12345',
            country: 'US',
            phone: '555-0000',
          }),
        },
      } as unknown as Stripe.Checkout.Session

      const result = await handlePaymentSuccess(mockSession)

      expect(result.total).toBe(0)
    })

    it('should handle session with null amount_total', async () => {
      if (!stripeConfigured) {
        console.log('⏭️  Skipping: Stripe not configured')
        return
      }

      const mockSession = {
        id: 'cs_test_null_amount',
        object: 'checkout.session',
        payment_status: 'paid',
        customer_email: 'customer@example.com',
        payment_intent: 'pi_test_12345',
        amount_total: null,
        metadata: {
          cartItems: JSON.stringify([]),
          shippingAddress: JSON.stringify({
            firstName: 'Test',
            lastName: 'User',
            addressLine1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            postCode: '12345',
            country: 'US',
            phone: '555-0000',
          }),
        },
      } as unknown as Stripe.Checkout.Session

      const result = await handlePaymentSuccess(mockSession)

      expect(result.total).toBe(0)
    })
  })
})
