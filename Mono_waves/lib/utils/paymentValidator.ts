/**
 * Payment Validator
 * 
 * Validates payment integrity and prevents manipulation.
 * Ensures payment amounts match cart totals and detects duplicate payments.
 * 
 * Requirements: 1.2, 1.3, 1.5
 */

import { supabaseAdmin } from '@/lib/supabase/server'
import type { CartItem } from '@/types/cart'

// ============================================================================
// Types
// ============================================================================

export interface PaymentValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  securityFlags: string[]
}

// ============================================================================
// Payment Validator Class
// ============================================================================

class PaymentValidator {
  /**
   * Validate Stripe checkout session
   * 
   * Checks that all required fields are present and valid.
   * 
   * @param session - Stripe checkout session object
   * @returns Validation result
   */
  validateCheckoutSession(session: any): PaymentValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const securityFlags: string[] = []

    // Check required fields
    if (!session) {
      errors.push('Session object is null or undefined')
      return { isValid: false, errors, warnings, securityFlags }
    }

    if (!session.id) {
      errors.push('Session ID is missing')
    }

    if (!session.payment_status) {
      errors.push('Payment status is missing')
    } else if (session.payment_status !== 'paid') {
      errors.push(`Payment status is not "paid": ${session.payment_status}`)
      securityFlags.push('UNPAID_SESSION')
    }

    if (!session.customer_details?.email) {
      errors.push('Customer email is missing')
    }

    if (!session.amount_total || session.amount_total <= 0) {
      errors.push('Amount total is missing or invalid')
      securityFlags.push('INVALID_AMOUNT')
    }

    if (!session.metadata) {
      warnings.push('Session metadata is missing')
    }

    // Check for test mode in production
    if (session.livemode === false && process.env.NODE_ENV === 'production') {
      warnings.push('Test mode session detected in production environment')
      securityFlags.push('TEST_MODE_IN_PRODUCTION')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      securityFlags,
    }
  }

  /**
   * Validate payment amount matches cart total
   * 
   * Calculates expected total from cart items and compares with Stripe session amount.
   * Prevents price manipulation attacks.
   * 
   * @param cartItems - Array of cart items
   * @param sessionTotal - Total amount from Stripe session (in dollars)
   * @param tax - Tax amount (in dollars)
   * @param shipping - Shipping cost (in dollars)
   * @returns Validation result
   */
  validatePaymentAmount(
    cartItems: CartItem[],
    sessionTotal: number,
    tax: number,
    shipping: number
  ): PaymentValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const securityFlags: string[] = []

    // Calculate expected subtotal from cart items
    const calculatedSubtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )

    // Calculate expected total
    const calculatedTotal = calculatedSubtotal + tax + shipping

    // Allow for small floating point differences (1 cent)
    const tolerance = 0.01
    const difference = Math.abs(calculatedTotal - sessionTotal)

    if (difference > tolerance) {
      errors.push(
        `Payment amount mismatch: Expected $${calculatedTotal.toFixed(2)}, got $${sessionTotal.toFixed(2)} (difference: $${difference.toFixed(2)})`
      )
      securityFlags.push('AMOUNT_MISMATCH')
    }

    // Validate individual item prices are reasonable
    for (const item of cartItems) {
      if (item.price <= 0) {
        errors.push(`Invalid price for item ${item.productName}: $${item.price}`)
        securityFlags.push('INVALID_ITEM_PRICE')
      }

      if (item.quantity <= 0) {
        errors.push(`Invalid quantity for item ${item.productName}: ${item.quantity}`)
        securityFlags.push('INVALID_QUANTITY')
      }

      // Warn if price is suspiciously low (less than $1)
      if (item.price < 1.0) {
        warnings.push(`Unusually low price for item ${item.productName}: $${item.price}`)
      }

      // Warn if quantity is very high (more than 100)
      if (item.quantity > 100) {
        warnings.push(`High quantity for item ${item.productName}: ${item.quantity}`)
      }
    }

    // Validate tax is reasonable (0-20% of subtotal)
    const maxTaxRate = 0.20
    if (tax > calculatedSubtotal * maxTaxRate) {
      warnings.push(
        `Tax amount seems high: $${tax.toFixed(2)} (${((tax / calculatedSubtotal) * 100).toFixed(1)}% of subtotal)`
      )
    }

    if (tax < 0) {
      errors.push(`Negative tax amount: $${tax.toFixed(2)}`)
      securityFlags.push('NEGATIVE_TAX')
    }

    // Validate shipping is reasonable
    if (shipping < 0) {
      errors.push(`Negative shipping cost: $${shipping.toFixed(2)}`)
      securityFlags.push('NEGATIVE_SHIPPING')
    }

    if (shipping > 100) {
      warnings.push(`High shipping cost: $${shipping.toFixed(2)}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      securityFlags,
    }
  }

  /**
   * Detect duplicate payment
   * 
   * Checks if an order already exists for the given session ID.
   * Prevents duplicate order creation from webhook retries.
   * 
   * @param sessionId - Stripe session ID
   * @returns True if duplicate payment detected, false otherwise
   */
  async detectDuplicatePayment(sessionId: string): Promise<boolean> {
    if (!sessionId) {
      return false
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .single()

      // If we found an order, it's a duplicate
      if (data) {
        return true
      }

      // PGRST116 means no rows found, which is expected for new payments
      if (error && error.code !== 'PGRST116') {
        console.error('[PaymentValidator] Error checking for duplicate payment:', error)
      }

      return false
    } catch (error) {
      console.error('[PaymentValidator] Unexpected error checking for duplicate payment:', error)
      return false
    }
  }

  /**
   * Validate webhook timestamp
   * 
   * Prevents replay attacks by checking if the webhook timestamp is recent.
   * Rejects webhooks older than 5 minutes.
   * 
   * @param timestamp - Unix timestamp from webhook header
   * @returns True if timestamp is valid, false otherwise
   */
  validateWebhookTimestamp(timestamp: number): boolean {
    if (!timestamp || timestamp <= 0) {
      return false
    }

    const now = Math.floor(Date.now() / 1000)
    const maxAge = 5 * 60 // 5 minutes in seconds

    // Check if timestamp is in the past and not too old
    if (timestamp > now) {
      // Timestamp is in the future
      return false
    }

    if (now - timestamp > maxAge) {
      // Timestamp is too old
      return false
    }

    return true
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const paymentValidator = new PaymentValidator()
