/**
 * Tracking Service
 * 
 * Manages tracking number delivery and notifications.
 * Processes tracking updates from Gelato webhooks and sends customer notifications.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.7
 */

import { supabaseAdmin } from '@/lib/supabase/server'
import { emailService } from './emailService'
import { orderService } from './orderService'
import { auditService } from './auditService'
import { logger } from '../logger'
import type { Order } from '@/types/order'

// ============================================================================
// Types
// ============================================================================

export interface TrackingInfo {
  orderId: string
  orderNumber: string
  trackingNumber: string
  carrier: string
  trackingUrl: string
  status: string
  estimatedDelivery?: Date
  receivedAt: Date
}

// ============================================================================
// Tracking Service Class
// ============================================================================

class TrackingService {
  /**
   * Process tracking update from Gelato webhook
   * 
   * Updates order with tracking information and sends notification email.
   * 
   * @param orderId - Internal order ID
   * @param trackingNumber - Tracking number from carrier
   * @param carrier - Carrier name (USPS, UPS, FedEx, DHL, etc.)
   * @returns Promise that resolves when processing is complete
   */
  async processTrackingUpdate(
    orderId: string,
    trackingNumber: string,
    carrier: string
  ): Promise<void> {
    if (!orderId) {
      throw new Error('Order ID is required')
    }

    if (!trackingNumber) {
      throw new Error('Tracking number is required')
    }

    if (!carrier) {
      throw new Error('Carrier is required')
    }

    try {
      logger.info('Processing tracking update', {
        orderId,
        trackingNumber,
        carrier,
      })

      // Validate tracking number format
      const isValid = this.validateTrackingNumber(trackingNumber, carrier)
      if (!isValid) {
        logger.warn('Invalid tracking number format', {
          orderId,
          trackingNumber,
          carrier,
        })
        // Continue processing even with invalid format
      }

      // Update order with tracking information
      await orderService.updateOrderStatus(orderId, 'shipped', {
        trackingNumber,
        carrier,
      })

      logger.info('Order updated with tracking information', {
        orderId,
        trackingNumber,
        carrier,
      })

      // Send tracking notification email
      await this.sendTrackingNotification(orderId)

      logger.info('Tracking notification sent successfully', {
        orderId,
        trackingNumber,
      })
    } catch (error) {
      logger.error('Failed to process tracking update', {
        orderId,
        trackingNumber,
        carrier,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Send tracking notification email to customer
   * 
   * Includes retry logic to handle temporary email delivery failures.
   * 
   * @param orderId - Internal order ID
   * @returns Promise that resolves when email is sent
   */
  async sendTrackingNotification(orderId: string): Promise<void> {
    if (!orderId) {
      throw new Error('Order ID is required')
    }

    // Fetch order details
    const order = await orderService.getOrderById(orderId)
    if (!order) {
      throw new Error(`Order not found: ${orderId}`)
    }

    if (!order.trackingNumber || !order.carrier) {
      throw new Error(`Order ${orderId} does not have tracking information`)
    }

    // Retry logic: 3 attempts with 5 second delay
    const maxRetries = 3
    const retryDelay = 5000 // 5 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Sending tracking email (attempt ${attempt}/${maxRetries})`, {
          orderId,
          orderNumber: order.orderNumber,
          email: order.customerEmail,
        })

        // Generate tracking URL
        const trackingUrl = orderService.getCarrierTrackingUrl(
          order.carrier,
          order.trackingNumber
        )

        // Send email using email service
        await emailService.sendShippingNotification({
          to: order.customerEmail,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          trackingNumber: order.trackingNumber,
          carrier: order.carrier,
          carrierTrackingUrl: trackingUrl,
          estimatedDelivery: order.createdAt, // Will be formatted by email template
        })

        logger.info('Tracking email sent successfully', {
          orderId,
          orderNumber: order.orderNumber,
          attempt,
        })

        // Log tracking email sent event to audit service
        await auditService.logEvent({
          eventType: 'tracking.email_sent',
          severity: 'info',
          source: 'system',
          correlationId: order.correlationId || 'unknown',
          metadata: {
            orderId,
            orderNumber: order.orderNumber,
            customerEmail: order.customerEmail,
            trackingNumber: order.trackingNumber,
            carrier: order.carrier,
            attempt,
          },
        })

        // Success - exit retry loop
        return
      } catch (error) {
        logger.error(`Failed to send tracking email (attempt ${attempt}/${maxRetries})`, {
          orderId,
          orderNumber: order.orderNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw new Error(
            `Failed to send tracking email after ${maxRetries} attempts: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          )
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }
    }
  }

  /**
   * Get tracking information for an order
   * 
   * @param orderNumber - Order number (visible to customer)
   * @returns Tracking information or null if not found
   */
  async getTrackingInfo(orderNumber: string): Promise<TrackingInfo | null> {
    if (!orderNumber) {
      throw new Error('Order number is required')
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new Error(`Failed to fetch tracking info: ${error.message}`)
      }

      if (!data.tracking_number || !data.carrier) {
        return null // No tracking information available
      }

      // Generate tracking URL
      const trackingUrl = orderService.getCarrierTrackingUrl(
        data.carrier,
        data.tracking_number
      )

      return {
        orderId: data.id,
        orderNumber: data.order_number,
        trackingNumber: data.tracking_number,
        carrier: data.carrier,
        trackingUrl,
        status: data.status,
        receivedAt: new Date(data.updated_at),
      }
    } catch (error) {
      logger.error('Failed to get tracking info', {
        orderNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Validate tracking number format by carrier
   * 
   * Performs basic format validation based on carrier patterns.
   * Note: This is not exhaustive and may have false positives/negatives.
   * 
   * @param trackingNumber - Tracking number to validate
   * @param carrier - Carrier name
   * @returns True if format appears valid, false otherwise
   */
  validateTrackingNumber(trackingNumber: string, carrier: string): boolean {
    if (!trackingNumber || !carrier) {
      return false
    }

    const normalizedCarrier = carrier.toLowerCase()
    const cleanedNumber = trackingNumber.replace(/\s/g, '') // Remove spaces

    // USPS patterns
    if (normalizedCarrier.includes('usps')) {
      // USPS tracking numbers are typically 20-22 digits
      // Common formats: 9400 1000 0000 0000 0000 00 (20 digits)
      //                 9205 5000 0000 0000 0000 00 (20 digits)
      //                 EC 000 000 000 US (13 characters)
      return /^(94|93|92|91|82|81|80)\d{18,20}$/.test(cleanedNumber) ||
             /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(cleanedNumber)
    }

    // UPS patterns
    if (normalizedCarrier.includes('ups')) {
      // UPS tracking numbers are typically 18 characters starting with "1Z"
      // Format: 1Z 999 AA1 01 2345 6784
      return /^1Z[A-Z0-9]{16}$/.test(cleanedNumber)
    }

    // FedEx patterns
    if (normalizedCarrier.includes('fedex')) {
      // FedEx tracking numbers are typically 12 or 15 digits
      return /^\d{12}$/.test(cleanedNumber) || /^\d{15}$/.test(cleanedNumber)
    }

    // DHL patterns
    if (normalizedCarrier.includes('dhl')) {
      // DHL tracking numbers are typically 10 or 11 digits
      return /^\d{10,11}$/.test(cleanedNumber)
    }

    // For unknown carriers, just check if it's not empty and has reasonable length
    return cleanedNumber.length >= 8 && cleanedNumber.length <= 30
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const trackingService = new TrackingService()
