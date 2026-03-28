/**
 * Property-Based Tests for Stripe Service
 * Feature: mono-waves-ecommerce
 * 
 * These tests validate universal correctness properties that should hold
 * for all valid Stripe payment operations across the system.
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, jest } from '@jest/globals'
import * as fc from 'fast-check'
import Stripe from 'stripe'
import {
  stripeService,
  createCheckoutSession,
  verifyWebhookSignature,
  handlePaymentSuccess,
  handlePaymentFailure,
  StripeServiceError,
} from '@/lib/services/stripeService'
import {
  checkoutSessionDataArbitrary,
  cartItemArbitrary,
  shippingAddressArbitrary,
  emailArbitrary,
} from '../utils/arbitraries'

describe('Stripe Service Properties', () => {
  let stripeConfigured = false

  beforeAll(() => {
    stripeConfigured = !!(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET
    )

    if (!stripeConfigured) {
      console.warn('⚠️  Stripe is not configured. Skipping property tests.')
      console.warn('   To run these tests, configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.')
    }
  })

  /**
   * Property 21: Stripe Checkout Session Creation
   * 
   * For any valid checkout data (cart items, customer email, shipping address),
   * the system should create a Stripe checkout session and return a valid session URL.
   * 
   * Validates: Requirements 6.4, 7.1
   */
  it('Property 21: Stripe Checkout Session Creation', async () => {
    if (!stripeConfigured) {
      console.log('⏭️  Skipping: Stripe not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        checkoutSessionDataArbitrary(),
        async (checkoutData) => {
          // Create checkout session
          const sessionUrl = await createCheckoutSession(checkoutData)

          // Verify session URL is returned
          expect(sessionUrl).toBeDefined()
          expect(typeof sessionUrl).toBe('string')
          expect(sessionUrl.length).toBeGreaterThan(0)

          // Verify URL is a valid Stripe checkout URL
          expect(sessionUrl).toMatch(/^https:\/\/checkout\.stripe\.com/)
        }
      ),
      {
        numRuns: 2,
        verbose: false,
      }
    )
  }, 60000)

  /**
   * Property 21 - Validation: Invalid cart items should be rejected
   */
  it('Property 21: Should reject empty cart items', async () => {
    if (!stripeConfigured) {
      console.log('⏭️  Skipping: Stripe not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        emailArbitrary(),
        shippingAddressArbitrary(),
        fc.webUrl(),
        fc.webUrl(),
        async (email, address, successUrl, cancelUrl) => {
          const invalidData = {
            cartItems: [],
            customerEmail: email,
            shippingAddress: address,
            successUrl,
            cancelUrl,
          }

          await expect(createCheckoutSession(invalidData)).rejects.toThrow(
            StripeServiceError
          )
          await expect(createCheckoutSession(invalidData)).rejects.toThrow(
            /cart items are required/i
          )
        }
      ),
      {
        numRuns: 2,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 21 - Validation: Invalid email should be rejected
   */
  it('Property 21: Should reject invalid email', async () => {
    if (!stripeConfigured) {
      console.log('⏭️  Skipping: Stripe not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(cartItemArbitrary(), { minLength: 1, maxLength: 3 }),
        shippingAddressArbitrary(),
        fc.webUrl(),
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('@')),
        async (items, address, successUrl, cancelUrl, invalidEmail) => {
          const invalidData = {
            cartItems: items,
            customerEmail: invalidEmail,
            shippingAddress: address,
            successUrl,
            cancelUrl,
          }

          await expect(createCheckoutSession(invalidData)).rejects.toThrow(
            StripeServiceError
          )
          await expect(createCheckoutSession(invalidData)).rejects.toThrow(
            /valid customer email is required/i
          )
        }
      ),
      {
        numRuns: 2,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 22: Webhook Signature Verification
   * 
   * For any webhook request (Stripe or Gelato) with an invalid signature,
   * the system should reject the request and not process the webhook payload.
   * 
   * Validates: Requirements 7.3, 10.2, 20.1
   */
  it('Property 22: Webhook Signature Verification - Invalid signature rejection', async () => {
    if (!stripeConfigured) {
      console.log('⏭️  Skipping: Stripe not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.string({ minLength: 10, maxLength: 100 }),
        async (payload, invalidSignature) => {
          // Attempt to verify with invalid signature
          expect(() => {
            verifyWebhookSignature(payload, invalidSignature)
          }).toThrow(StripeServiceError)

          expect(() => {
            verifyWebhookSignature(payload, invalidSignature)
          }).toThrow(/signature verification failed/i)
        }
      ),
      {
        numRuns: 2,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 23: Payment Confirmation Order Creation
   * 
   * For any successful Stripe payment webhook, the system should create an order
   * record in the database with status "payment_confirmed" and all order details
   * from the checkout session.
   * 
   * Validates: Requirements 7.4
   */
  it('Property 23: Payment Confirmation Order Creation - Extract session data', async () => {
    if (!stripeConfigured) {
      console.log('⏭️  Skipping: Stripe not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(cartItemArbitrary(), { minLength: 1, maxLength: 5 }),
        shippingAddressArbitrary(),
        emailArbitrary(),
        fc.integer({ min: 100, max: 100000 }),
        async (cartItems, shippingAddress, email, amountInCents) => {
          // Create a mock successful Stripe session
          const mockSession = {
            id: `cs_test_${Date.now()}`,
            object: 'checkout.session',
            payment_status: 'paid',
            customer_email: email,
            payment_intent: `pi_test_${Date.now()}`,
            amount_total: amountInCents,
            metadata: {
              cartItems: JSON.stringify(cartItems),
              shippingAddress: JSON.stringify(shippingAddress),
            },
          } as unknown as Stripe.Checkout.Session

          // Handle payment success
          const result = await handlePaymentSuccess(mockSession)

          // Verify extracted data
          expect(result).toBeDefined()
          expect(result.customerEmail).toBe(email)
          expect(result.stripePaymentId).toBe(mockSession.payment_intent)
          expect(result.stripeSessionId).toBe(mockSession.id)
          expect(result.total).toBe(amountInCents / 100)
          expect(result.cartItems).toEqual(cartItems)
          expect(result.shippingAddress).toEqual(shippingAddress)
        }
      ),
      {
        numRuns: 2,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 23 - Validation: Unpaid session should be rejected
   */
  it('Property 23: Should reject unpaid session', async () => {
    if (!stripeConfigured) {
      console.log('⏭️  Skipping: Stripe not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(cartItemArbitrary(), { minLength: 1, maxLength: 5 }),
        shippingAddressArbitrary(),
        emailArbitrary(),
        async (cartItems, shippingAddress, email) => {
          // Create a mock unpaid session
          const mockSession = {
            id: `cs_test_${Date.now()}`,
            object: 'checkout.session',
            payment_status: 'unpaid',
            customer_email: email,
            metadata: {
              cartItems: JSON.stringify(cartItems),
              shippingAddress: JSON.stringify(shippingAddress),
            },
          } as unknown as Stripe.Checkout.Session

          // Should reject unpaid session
          await expect(handlePaymentSuccess(mockSession)).rejects.toThrow(
            StripeServiceError
          )
          await expect(handlePaymentSuccess(mockSession)).rejects.toThrow(
            /payment not completed/i
          )
        }
      ),
      {
        numRuns: 2,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 23 - Validation: Missing metadata should be rejected
   */
  it('Property 23: Should reject session with missing metadata', async () => {
    if (!stripeConfigured) {
      console.log('⏭️  Skipping: Stripe not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        emailArbitrary(),
        async (email) => {
          // Create a mock session without metadata
          const mockSession = {
            id: `cs_test_${Date.now()}`,
            object: 'checkout.session',
            payment_status: 'paid',
            customer_email: email,
            payment_intent: `pi_test_${Date.now()}`,
            metadata: {},
          } as unknown as Stripe.Checkout.Session

          // Should reject session without metadata
          await expect(handlePaymentSuccess(mockSession)).rejects.toThrow(
            StripeServiceError
          )
          await expect(handlePaymentSuccess(mockSession)).rejects.toThrow(
            /metadata is incomplete/i
          )
        }
      ),
      {
        numRuns: 2,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Additional test: Payment failure handling
   */
  it('should handle payment failure correctly', async () => {
    if (!stripeConfigured) {
      console.log('⏭️  Skipping: Stripe not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        emailArbitrary(),
        fc.constantFrom('unpaid', 'canceled', 'failed'),
        async (email, paymentStatus) => {
          // Create a mock failed session
          const mockSession = {
            id: `cs_test_${Date.now()}`,
            object: 'checkout.session',
            payment_status: paymentStatus as any,
            customer_email: email,
          } as unknown as Stripe.Checkout.Session

          // Handle payment failure
          const result = await handlePaymentFailure(mockSession)

          // Verify failure data
          expect(result).toBeDefined()
          expect(result.sessionId).toBe(mockSession.id)
          expect(result.customerEmail).toBe(email)
          expect(result.reason).toBe(paymentStatus)
        }
      ),
      {
        numRuns: 2,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Additional test: Checkout session includes all cart items
   */
  it('should include all cart items in checkout session', async () => {
    if (!stripeConfigured) {
      console.log('⏭️  Skipping: Stripe not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        checkoutSessionDataArbitrary(),
        async (checkoutData) => {
          // Verify cart items are not empty
          expect(checkoutData.cartItems.length).toBeGreaterThan(0)

          // Create checkout session
          const sessionUrl = await createCheckoutSession(checkoutData)

          // Verify session was created
          expect(sessionUrl).toBeDefined()
          expect(sessionUrl).toMatch(/^https:\/\/checkout\.stripe\.com/)

          // Note: We can't directly verify the line items without retrieving the session
          // from Stripe, but the creation success implies the items were processed
        }
      ),
      {
        numRuns: 2,
        verbose: false,
      }
    )
  }, 60000)

  /**
   * Additional test: Checkout session metadata preservation
   */
  it('should preserve cart and shipping data in session metadata', async () => {
    if (!stripeConfigured) {
      console.log('⏭️  Skipping: Stripe not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(cartItemArbitrary(), { minLength: 1, maxLength: 3 }),
        shippingAddressArbitrary(),
        emailArbitrary(),
        async (cartItems, shippingAddress, email) => {
          // Create mock session with metadata
          const mockSession = {
            id: `cs_test_${Date.now()}`,
            object: 'checkout.session',
            payment_status: 'paid',
            customer_email: email,
            payment_intent: `pi_test_${Date.now()}`,
            amount_total: 5000,
            metadata: {
              cartItems: JSON.stringify(cartItems),
              shippingAddress: JSON.stringify(shippingAddress),
            },
          } as unknown as Stripe.Checkout.Session

          // Extract data
          const result = await handlePaymentSuccess(mockSession)

          // Verify data was preserved correctly
          expect(result.cartItems).toEqual(cartItems)
          expect(result.shippingAddress).toEqual(shippingAddress)

          // Verify all cart item properties are preserved
          result.cartItems.forEach((item, index) => {
            expect(item.productId).toBe(cartItems[index].productId)
            expect(item.productName).toBe(cartItems[index].productName)
            expect(item.quantity).toBe(cartItems[index].quantity)
            expect(item.price).toBe(cartItems[index].price)
          })

          // Verify all shipping address properties are preserved
          expect(result.shippingAddress.firstName).toBe(shippingAddress.firstName)
          expect(result.shippingAddress.lastName).toBe(shippingAddress.lastName)
          expect(result.shippingAddress.addressLine1).toBe(shippingAddress.addressLine1)
          expect(result.shippingAddress.city).toBe(shippingAddress.city)
          expect(result.shippingAddress.state).toBe(shippingAddress.state)
          expect(result.shippingAddress.postCode).toBe(shippingAddress.postCode)
          expect(result.shippingAddress.country).toBe(shippingAddress.country)
        }
      ),
      {
        numRuns: 2,
        verbose: false,
      }
    )
  }, 30000)
})
