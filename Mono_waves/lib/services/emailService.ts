import { Resend } from 'resend'
import type { OrderItem, ShippingAddress } from '@/types'
import {
  generateOrderConfirmationEmail,
  generateShippingNotificationEmail,
  generateAdminNotificationEmail,
} from '@/lib/email-templates'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Email configuration
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'orders@monowaves.com'
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@monowaves.com'

// Email data interfaces
export interface OrderConfirmationEmailData {
  to: string
  orderNumber: string
  customerName: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  estimatedDelivery: string
}

export interface ShippingNotificationEmailData {
  to: string
  orderNumber: string
  customerName: string
  trackingNumber: string
  carrier: string
  carrierTrackingUrl: string
  estimatedDelivery: string
}

export interface AdminNotificationEmailData {
  to: string
  subject: string
  message: string
  orderNumber?: string
  error?: string
}

/**
 * Email service for sending transactional emails using Resend
 */
export const emailService = {
  /**
   * Send order confirmation email to customer
   */
  async sendOrderConfirmation(data: OrderConfirmationEmailData): Promise<void> {
    try {
      const html = generateOrderConfirmationEmail({
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        items: data.items,
        shippingAddress: data.shippingAddress,
        subtotal: data.subtotal,
        shippingCost: data.shippingCost,
        tax: data.tax,
        total: data.total,
        estimatedDelivery: data.estimatedDelivery,
        supportEmail: SUPPORT_EMAIL,
      })

      await resend.emails.send({
        from: SENDER_EMAIL,
        to: data.to,
        replyTo: SUPPORT_EMAIL,
        subject: `Order Confirmation - ${data.orderNumber}`,
        html,
      })
    } catch (error) {
      console.error('Failed to send order confirmation email:', error)
      throw new Error(`Email service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Send shipping notification email to customer
   */
  async sendShippingNotification(data: ShippingNotificationEmailData): Promise<void> {
    try {
      const html = generateShippingNotificationEmail({
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        trackingNumber: data.trackingNumber,
        carrier: data.carrier,
        carrierTrackingUrl: data.carrierTrackingUrl,
        estimatedDelivery: data.estimatedDelivery,
        supportEmail: SUPPORT_EMAIL,
      })

      await resend.emails.send({
        from: SENDER_EMAIL,
        to: data.to,
        replyTo: SUPPORT_EMAIL,
        subject: `Your Order Has Shipped - ${data.orderNumber}`,
        html,
      })
    } catch (error) {
      console.error('Failed to send shipping notification email:', error)
      throw new Error(`Email service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Send admin notification email for errors or issues
   */
  async sendAdminNotification(data: AdminNotificationEmailData): Promise<void> {
    try {
      const html = generateAdminNotificationEmail({
        subject: data.subject,
        message: data.message,
        orderNumber: data.orderNumber,
        error: data.error,
        timestamp: new Date().toISOString(),
      })

      await resend.emails.send({
        from: SENDER_EMAIL,
        to: data.to,
        subject: `[ADMIN] ${data.subject}`,
        html,
      })
    } catch (error) {
      console.error('Failed to send admin notification email:', error)
      // Don't throw here - we don't want admin notification failures to break the main flow
    }
  },
}
