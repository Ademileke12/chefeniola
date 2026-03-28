/**
 * Property-Based Tests for Order Service
 * Feature: mono-waves-ecommerce
 * 
 * These tests validate universal correctness properties that should hold
 * for all valid order operations across the system.
 * 
 * @jest-environment node
 */

import { describe, it, expect, afterEach, beforeAll, jest, beforeEach } from '@jest/globals'
import * as fc from 'fast-check'
import { orderService } from '@/lib/services/orderService'
import {
  createOrderDataArbitrary,
  emailArbitrary,
  orderNumberArbitrary,
  orderStatusArbitrary,
  trackingDataArbitrary,
} from '../utils/arbitraries'
import { cleanupTestData, isSupabaseConfigured } from '../utils/testDb'

// Mock Gelato service
jest.mock('@/lib/services/gelatoService', () => ({
  gelatoService: {
    createOrder: jest.fn(),
  },
}))

// Import after mocking
const { gelatoService } = require('@/lib/services/gelatoService')

describe('Order Service Properties', () => {
  let supabaseConfigured = false

  beforeAll(async () => {
    supabaseConfigured = await isSupabaseConfigured()
    
    if (!supabaseConfigured) {
      console.warn('⚠️  Supabase is not configured. Skipping property tests.')
      console.warn('   To run these tests, configure Supabase environment variables.')
    }
  })

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  afterEach(async () => {
    if (supabaseConfigured) {
      await cleanupTestData()
    }
  })

  /**
   * Property 25: Gelato Order ID Storage
   * 
   * For any successful Gelato order submission, the system should store the
   * returned Gelato order ID in the order record and update the status to
   * "submitted_to_gelato".
   * 
   * Validates: Requirements 8.4
   */
  it('Property 25: Gelato Order ID Storage', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createOrderDataArbitrary(),
        fc.string({ minLength: 10, maxLength: 30 }).map(s => `gelato-${s}`),
        async (orderData, gelatoOrderId) => {
          // Mock Gelato service to return a successful response
          const mockCreateOrder = gelatoService.createOrder as jest.MockedFunction<typeof gelatoService.createOrder>
          mockCreateOrder.mockResolvedValue({
            orderId: gelatoOrderId,
            orderReferenceId: 'MW-TEST',
            status: 'pending',
          })

          // Create order
          const order = await orderService.createOrder(orderData)
          expect(order.status).toBe('payment_confirmed')
          expect(order.gelatoOrderId).toBeUndefined()

          // Submit to Gelato
          await orderService.submitToGelato(order.id)

          // Retrieve order and verify Gelato order ID is stored
          const updatedOrder = await orderService.getOrderById(order.id)
          
          expect(updatedOrder).toBeDefined()
          expect(updatedOrder?.gelatoOrderId).toBe(gelatoOrderId)
          expect(updatedOrder?.status).toBe('submitted_to_gelato')
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 26: Order Status Update Propagation
   * 
   * For any valid Gelato webhook with status update, the system should update
   * the corresponding order's status in the database to match the webhook status.
   * 
   * Validates: Requirements 10.3
   */
  it('Property 26: Order Status Update Propagation', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createOrderDataArbitrary(),
        orderStatusArbitrary(),
        async (orderData, newStatus) => {
          // Create order
          const order = await orderService.createOrder(orderData)
          const initialStatus = order.status

          // Update order status
          const updatedOrder = await orderService.updateOrderStatus(
            order.id,
            newStatus as any
          )

          // Verify status was updated
          expect(updatedOrder.status).toBe(newStatus)

          // Retrieve order and verify persistence
          const retrievedOrder = await orderService.getOrderById(order.id)
          expect(retrievedOrder).toBeDefined()
          expect(retrievedOrder?.status).toBe(newStatus)

          // Verify the status actually changed (unless it was the same)
          if (initialStatus !== newStatus) {
            expect(retrievedOrder?.status).not.toBe(initialStatus)
          }
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 27: Tracking Information Storage
   * 
   * For any Gelato webhook containing tracking number and carrier, the system
   * should store both values in the order record and make them queryable.
   * 
   * Validates: Requirements 10.4, 10.5
   */
  it('Property 27: Tracking Information Storage', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createOrderDataArbitrary(),
        trackingDataArbitrary(),
        async (orderData, trackingData) => {
          // Create order
          const order = await orderService.createOrder(orderData)
          
          // Verify no tracking info initially
          expect(order.trackingNumber).toBeUndefined()
          expect(order.carrier).toBeUndefined()

          // Update order with tracking information
          const updatedOrder = await orderService.updateOrderStatus(
            order.id,
            'shipped',
            trackingData
          )

          // Verify tracking information is stored
          expect(updatedOrder.trackingNumber).toBe(trackingData.trackingNumber)
          expect(updatedOrder.carrier).toBe(trackingData.carrier)
          expect(updatedOrder.status).toBe('shipped')

          // Retrieve order and verify tracking info persists
          const retrievedOrder = await orderService.getOrderById(order.id)
          expect(retrievedOrder).toBeDefined()
          expect(retrievedOrder?.trackingNumber).toBe(trackingData.trackingNumber)
          expect(retrievedOrder?.carrier).toBe(trackingData.carrier)
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 28: Order Tracking Validation
   * 
   * For any email and order ID combination that does not match an existing order,
   * the system should return an error indicating invalid tracking information.
   * 
   * Validates: Requirements 9.2
   */
  it('Property 28: Order Tracking Validation', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createOrderDataArbitrary(),
        emailArbitrary(),
        orderNumberArbitrary(),
        async (orderData, wrongEmail, wrongOrderNumber) => {
          // Create order
          const order = await orderService.createOrder(orderData)

          // Try to track with wrong email
          const resultWrongEmail = await orderService.trackOrder(
            wrongEmail,
            order.orderNumber
          )
          
          // Should return null if email doesn't match
          if (wrongEmail !== orderData.customerEmail) {
            expect(resultWrongEmail).toBeNull()
          }

          // Try to track with wrong order number
          const resultWrongOrderNumber = await orderService.trackOrder(
            orderData.customerEmail,
            wrongOrderNumber
          )
          
          // Should return null if order number doesn't match
          if (wrongOrderNumber !== order.orderNumber) {
            expect(resultWrongOrderNumber).toBeNull()
          }

          // Try to track with both wrong
          const resultBothWrong = await orderService.trackOrder(
            wrongEmail,
            wrongOrderNumber
          )
          
          // Should return null
          if (wrongEmail !== orderData.customerEmail || wrongOrderNumber !== order.orderNumber) {
            expect(resultBothWrong).toBeNull()
          }

          // Verify correct combination works
          const resultCorrect = await orderService.trackOrder(
            orderData.customerEmail,
            order.orderNumber
          )
          expect(resultCorrect).toBeDefined()
          expect(resultCorrect?.id).toBe(order.id)
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Property 29: Order Tracking Information Completeness
   * 
   * For any valid email and order ID combination, the system should return the
   * order with all details including status, items, shipping address, and
   * tracking information if available.
   * 
   * Validates: Requirements 9.3, 9.4
   */
  it('Property 29: Order Tracking Information Completeness', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createOrderDataArbitrary(),
        fc.option(trackingDataArbitrary(), { nil: undefined }),
        async (orderData, trackingData) => {
          // Create order
          const order = await orderService.createOrder(orderData)

          // Optionally add tracking information
          if (trackingData) {
            await orderService.updateOrderStatus(
              order.id,
              'shipped',
              trackingData
            )
          }

          // Track order using email and order number
          const trackedOrder = await orderService.trackOrder(
            orderData.customerEmail,
            order.orderNumber
          )

          // Verify order is returned
          expect(trackedOrder).toBeDefined()
          expect(trackedOrder?.id).toBe(order.id)

          // Verify all required fields are present
          expect(trackedOrder?.orderNumber).toBe(order.orderNumber)
          expect(trackedOrder?.customerEmail).toBe(orderData.customerEmail)
          expect(trackedOrder?.status).toBeDefined()
          expect(trackedOrder?.items).toBeDefined()
          expect(trackedOrder?.items.length).toBeGreaterThan(0)
          expect(trackedOrder?.shippingAddress).toBeDefined()
          expect(trackedOrder?.total).toBeDefined()
          expect(trackedOrder?.subtotal).toBeDefined()
          expect(trackedOrder?.shippingCost).toBeDefined()

          // Verify shipping address completeness
          expect(trackedOrder?.shippingAddress.firstName).toBe(orderData.shippingAddress.firstName)
          expect(trackedOrder?.shippingAddress.lastName).toBe(orderData.shippingAddress.lastName)
          expect(trackedOrder?.shippingAddress.addressLine1).toBe(orderData.shippingAddress.addressLine1)
          expect(trackedOrder?.shippingAddress.city).toBe(orderData.shippingAddress.city)
          expect(trackedOrder?.shippingAddress.state).toBe(orderData.shippingAddress.state)
          expect(trackedOrder?.shippingAddress.postCode).toBe(orderData.shippingAddress.postCode)
          expect(trackedOrder?.shippingAddress.country).toBe(orderData.shippingAddress.country)

          // Verify items completeness
          trackedOrder?.items.forEach((item, index) => {
            expect(item.productId).toBe(orderData.items[index].productId)
            expect(item.productName).toBe(orderData.items[index].productName)
            expect(item.quantity).toBe(orderData.items[index].quantity)
            expect(item.price).toBe(orderData.items[index].price)
            expect(item.size).toBe(orderData.items[index].size)
            expect(item.color).toBe(orderData.items[index].color)
          })

          // Verify tracking information if it was added
          if (trackingData) {
            expect(trackedOrder?.trackingNumber).toBe(trackingData.trackingNumber)
            expect(trackedOrder?.carrier).toBe(trackingData.carrier)
          }
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Additional test: Order creation validation
   * 
   * Verifies that orders are created with correct initial state.
   */
  it('should create orders with correct initial state', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createOrderDataArbitrary(),
        async (orderData) => {
          // Create order
          const order = await orderService.createOrder(orderData)

          // Verify initial state
          expect(order.id).toBeDefined()
          expect(order.orderNumber).toBeDefined()
          expect(order.orderNumber).toMatch(/^MW-/)
          expect(order.status).toBe('payment_confirmed')
          expect(order.customerEmail).toBe(orderData.customerEmail)
          expect(order.stripePaymentId).toBe(orderData.stripePaymentId)
          expect(order.items).toEqual(orderData.items)
          expect(order.shippingAddress).toEqual(orderData.shippingAddress)
          expect(order.gelatoOrderId).toBeUndefined()
          expect(order.trackingNumber).toBeUndefined()
          expect(order.carrier).toBeUndefined()
          expect(order.createdAt).toBeDefined()
          expect(order.updatedAt).toBeDefined()
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Additional test: Gelato submission validation
   * 
   * Verifies that only orders with payment_confirmed status can be submitted to Gelato.
   */
  it('should only submit payment_confirmed orders to Gelato', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createOrderDataArbitrary(),
        orderStatusArbitrary().filter(s => s !== 'payment_confirmed'),
        async (orderData, invalidStatus) => {
          // Create order
          const order = await orderService.createOrder(orderData)

          // Update to a different status
          await orderService.updateOrderStatus(order.id, invalidStatus as any)

          // Try to submit to Gelato
          await expect(
            orderService.submitToGelato(order.id)
          ).rejects.toThrow(/cannot be submitted to Gelato/i)
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)

  /**
   * Additional test: Order retrieval by ID
   * 
   * Verifies that orders can be retrieved by their ID.
   */
  it('should retrieve orders by ID', async () => {
    if (!supabaseConfigured) {
      console.log('⏭️  Skipping: Supabase not configured')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        createOrderDataArbitrary(),
        async (orderData) => {
          // Create order
          const order = await orderService.createOrder(orderData)

          // Retrieve by ID
          const retrieved = await orderService.getOrderById(order.id)

          // Verify it matches
          expect(retrieved).toBeDefined()
          expect(retrieved?.id).toBe(order.id)
          expect(retrieved?.orderNumber).toBe(order.orderNumber)
          expect(retrieved?.customerEmail).toBe(order.customerEmail)
          expect(retrieved?.status).toBe(order.status)
        }
      ),
      {
        numRuns: 3,
        verbose: false,
      }
    )
  }, 30000)
})
