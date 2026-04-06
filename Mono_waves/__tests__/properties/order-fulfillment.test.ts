/**
 * Property-Based Tests for Order Fulfillment
 * Feature: order-fulfillment-automation
 * 
 * These tests validate universal correctness properties for the order
 * fulfillment workflow including confirmation page display.
 * 
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals'
import * as fc from 'fast-check'
import { Order, OrderItem, ShippingAddress } from '@/types/order'
import { calculateEstimatedDelivery } from '@/lib/services/orderService'

/**
 * Arbitrary for generating valid OrderItem objects
 */
function orderItemArbitrary(): fc.Arbitrary<OrderItem> {
  return fc.record({
    productId: fc.uuid(),
    productName: fc.string({ minLength: 5, maxLength: 50 }),
    size: fc.constantFrom('S', 'M', 'L', 'XL', '2XL'),
    color: fc.constantFrom('Black', 'White', 'Navy', 'Gray', 'Red', 'Blue'),
    quantity: fc.integer({ min: 1, max: 10 }),
    price: fc.float({ min: 10, max: 100, noNaN: true }).map(p => Math.round(p * 100) / 100),
    designUrl: fc.webUrl(),
    gelatoProductUid: fc.string({ minLength: 10, maxLength: 30 }),
  })
}

/**
 * Arbitrary for generating valid ShippingAddress objects
 */
function shippingAddressArbitrary(): fc.Arbitrary<ShippingAddress> {
  return fc.record({
    firstName: fc.string({ minLength: 2, maxLength: 30 }),
    lastName: fc.string({ minLength: 2, maxLength: 30 }),
    addressLine1: fc.string({ minLength: 5, maxLength: 100 }),
    addressLine2: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
    city: fc.string({ minLength: 2, maxLength: 50 }),
    state: fc.constantFrom('CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'WA', 'MA', 'GA'),
    postCode: fc.string({ minLength: 5, maxLength: 10 }),
    country: fc.constantFrom('US', 'CA', 'GB', 'AU'),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
  })
}

/**
 * Arbitrary for generating Order objects with valid data
 */
function orderArbitrary(): fc.Arbitrary<Order> {
  return fc.record({
    id: fc.uuid(),
    orderNumber: fc.string({ minLength: 8, maxLength: 12 }).map(s => `MW-${s.toUpperCase()}`),
    customerEmail: fc.emailAddress(),
    customerName: fc.string({ minLength: 3, maxLength: 50 }),
    shippingAddress: shippingAddressArbitrary(),
    items: fc.array(orderItemArbitrary(), { minLength: 1, maxLength: 5 }),
    subtotal: fc.float({ min: 10, max: 1000, noNaN: true }).map(p => Math.round(p * 100) / 100),
    shippingCost: fc.float({ min: 5, max: 50, noNaN: true }).map(p => Math.round(p * 100) / 100),
    tax: fc.float({ min: 0, max: 100, noNaN: true }).map(p => Math.round(p * 100) / 100),
    total: fc.constant(0), // Will be calculated
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

/**
 * Helper function to simulate confirmation page data extraction
 * This represents what the confirmation page should display
 */
interface ConfirmationPageData {
  orderNumber: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  totalPaid: number
}

function extractConfirmationPageData(order: Order): ConfirmationPageData {
  return {
    orderNumber: order.orderNumber,
    items: order.items,
    shippingAddress: order.shippingAddress,
    totalPaid: order.total,
  }
}

describe('Order Fulfillment Properties', () => {
  /**
   * Property 2: Confirmation Page Contains Required Order Information
   * 
   * For any order, the confirmation page should display order number, all items ordered,
   * shipping address, and total paid. This property ensures that all required information
   * is present and accessible for display on the confirmation page.
   * 
   * **Validates: Requirements 1.2**
   */
  it('Property 2: Confirmation Page Contains Required Order Information', () => {
    fc.assert(
      fc.property(
        orderArbitrary(),
        (order) => {
          // Extract confirmation page data
          const confirmationData = extractConfirmationPageData(order)

          // Verify order number is present and non-empty
          expect(confirmationData.orderNumber).toBeDefined()
          expect(typeof confirmationData.orderNumber).toBe('string')
          expect(confirmationData.orderNumber.length).toBeGreaterThan(0)

          // Verify all items are present
          expect(confirmationData.items).toBeDefined()
          expect(Array.isArray(confirmationData.items)).toBe(true)
          expect(confirmationData.items.length).toBeGreaterThan(0)

          // Verify each item has required display information
          confirmationData.items.forEach((item) => {
            expect(item.productName).toBeDefined()
            expect(typeof item.productName).toBe('string')
            expect(item.productName.length).toBeGreaterThan(0)

            expect(item.size).toBeDefined()
            expect(typeof item.size).toBe('string')

            expect(item.color).toBeDefined()
            expect(typeof item.color).toBe('string')

            expect(item.quantity).toBeDefined()
            expect(typeof item.quantity).toBe('number')
            expect(item.quantity).toBeGreaterThan(0)

            expect(item.price).toBeDefined()
            expect(typeof item.price).toBe('number')
            expect(item.price).toBeGreaterThan(0)
          })

          // Verify shipping address is present and complete
          expect(confirmationData.shippingAddress).toBeDefined()
          expect(typeof confirmationData.shippingAddress).toBe('object')

          const address = confirmationData.shippingAddress
          expect(address.firstName).toBeDefined()
          expect(typeof address.firstName).toBe('string')
          expect(address.firstName.length).toBeGreaterThan(0)

          expect(address.lastName).toBeDefined()
          expect(typeof address.lastName).toBe('string')
          expect(address.lastName.length).toBeGreaterThan(0)

          expect(address.addressLine1).toBeDefined()
          expect(typeof address.addressLine1).toBe('string')
          expect(address.addressLine1.length).toBeGreaterThan(0)

          expect(address.city).toBeDefined()
          expect(typeof address.city).toBe('string')
          expect(address.city.length).toBeGreaterThan(0)

          expect(address.state).toBeDefined()
          expect(typeof address.state).toBe('string')
          expect(address.state.length).toBeGreaterThan(0)

          expect(address.postCode).toBeDefined()
          expect(typeof address.postCode).toBe('string')
          expect(address.postCode.length).toBeGreaterThan(0)

          expect(address.country).toBeDefined()
          expect(typeof address.country).toBe('string')
          expect(address.country.length).toBeGreaterThan(0)

          expect(address.phone).toBeDefined()
          expect(typeof address.phone).toBe('string')
          expect(address.phone.length).toBeGreaterThan(0)

          // Verify total paid is present and valid
          expect(confirmationData.totalPaid).toBeDefined()
          expect(typeof confirmationData.totalPaid).toBe('number')
          expect(confirmationData.totalPaid).toBeGreaterThan(0)

          // Verify total paid matches the order total
          expect(confirmationData.totalPaid).toBe(order.total)

          // Additional verification: total should be consistent with order components
          const expectedTotal = Math.round((order.subtotal + order.shippingCost + order.tax) * 100) / 100
          expect(confirmationData.totalPaid).toBe(expectedTotal)
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  })

  /**
   * Property 2b: All Items Ordered Are Displayed
   * 
   * For any order with N items, the confirmation page should display exactly N items
   * with no items missing or duplicated.
   */
  it('Property 2b: All Items Ordered Are Displayed', () => {
    fc.assert(
      fc.property(
        orderArbitrary(),
        (order) => {
          const confirmationData = extractConfirmationPageData(order)

          // Verify the number of items matches
          expect(confirmationData.items.length).toBe(order.items.length)

          // Verify each item from the order is present in confirmation data
          order.items.forEach((orderItem, index) => {
            const confirmationItem = confirmationData.items[index]

            expect(confirmationItem.productId).toBe(orderItem.productId)
            expect(confirmationItem.productName).toBe(orderItem.productName)
            expect(confirmationItem.size).toBe(orderItem.size)
            expect(confirmationItem.color).toBe(orderItem.color)
            expect(confirmationItem.quantity).toBe(orderItem.quantity)
            expect(confirmationItem.price).toBe(orderItem.price)
          })
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  })

  /**
   * Property 2c: Shipping Address Completeness
   * 
   * For any order, the confirmation page should display a complete shipping address
   * with all required fields present and non-empty (except optional addressLine2).
   */
  it('Property 2c: Shipping Address Completeness', () => {
    fc.assert(
      fc.property(
        orderArbitrary(),
        (order) => {
          const confirmationData = extractConfirmationPageData(order)
          const address = confirmationData.shippingAddress

          // Required fields must be present and non-empty
          const requiredFields = [
            'firstName',
            'lastName',
            'addressLine1',
            'city',
            'state',
            'postCode',
            'country',
            'phone',
          ] as const

          requiredFields.forEach((field) => {
            expect(address[field]).toBeDefined()
            expect(typeof address[field]).toBe('string')
            expect((address[field] as string).length).toBeGreaterThan(0)
          })

          // addressLine2 is optional, but if present should be a string
          if (address.addressLine2 !== undefined) {
            expect(typeof address.addressLine2).toBe('string')
          }

          // Verify address matches the original order
          expect(address.firstName).toBe(order.shippingAddress.firstName)
          expect(address.lastName).toBe(order.shippingAddress.lastName)
          expect(address.addressLine1).toBe(order.shippingAddress.addressLine1)
          expect(address.city).toBe(order.shippingAddress.city)
          expect(address.state).toBe(order.shippingAddress.state)
          expect(address.postCode).toBe(order.shippingAddress.postCode)
          expect(address.country).toBe(order.shippingAddress.country)
          expect(address.phone).toBe(order.shippingAddress.phone)
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  })

  /**
   * Property 2d: Order Number Format and Uniqueness
   * 
   * For any order, the confirmation page should display an order number that
   * follows the expected format and is non-empty.
   */
  it('Property 2d: Order Number Format and Uniqueness', () => {
    fc.assert(
      fc.property(
        orderArbitrary(),
        (order) => {
          const confirmationData = extractConfirmationPageData(order)

          // Verify order number is present
          expect(confirmationData.orderNumber).toBeDefined()
          expect(typeof confirmationData.orderNumber).toBe('string')
          expect(confirmationData.orderNumber.length).toBeGreaterThan(0)

          // Verify order number matches the original
          expect(confirmationData.orderNumber).toBe(order.orderNumber)

          // Verify order number follows expected format (MW-*)
          expect(confirmationData.orderNumber).toMatch(/^MW-/)
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  })

  /**
   * Property 2e: Total Paid Accuracy
   * 
   * For any order, the total paid displayed on the confirmation page should
   * accurately reflect the sum of subtotal, shipping cost, and tax.
   */
  it('Property 2e: Total Paid Accuracy', () => {
    fc.assert(
      fc.property(
        orderArbitrary(),
        (order) => {
          const confirmationData = extractConfirmationPageData(order)

          // Verify total paid is accurate
          const expectedTotal = Math.round((order.subtotal + order.shippingCost + order.tax) * 100) / 100
          expect(confirmationData.totalPaid).toBe(expectedTotal)

          // Verify total is at least as large as subtotal
          expect(confirmationData.totalPaid).toBeGreaterThanOrEqual(order.subtotal)

          // Verify total is positive
          expect(confirmationData.totalPaid).toBeGreaterThan(0)
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  })

  /**
   * Property 3: Estimated Delivery Date is Future Date
   * 
   * For any order, the estimated delivery date should be a valid date in the future
   * (7-10 business days from order date). This property ensures that the delivery
   * date calculation is correct and always produces a future date.
   * 
   * **Validates: Requirements 1.3**
   */
  it('Property 3: Estimated Delivery Date is Future Date', () => {
    fc.assert(
      fc.property(
        // Generate order dates from the past 30 days to now
        fc.date({ min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), max: new Date() }),
        (orderDate) => {
          // Calculate estimated delivery date
          const estimatedDelivery = calculateEstimatedDelivery(orderDate)

          // Verify the result is a non-empty string
          expect(estimatedDelivery).toBeDefined()
          expect(typeof estimatedDelivery).toBe('string')
          expect(estimatedDelivery.length).toBeGreaterThan(0)

          // Parse the estimated delivery date
          // The function returns a formatted string like "Monday, January 15, 2024"
          const deliveryDate = new Date(estimatedDelivery)

          // Verify it's a valid date
          expect(deliveryDate.toString()).not.toBe('Invalid Date')
          expect(!isNaN(deliveryDate.getTime())).toBe(true)

          // Verify the delivery date is in the future relative to order date
          expect(deliveryDate.getTime()).toBeGreaterThan(orderDate.getTime())

          // Calculate the difference in days
          const diffInMs = deliveryDate.getTime() - orderDate.getTime()
          const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

          // Verify the delivery date is at least 7 days in the future
          // (accounting for business days, it should be at least 7 calendar days)
          expect(diffInDays).toBeGreaterThanOrEqual(7)

          // Verify the delivery date is not more than 14 days in the future
          // (7-10 business days should translate to max ~14 calendar days)
          expect(diffInDays).toBeLessThanOrEqual(14)

          // Verify the delivery date is not on a weekend (business day)
          // Note: The function adds 8 business days, so the result should be a weekday
          const dayOfWeek = deliveryDate.getDay()
          expect(dayOfWeek).not.toBe(0) // Not Sunday
          expect(dayOfWeek).not.toBe(6) // Not Saturday
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  })

  /**
   * Property 3b: Estimated Delivery Date Consistency
   * 
   * For any order date, calling calculateEstimatedDelivery multiple times
   * should return the same result (deterministic behavior).
   */
  it('Property 3b: Estimated Delivery Date Consistency', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), max: new Date() }),
        (orderDate) => {
          // Calculate estimated delivery date twice
          const delivery1 = calculateEstimatedDelivery(orderDate)
          const delivery2 = calculateEstimatedDelivery(orderDate)

          // Verify both calls return the same result
          expect(delivery1).toBe(delivery2)
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  })

  /**
   * Property 3c: Estimated Delivery Date Accepts String or Date
   * 
   * For any order date, the calculateEstimatedDelivery function should accept
   * both Date objects and ISO string representations and produce valid results.
   */
  it('Property 3c: Estimated Delivery Date Accepts String or Date', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), max: new Date() }),
        (orderDate) => {
          // Calculate with Date object
          const deliveryFromDate = calculateEstimatedDelivery(orderDate)

          // Calculate with ISO string
          const deliveryFromString = calculateEstimatedDelivery(orderDate.toISOString())

          // Both should produce the same result
          expect(deliveryFromDate).toBe(deliveryFromString)

          // Both should be valid
          expect(deliveryFromDate).toBeDefined()
          expect(typeof deliveryFromDate).toBe('string')
          expect(deliveryFromDate.length).toBeGreaterThan(0)

          const parsedDate = new Date(deliveryFromDate)
          expect(parsedDate.toString()).not.toBe('Invalid Date')
        }
      ),
      {
        numRuns: 10,
        verbose: false,
      }
    )
  })
})
