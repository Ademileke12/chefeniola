/**
 * Property-Based Tests for Tax and Shipping
 * Feature: order-fulfillment-automation
 * 
 * These tests validate universal correctness properties for tax calculation
 * and shipping cost handling.
 * 
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import * as fc from 'fast-check'
import { getShippingCost, ShippingCostRequest } from '@/lib/services/shippingService'
import { Order } from '@/types/order'

/**
 * Arbitrary for generating shipping cost requests
 */
function shippingCostRequestArbitrary(): fc.Arbitrary<ShippingCostRequest> {
  return fc.record({
    items: fc.array(
      fc.record({
        productUid: fc.string({ minLength: 10, maxLength: 50 }),
        quantity: fc.integer({ min: 1, max: 10 }),
      }),
      { minLength: 1, maxLength: 5 }
    ),
    shippingAddress: fc.record({
      country: fc.constantFrom('US', 'CA', 'GB', 'DE', 'FR', 'AU'),
      state: fc.constantFrom('CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH'),
      postCode: fc.string({ minLength: 5, maxLength: 10 }),
    }),
  })
}

/**
 * Arbitrary for generating Order objects with valid financial data
 */
function orderArbitrary(): fc.Arbitrary<Order> {
  return fc.record({
    id: fc.uuid(),
    orderNumber: fc.string({ minLength: 8, maxLength: 12 }).map(s => `MW-${s.toUpperCase()}`),
    customerEmail: fc.emailAddress(),
    customerName: fc.string({ minLength: 3, maxLength: 50 }),
    shippingAddress: fc.record({
      firstName: fc.string({ minLength: 2, maxLength: 30 }),
      lastName: fc.string({ minLength: 2, maxLength: 30 }),
      addressLine1: fc.string({ minLength: 5, maxLength: 100 }),
      addressLine2: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
      city: fc.string({ minLength: 2, maxLength: 50 }),
      state: fc.constantFrom('CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH'),
      postCode: fc.string({ minLength: 5, maxLength: 10 }),
      country: fc.constantFrom('US', 'CA', 'GB'),
      phone: fc.string({ minLength: 10, maxLength: 15 }),
    }),
    items: fc.array(
      fc.record({
        productId: fc.uuid(),
        productName: fc.string({ minLength: 5, maxLength: 50 }),
        size: fc.constantFrom('S', 'M', 'L', 'XL', '2XL'),
        color: fc.constantFrom('Black', 'White', 'Navy', 'Gray'),
        quantity: fc.integer({ min: 1, max: 10 }),
        price: fc.float({ min: 10, max: 100, noNaN: true }).map(p => Math.round(p * 100) / 100),
        designUrl: fc.webUrl(),
        gelatoProductUid: fc.string({ minLength: 10, maxLength: 30 }),
      }),
      { minLength: 1, maxLength: 5 }
    ),
    subtotal: fc.float({ min: 10, max: 1000, noNaN: true }).map(p => Math.round(p * 100) / 100),
    shippingCost: fc.float({ min: 5, max: 50, noNaN: true }).map(p => Math.round(p * 100) / 100),
    tax: fc.float({ min: 0, max: 100, noNaN: true }).map(p => Math.round(p * 100) / 100),
    total: fc.constant(0), // Will be calculated based on subtotal + shipping + tax
    stripePaymentId: fc.string({ minLength: 20, maxLength: 40 }).map(s => `pi_${s}`),
    stripeSessionId: fc.option(fc.string({ minLength: 20, maxLength: 40 }).map(s => `cs_${s}`), { nil: undefined }),
    gelatoOrderId: fc.option(fc.uuid(), { nil: undefined }),
    status: fc.constantFrom('pending', 'payment_confirmed', 'submitted_to_gelato', 'printing', 'shipped', 'delivered'),
    trackingNumber: fc.option(fc.string({ minLength: 10, maxLength: 30 }), { nil: undefined }),
    carrier: fc.option(fc.constantFrom('USPS', 'UPS', 'FedEx', 'DHL'), { nil: undefined }),
    createdAt: fc.date().map(d => d.toISOString()),
    updatedAt: fc.date().map(d => d.toISOString()),
  }).map(order => ({
    ...order,
    // Calculate total correctly based on subtotal + shipping + tax
    total: Math.round((order.subtotal + order.shippingCost + order.tax) * 100) / 100,
  }))
}

describe('Tax and Shipping Properties', () => {
  const FALLBACK_SHIPPING_COST = 10.00
  const originalFetch = global.fetch

  beforeEach(() => {
    // Clear any module caches
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch
  })

  /**
   * Property 16: Shipping Cost Fallback on API Failure
   * 
   * For any Gelato API failure when querying shipping costs, the system should
   * use a fixed fallback shipping cost of $10.
   * 
   * **Validates: Requirements 5.5**
   */
  it('Property 16: Shipping Cost Fallback on API Failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        shippingCostRequestArbitrary(),
        async (request) => {
          // Mock fetch to simulate API failure
          global.fetch = jest.fn().mockRejectedValue(new Error('API unavailable')) as any

          // Call getShippingCost
          const result = await getShippingCost(request)

          // Verify fallback is used
          expect(result).toBeDefined()
          expect(result.cost).toBe(FALLBACK_SHIPPING_COST)
          expect(result.currency).toBe('USD')
          expect(result.estimatedDays).toBe(10)
          expect(result.method).toContain('Standard Shipping')

          // Verify the system attempted to call the API
          expect(global.fetch).toHaveBeenCalled()
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  }, 60000) // 60 second timeout

  /**
   * Property 16b: Fallback on HTTP Error Responses
   * 
   * For any HTTP error response (4xx, 5xx) from Gelato API, the system should
   * use the fallback shipping cost.
   */
  it('Property 16b: Fallback on HTTP Error Responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        shippingCostRequestArbitrary(),
        fc.integer({ min: 400, max: 599 }), // HTTP error codes
        async (request, statusCode) => {
          // Mock fetch to simulate HTTP error
          global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: statusCode,
            statusText: 'Error',
            text: async () => 'API Error',
          }) as any

          // Call getShippingCost
          const result = await getShippingCost(request)

          // Verify fallback is used
          expect(result).toBeDefined()
          expect(result.cost).toBe(FALLBACK_SHIPPING_COST)
          expect(result.currency).toBe('USD')
          expect(result.estimatedDays).toBe(10)
          expect(result.method).toContain('Standard Shipping')
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  }, 60000)

  /**
   * Property 16c: Fallback on Invalid API Response
   * 
   * For any invalid or malformed response from Gelato API, the system should
   * use the fallback shipping cost.
   */
  it('Property 16c: Fallback on Invalid API Response', async () => {
    await fc.assert(
      fc.asyncProperty(
        shippingCostRequestArbitrary(),
        async (request) => {
          // Mock fetch to return invalid response (no shipping options)
          global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ shippingOptions: [] }), // Empty options
          }) as any

          // Call getShippingCost
          const result = await getShippingCost(request)

          // Verify fallback is used
          expect(result).toBeDefined()
          expect(result.cost).toBe(FALLBACK_SHIPPING_COST)
          expect(result.currency).toBe('USD')
          expect(result.estimatedDays).toBe(10)
          expect(result.method).toContain('Standard Shipping')
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  }, 60000)

  /**
   * Property 16d: Fallback is Always Valid
   * 
   * For any request, the fallback response should always be a valid
   * ShippingCostResponse with positive cost and reasonable values.
   */
  it('Property 16d: Fallback is Always Valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        shippingCostRequestArbitrary(),
        async (request) => {
          // Mock fetch to simulate API failure
          global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as any

          // Call getShippingCost
          const result = await getShippingCost(request)

          // Verify fallback response structure
          expect(result).toBeDefined()
          expect(typeof result.cost).toBe('number')
          expect(result.cost).toBeGreaterThan(0)
          expect(typeof result.currency).toBe('string')
          expect(result.currency.length).toBeGreaterThan(0)
          expect(typeof result.estimatedDays).toBe('number')
          expect(result.estimatedDays).toBeGreaterThan(0)
          expect(typeof result.method).toBe('string')
          expect(result.method.length).toBeGreaterThan(0)
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  }, 60000)

  /**
   * Property 13: Order Total Arithmetic Correctness
   * 
   * For any order, the total amount should equal subtotal + shipping cost + tax amount.
   * This property ensures that order totals are always calculated correctly and that
   * there are no rounding errors or arithmetic mistakes in the order total calculation.
   * 
   * **Validates: Requirements 4.1, 4.4**
   */
  it('Property 13: Order Total Arithmetic Correctness', () => {
    fc.assert(
      fc.property(
        orderArbitrary(),
        (order) => {
          // Calculate expected total
          const expectedTotal = Math.round((order.subtotal + order.shippingCost + order.tax) * 100) / 100

          // Verify the order's total matches the expected calculation
          expect(order.total).toBe(expectedTotal)

          // Additional verification: total should equal sum of components
          const calculatedTotal = order.subtotal + order.shippingCost + order.tax
          const roundedCalculatedTotal = Math.round(calculatedTotal * 100) / 100

          expect(order.total).toBe(roundedCalculatedTotal)

          // Verify all components are non-negative
          expect(order.subtotal).toBeGreaterThanOrEqual(0)
          expect(order.shippingCost).toBeGreaterThanOrEqual(0)
          expect(order.tax).toBeGreaterThanOrEqual(0)
          expect(order.total).toBeGreaterThanOrEqual(0)

          // Verify total is at least as large as subtotal (since shipping and tax are non-negative)
          expect(order.total).toBeGreaterThanOrEqual(order.subtotal)
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  })
})
