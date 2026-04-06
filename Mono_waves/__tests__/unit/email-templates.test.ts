import {
  generateOrderConfirmationEmail,
  generateShippingNotificationEmail,
  generateAdminNotificationEmail,
} from '@/lib/email-templates'
import type { OrderItem, ShippingAddress } from '@/types'

describe('Email Templates', () => {
  describe('Order Confirmation Email', () => {
    it('should generate valid HTML with all order details', () => {
      const items: OrderItem[] = [
        {
          id: '1',
          productName: 'Test T-Shirt',
          size: 'M',
          color: 'Black',
          quantity: 2,
          price: 25.99,
        },
      ]

      const shippingAddress: ShippingAddress = {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        addressLine2: 'Apt 4',
        city: 'New York',
        state: 'NY',
        postCode: '10001',
        country: 'USA',
      }

      const html = generateOrderConfirmationEmail({
        orderNumber: 'MW-12345',
        customerName: 'John Doe',
        items,
        shippingAddress,
        subtotal: 51.98,
        shippingCost: 10.0,
        tax: 5.2,
        total: 67.18,
        estimatedDelivery: 'January 15, 2024',
        supportEmail: 'support@monowaves.com',
      })

      // Verify HTML structure
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('Order Confirmed!')
      
      // Verify order details
      expect(html).toContain('MW-12345')
      expect(html).toContain('John Doe')
      expect(html).toContain('Test T-Shirt')
      expect(html).toContain('January 15, 2024')
      
      // Verify pricing
      expect(html).toContain('51.98')
      expect(html).toContain('10.00')
      expect(html).toContain('5.20')
      expect(html).toContain('67.18')
      
      // Verify shipping address
      expect(html).toContain('123 Main St')
      expect(html).toContain('Apt 4')
      expect(html).toContain('New York, NY 10001')
      
      // Verify branding
      expect(html).toContain('Mono Waves')
      expect(html).toContain('support@monowaves.com')
    })

    it('should handle missing address line 2', () => {
      const items: OrderItem[] = [
        {
          id: '1',
          productName: 'Test Product',
          size: 'L',
          color: 'Blue',
          quantity: 1,
          price: 30.0,
        },
      ]

      const shippingAddress: ShippingAddress = {
        firstName: 'Jane',
        lastName: 'Smith',
        addressLine1: '456 Oak Ave',
        addressLine2: '',
        city: 'Boston',
        state: 'MA',
        postCode: '02101',
        country: 'USA',
      }

      const html = generateOrderConfirmationEmail({
        orderNumber: 'MW-67890',
        customerName: 'Jane Smith',
        items,
        shippingAddress,
        subtotal: 30.0,
        shippingCost: 10.0,
        tax: 3.0,
        total: 43.0,
        estimatedDelivery: 'January 20, 2024',
        supportEmail: 'support@monowaves.com',
      })

      expect(html).toContain('456 Oak Ave')
      expect(html).toContain('Boston, MA 02101')
      // Should not have extra line breaks for missing address line 2
      expect(html).not.toContain('456 Oak Ave<br>\n                        <br>')
    })
  })

  describe('Shipping Notification Email', () => {
    it('should generate valid HTML with tracking information', () => {
      const html = generateShippingNotificationEmail({
        orderNumber: 'MW-12345',
        customerName: 'John Doe',
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
        carrierTrackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
        estimatedDelivery: 'January 15, 2024',
        supportEmail: 'support@monowaves.com',
      })

      // Verify HTML structure
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('Your Order Has Shipped!')
      
      // Verify tracking details
      expect(html).toContain('MW-12345')
      expect(html).toContain('John Doe')
      expect(html).toContain('1Z999AA10123456784')
      expect(html).toContain('UPS')
      expect(html).toContain('January 15, 2024')
      
      // Verify tracking link
      expect(html).toContain('https://www.ups.com/track?tracknum=1Z999AA10123456784')
      expect(html).toContain('Track Your Package')
      
      // Verify branding
      expect(html).toContain('Mono Waves')
      expect(html).toContain('support@monowaves.com')
    })
  })

  describe('Admin Notification Email', () => {
    it('should generate valid HTML with error details', () => {
      const html = generateAdminNotificationEmail({
        subject: 'Order Processing Error',
        message: 'Failed to submit order to Gelato API',
        orderNumber: 'MW-12345',
        error: 'Error: API timeout after 30 seconds',
        timestamp: '2024-01-10T12:00:00.000Z',
      })

      // Verify HTML structure
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('Admin Notification')
      
      // Verify notification details
      expect(html).toContain('Order Processing Error')
      expect(html).toContain('Failed to submit order to Gelato API')
      expect(html).toContain('MW-12345')
      expect(html).toContain('Error: API timeout after 30 seconds')
      expect(html).toContain('2024-01-10T12:00:00.000Z')
      
      // Verify branding
      expect(html).toContain('Mono Waves')
    })

    it('should handle notification without order number', () => {
      const html = generateAdminNotificationEmail({
        subject: 'System Alert',
        message: 'Database connection pool exhausted',
        timestamp: '2024-01-10T12:00:00.000Z',
      })

      expect(html).toContain('System Alert')
      expect(html).toContain('Database connection pool exhausted')
      // Should not have order information section
      expect(html).not.toContain('Order Information')
    })

    it('should handle notification without error details', () => {
      const html = generateAdminNotificationEmail({
        subject: 'Info Notification',
        message: 'Daily report generated successfully',
        timestamp: '2024-01-10T12:00:00.000Z',
      })

      expect(html).toContain('Info Notification')
      expect(html).toContain('Daily report generated successfully')
      // Should not have error details section
      expect(html).not.toContain('Error Details')
    })
  })
})
