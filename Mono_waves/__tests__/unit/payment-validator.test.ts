/**
 * Payment Validator Unit Tests
 * 
 * Tests payment validation logic including:
 * - Checkout session validation
 * - Payment amount validation
 * - Duplicate payment detection
 * - Webhook timestamp validation
 */

import { paymentValidator } from '@/lib/utils/paymentValidator'
import type { CartItem } from '@/types/cart'

describe('PaymentValidator', () => {
  describe('validateCheckoutSession', () => {
    it('should validate a valid checkout session', () => {
      const session = {
        id: 'cs_test_123',
        payment_status: 'paid',
        customer_details: {
          email: 'customer@example.com',
        },
        amount_total: 5000, // $50.00
        metadata: {},
        livemode: false,
      }

      const result = paymentValidator.validateCheckoutSession(session)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject null session', () => {
      const result = paymentValidator.validateCheckoutSession(null)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Session object is null or undefined')
    })

    it('should reject session without ID', () => {
      const session = {
        payment_status: 'paid',
        customer_details: { email: 'test@example.com' },
        amount_total: 5000,
      }

      const result = paymentValidator.validateCheckoutSession(session)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Session ID is missing')
    })

    it('should reject unpaid session', () => {
      const session = {
        id: 'cs_test_123',
        payment_status: 'unpaid',
        customer_details: { email: 'test@example.com' },
        amount_total: 5000,
      }

      const result = paymentValidator.validateCheckoutSession(session)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Payment status is not "paid": unpaid')
      expect(result.securityFlags).toContain('UNPAID_SESSION')
    })

    it('should reject session without customer email', () => {
      const session = {
        id: 'cs_test_123',
        payment_status: 'paid',
        customer_details: {},
        amount_total: 5000,
      }

      const result = paymentValidator.validateCheckoutSession(session)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Customer email is missing')
    })

    it('should reject session with invalid amount', () => {
      const session = {
        id: 'cs_test_123',
        payment_status: 'paid',
        customer_details: { email: 'test@example.com' },
        amount_total: 0,
      }

      const result = paymentValidator.validateCheckoutSession(session)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Amount total is missing or invalid')
      expect(result.securityFlags).toContain('INVALID_AMOUNT')
    })
  })

  describe('validatePaymentAmount', () => {
    const createCartItem = (price: number, quantity: number): CartItem => ({
      id: '1',
      productId: 'prod_1',
      productName: 'Test Product',
      size: 'M',
      color: 'Black',
      quantity,
      price,
      imageUrl: 'https://example.com/image.jpg',
    })

    it('should validate matching payment amounts', () => {
      const cartItems = [
        createCartItem(25.00, 2), // $50.00
        createCartItem(15.00, 1), // $15.00
      ]
      const subtotal = 65.00
      const tax = 5.20
      const shipping = 10.00
      const total = 80.20

      const result = paymentValidator.validatePaymentAmount(
        cartItems,
        total,
        tax,
        shipping
      )

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject mismatched payment amounts', () => {
      const cartItems = [createCartItem(25.00, 2)]
      const subtotal = 50.00
      const tax = 4.00
      const shipping = 10.00
      const sessionTotal = 100.00 // Wrong amount

      const result = paymentValidator.validatePaymentAmount(
        cartItems,
        sessionTotal,
        tax,
        shipping
      )

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Payment amount mismatch')
      expect(result.securityFlags).toContain('AMOUNT_MISMATCH')
    })

    it('should allow small floating point differences', () => {
      const cartItems = [createCartItem(25.00, 2)]
      const tax = 4.00
      const shipping = 10.00
      const total = 64.005 // Tiny difference due to floating point

      const result = paymentValidator.validatePaymentAmount(
        cartItems,
        total,
        tax,
        shipping
      )

      expect(result.isValid).toBe(true)
    })

    it('should reject negative item prices', () => {
      const cartItems = [createCartItem(-10.00, 1)]
      const tax = 0
      const shipping = 10.00
      const total = 0

      const result = paymentValidator.validatePaymentAmount(
        cartItems,
        total,
        tax,
        shipping
      )

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid price'))).toBe(true)
      expect(result.securityFlags).toContain('INVALID_ITEM_PRICE')
    })

    it('should reject invalid quantities', () => {
      const cartItems = [createCartItem(25.00, 0)]
      const tax = 0
      const shipping = 10.00
      const total = 10.00

      const result = paymentValidator.validatePaymentAmount(
        cartItems,
        total,
        tax,
        shipping
      )

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid quantity'))).toBe(true)
      expect(result.securityFlags).toContain('INVALID_QUANTITY')
    })

    it('should reject negative tax', () => {
      const cartItems = [createCartItem(25.00, 2)]
      const tax = -5.00
      const shipping = 10.00
      const total = 55.00

      const result = paymentValidator.validatePaymentAmount(
        cartItems,
        total,
        tax,
        shipping
      )

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Negative tax'))).toBe(true)
      expect(result.securityFlags).toContain('NEGATIVE_TAX')
    })

    it('should reject negative shipping', () => {
      const cartItems = [createCartItem(25.00, 2)]
      const tax = 4.00
      const shipping = -10.00
      const total = 44.00

      const result = paymentValidator.validatePaymentAmount(
        cartItems,
        total,
        tax,
        shipping
      )

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Negative shipping'))).toBe(true)
      expect(result.securityFlags).toContain('NEGATIVE_SHIPPING')
    })

    it('should warn on suspiciously low prices', () => {
      const cartItems = [createCartItem(0.50, 1)]
      const tax = 0.04
      const shipping = 10.00
      const total = 10.54

      const result = paymentValidator.validatePaymentAmount(
        cartItems,
        total,
        tax,
        shipping
      )

      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.includes('Unusually low price'))).toBe(true)
    })

    it('should warn on high quantities', () => {
      const cartItems = [createCartItem(25.00, 150)]
      const tax = 300.00
      const shipping = 10.00
      const total = 4060.00

      const result = paymentValidator.validatePaymentAmount(
        cartItems,
        total,
        tax,
        shipping
      )

      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.includes('High quantity'))).toBe(true)
    })
  })

  describe('validateWebhookTimestamp', () => {
    it('should accept recent timestamp', () => {
      const now = Math.floor(Date.now() / 1000)
      const result = paymentValidator.validateWebhookTimestamp(now)

      expect(result).toBe(true)
    })

    it('should accept timestamp within 5 minutes', () => {
      const fourMinutesAgo = Math.floor(Date.now() / 1000) - (4 * 60)
      const result = paymentValidator.validateWebhookTimestamp(fourMinutesAgo)

      expect(result).toBe(true)
    })

    it('should reject timestamp older than 5 minutes', () => {
      const sixMinutesAgo = Math.floor(Date.now() / 1000) - (6 * 60)
      const result = paymentValidator.validateWebhookTimestamp(sixMinutesAgo)

      expect(result).toBe(false)
    })

    it('should reject future timestamp', () => {
      const future = Math.floor(Date.now() / 1000) + 60
      const result = paymentValidator.validateWebhookTimestamp(future)

      expect(result).toBe(false)
    })

    it('should reject invalid timestamp', () => {
      expect(paymentValidator.validateWebhookTimestamp(0)).toBe(false)
      expect(paymentValidator.validateWebhookTimestamp(-1)).toBe(false)
    })
  })
})
