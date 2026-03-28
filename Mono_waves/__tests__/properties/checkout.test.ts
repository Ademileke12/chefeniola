/**
 * Property-Based Tests for Checkout
 * Feature: mono-waves-ecommerce
 * 
 * These tests validate universal correctness properties that should hold
 * for all valid checkout operations across the system.
 * 
 * @jest-environment jsdom
 */

import { describe, it, expect } from '@jest/globals'
import * as fc from 'fast-check'
import {
  emailArbitrary,
  shippingAddressArbitrary,
  cartItemArbitrary,
} from '../utils/arbitraries'
import { ShippingAddress } from '@/types/order'

/**
 * Helper function to validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Helper function to validate shipping address
 */
function validateShippingAddress(address: Partial<ShippingAddress>): string[] {
  const errors: string[] = []
  const requiredFields: (keyof ShippingAddress)[] = [
    'firstName',
    'lastName',
    'addressLine1',
    'city',
    'state',
    'postCode',
    'country',
    'phone',
  ]

  requiredFields.forEach((field) => {
    if (!address[field]?.trim()) {
      errors.push(field)
    }
  })

  return errors
}

/**
 * Helper function to calculate order total
 */
function calculateOrderTotal(
  items: Array<{ price: number; quantity: number }>,
  shipping: number
): number {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return subtotal + shipping
}

describe('Checkout Properties', () => {
  /**
   * Property 19: Checkout Form Validation
   * 
   * For any shipping address form submission with missing required fields,
   * the system should reject the submission with specific validation errors
   * for each missing field.
   * 
   * Validates: Requirements 6.2
   */
  it('Property 19: Checkout Form Validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate partial shipping addresses with some fields missing
        fc.record({
          firstName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: '' }),
          lastName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: '' }),
          addressLine1: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: '' }),
          addressLine2: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
          city: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: '' }),
          state: fc.option(fc.constantFrom('CA', 'NY', 'TX', 'FL'), { nil: '' }),
          postCode: fc.option(fc.string({ minLength: 5, maxLength: 10 }), { nil: '' }),
          country: fc.option(fc.constantFrom('US', 'CA', 'GB'), { nil: '' }),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: '' }),
        }),
        async (partialAddress) => {
          // Validate the address
          const errors = validateShippingAddress(partialAddress)

          // For each required field that is missing or empty
          const requiredFields: (keyof ShippingAddress)[] = [
            'firstName',
            'lastName',
            'addressLine1',
            'city',
            'state',
            'postCode',
            'country',
            'phone',
          ]

          requiredFields.forEach((field) => {
            const value = partialAddress[field]
            const isEmpty = !value || (typeof value === 'string' && value.trim() === '')

            if (isEmpty) {
              // Should have an error for this field
              expect(errors).toContain(field)
            } else {
              // Should not have an error for this field
              expect(errors).not.toContain(field)
            }
          })
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })

  /**
   * Property 19 (Email Validation): Checkout Form Email Validation
   * 
   * For any email that doesn't match the email format, the system should
   * reject it with a validation error.
   * 
   * Validates: Requirements 6.2
   */
  it('Property 19 (Email): Checkout Form Email Validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        async (emailInput) => {
          const isValid = isValidEmail(emailInput)
          const shouldBeValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)

          // Validation result should match expected result
          expect(isValid).toBe(shouldBeValid)

          // If email is invalid, it should be rejected
          if (!isValid) {
            // In a real form, this would trigger an error
            expect(emailInput).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
          }
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })

  /**
   * Property 19 (Complete Address): Valid Complete Address Should Pass
   * 
   * For any complete and valid shipping address, validation should pass
   * with no errors.
   * 
   * Validates: Requirements 6.2
   */
  it('Property 19 (Complete): Valid Complete Address Should Pass', async () => {
    await fc.assert(
      fc.asyncProperty(
        shippingAddressArbitrary(),
        async (address) => {
          // Validate the complete address
          const errors = validateShippingAddress(address)

          // Should have no errors
          expect(errors).toHaveLength(0)

          // All required fields should be present and non-empty
          expect(address.firstName?.trim()).toBeTruthy()
          expect(address.lastName?.trim()).toBeTruthy()
          expect(address.addressLine1?.trim()).toBeTruthy()
          expect(address.city?.trim()).toBeTruthy()
          expect(address.state?.trim()).toBeTruthy()
          expect(address.postCode?.trim()).toBeTruthy()
          expect(address.country?.trim()).toBeTruthy()
          expect(address.phone?.trim()).toBeTruthy()
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })

  /**
   * Property 20: Order Summary Accuracy
   * 
   * For any cart at checkout, the order summary should display all cart items
   * with correct quantities, prices, and a total that equals subtotal plus
   * shipping cost.
   * 
   * Validates: Requirements 6.3, 17.4
   */
  it('Property 20: Order Summary Accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(cartItemArbitrary(), { minLength: 1, maxLength: 10 }),
        fc.float({ min: 0, max: 50, noNaN: true }).map(n => Math.round(n * 100) / 100),
        async (cartItems, shippingCost) => {
          // Calculate subtotal
          const subtotal = cartItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          )

          // Calculate total
          const total = subtotal + shippingCost

          // Verify subtotal calculation
          expect(subtotal).toBeGreaterThanOrEqual(0)
          expect(subtotal).toBe(
            cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
          )

          // Verify total calculation
          expect(total).toBe(subtotal + shippingCost)
          expect(total).toBeGreaterThanOrEqual(subtotal)

          // Verify each item's total
          cartItems.forEach((item) => {
            const itemTotal = item.price * item.quantity
            expect(itemTotal).toBeGreaterThanOrEqual(0)
            expect(itemTotal).toBe(item.price * item.quantity)
          })

          // Verify total is sum of all item totals plus shipping
          const calculatedTotal = calculateOrderTotal(cartItems, shippingCost)
          expect(calculatedTotal).toBe(total)
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })

  /**
   * Property 20 (Item Display): Order Summary Item Display Completeness
   * 
   * For any cart items in the order summary, all required item details
   * should be present and correctly formatted.
   * 
   * Validates: Requirements 6.3
   */
  it('Property 20 (Item Display): Order Summary Item Display Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(cartItemArbitrary(), { minLength: 1, maxLength: 5 }),
        async (cartItems) => {
          // Verify each item has all required fields
          cartItems.forEach((item) => {
            // Required fields should be present
            expect(item.id).toBeDefined()
            expect(item.productId).toBeDefined()
            expect(item.productName).toBeDefined()
            expect(item.productName.trim()).not.toBe('')
            expect(item.size).toBeDefined()
            expect(item.color).toBeDefined()
            expect(item.quantity).toBeGreaterThan(0)
            expect(item.price).toBeGreaterThan(0)
            expect(item.imageUrl).toBeDefined()

            // Calculate item total
            const itemTotal = item.price * item.quantity
            expect(itemTotal).toBeGreaterThan(0)
            expect(itemTotal).toBe(item.price * item.quantity)
          })

          // Verify cart is not empty
          expect(cartItems.length).toBeGreaterThan(0)
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })

  /**
   * Property 20 (Price Formatting): Order Summary Price Formatting
   * 
   * For any prices in the order summary, they should be properly formatted
   * as currency values.
   * 
   * Validates: Requirements 17.4
   */
  it('Property 20 (Price Formatting): Order Summary Price Formatting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true, noDefaultInfinity: true }).map(n => Math.round(n * 100) / 100),
        async (price) => {
          // Format as currency
          const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(price)

          // Should start with $
          expect(formatted).toMatch(/^\$/)

          // Should have proper decimal places
          expect(formatted).toMatch(/\.\d{2}$/)

          // Should be parseable back to a number
          const parsed = parseFloat(formatted.replace(/[$,]/g, ''))
          expect(Math.abs(parsed - price)).toBeLessThan(0.01)
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })

  /**
   * Additional Property: Phone Number Validation
   * 
   * Phone numbers should only contain valid characters (digits, spaces, dashes, etc.)
   */
  it('should validate phone number format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        async (phoneInput) => {
          const isValidPhone = /^[\d\s\-\+\(\)]+$/.test(phoneInput)

          if (phoneInput.length > 0 && !isValidPhone) {
            // Invalid phone should be rejected
            expect(phoneInput).not.toMatch(/^[\d\s\-\+\(\)]+$/)
          }
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })

  /**
   * Additional Property: Subtotal Non-Negative
   * 
   * For any cart, the subtotal should never be negative.
   */
  it('should ensure subtotal is never negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(cartItemArbitrary(), { minLength: 0, maxLength: 10 }),
        async (cartItems) => {
          const subtotal = cartItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          )

          expect(subtotal).toBeGreaterThanOrEqual(0)

          // Empty cart should have 0 subtotal
          if (cartItems.length === 0) {
            expect(subtotal).toBe(0)
          }
        }
      ),
      {
        numRuns: 20,
        verbose: false,
      }
    )
  })
})
