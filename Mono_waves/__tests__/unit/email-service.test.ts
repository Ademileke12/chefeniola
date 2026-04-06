import type { OrderItem, ShippingAddress } from '@/types'

// Mock Resend before importing the email service
jest.mock('resend', () => {
  const mockEmailSend = jest.fn()
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: mockEmailSend,
      },
    })),
    mockEmailSend, // Export for test access
  }
})

// Import after mocking
import { emailService } from '@/lib/services/emailService'
import { Resend } from 'resend'

describe('Email Service', () => {
  let mockEmailSend: jest.Mock

  beforeEach(() => {
    // Get the mock from the Resend instance
    const resendInstance = new Resend('test-key')
    mockEmailSend = resendInstance.emails.send as jest.Mock
    
    jest.clearAllMocks()
    mockEmailSend.mockResolvedValue({ id: 'test-email-id' })
  })

  describe('Email Service Initialization', () => {
    it('should initialize without errors', () => {
      expect(emailService).toBeDefined()
      expect(emailService.sendOrderConfirmation).toBeDefined()
      expect(emailService.sendShippingNotification).toBeDefined()
      expect(emailService.sendAdminNotification).toBeDefined()
    })
  })

  describe('sendOrderConfirmation', () => {
    const sampleItems: OrderItem[] = [
      {
        productId: 'prod-1',
        productName: 'Test T-Shirt',
        size: 'M',
        color: 'Black',
        quantity: 2,
        price: 25.99,
        designUrl: 'https://example.com/design.png',
        gelatoProductUid: 'gelato-123',
      },
    ]

    const sampleAddress: ShippingAddress = {
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      addressLine2: 'Apt 4',
      city: 'New York',
      state: 'NY',
      postCode: '10001',
      country: 'USA',
      phone: '+1234567890',
    }

    it('should send order confirmation email with correct data', async () => {
      await emailService.sendOrderConfirmation({
        to: 'customer@example.com',
        orderNumber: 'MW-12345',
        customerName: 'John Doe',
        items: sampleItems,
        shippingAddress: sampleAddress,
        subtotal: 51.98,
        shippingCost: 10.0,
        tax: 5.2,
        total: 67.18,
        estimatedDelivery: 'January 15, 2024',
      })

      expect(mockEmailSend).toHaveBeenCalledTimes(1)
      expect(mockEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.any(String),
          to: 'customer@example.com',
          subject: 'Order Confirmation - MW-12345',
          html: expect.stringContaining('MW-12345'),
        })
      )
    })

    it('should include all order details in email template', async () => {
      await emailService.sendOrderConfirmation({
        to: 'customer@example.com',
        orderNumber: 'MW-12345',
        customerName: 'John Doe',
        items: sampleItems,
        shippingAddress: sampleAddress,
        subtotal: 51.98,
        shippingCost: 10.0,
        tax: 5.2,
        total: 67.18,
        estimatedDelivery: 'January 15, 2024',
      })

      const callArgs = mockEmailSend.mock.calls[0][0]
      const html = callArgs.html

      // Verify order details are in the HTML
      expect(html).toContain('MW-12345')
      expect(html).toContain('John Doe')
      expect(html).toContain('Test T-Shirt')
      expect(html).toContain('51.98')
      expect(html).toContain('10.00')
      expect(html).toContain('5.20')
      expect(html).toContain('67.18')
      expect(html).toContain('January 15, 2024')
      expect(html).toContain('123 Main St')
    })

    it('should handle multiple items in order', async () => {
      const multipleItems: OrderItem[] = [
        {
          productId: 'prod-1',
          productName: 'T-Shirt',
          size: 'M',
          color: 'Black',
          quantity: 2,
          price: 25.99,
          designUrl: 'https://example.com/design1.png',
          gelatoProductUid: 'gelato-123',
        },
        {
          productId: 'prod-2',
          productName: 'Hoodie',
          size: 'L',
          color: 'Blue',
          quantity: 1,
          price: 45.99,
          designUrl: 'https://example.com/design2.png',
          gelatoProductUid: 'gelato-456',
        },
      ]

      await emailService.sendOrderConfirmation({
        to: 'customer@example.com',
        orderNumber: 'MW-12345',
        customerName: 'John Doe',
        items: multipleItems,
        shippingAddress: sampleAddress,
        subtotal: 97.97,
        shippingCost: 10.0,
        tax: 9.8,
        total: 117.77,
        estimatedDelivery: 'January 15, 2024',
      })

      const callArgs = mockEmailSend.mock.calls[0][0]
      const html = callArgs.html

      expect(html).toContain('T-Shirt')
      expect(html).toContain('Hoodie')
      expect(html).toContain('25.99')
      expect(html).toContain('45.99')
    })

    it('should throw error when Resend API fails', async () => {
      mockEmailSend.mockRejectedValueOnce(new Error('API rate limit exceeded'))

      await expect(
        emailService.sendOrderConfirmation({
          to: 'customer@example.com',
          orderNumber: 'MW-12345',
          customerName: 'John Doe',
          items: sampleItems,
          shippingAddress: sampleAddress,
          subtotal: 51.98,
          shippingCost: 10.0,
          tax: 5.2,
          total: 67.18,
          estimatedDelivery: 'January 15, 2024',
        })
      ).rejects.toThrow('Email service error: API rate limit exceeded')
    })

    it('should handle zero tax amount', async () => {
      await emailService.sendOrderConfirmation({
        to: 'customer@example.com',
        orderNumber: 'MW-12345',
        customerName: 'John Doe',
        items: sampleItems,
        shippingAddress: sampleAddress,
        subtotal: 51.98,
        shippingCost: 10.0,
        tax: 0,
        total: 61.98,
        estimatedDelivery: 'January 15, 2024',
      })

      const callArgs = mockEmailSend.mock.calls[0][0]
      const html = callArgs.html

      expect(html).toContain('0.00')
      expect(html).toContain('61.98')
    })
  })

  describe('sendShippingNotification', () => {
    it('should send shipping notification email with tracking info', async () => {
      await emailService.sendShippingNotification({
        to: 'customer@example.com',
        orderNumber: 'MW-12345',
        customerName: 'John Doe',
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
        carrierTrackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
        estimatedDelivery: 'January 15, 2024',
      })

      expect(mockEmailSend).toHaveBeenCalledTimes(1)
      expect(mockEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.any(String),
          to: 'customer@example.com',
          subject: 'Your Order Has Shipped - MW-12345',
          html: expect.stringContaining('1Z999AA10123456784'),
        })
      )
    })

    it('should include tracking details in email template', async () => {
      await emailService.sendShippingNotification({
        to: 'customer@example.com',
        orderNumber: 'MW-12345',
        customerName: 'John Doe',
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
        carrierTrackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
        estimatedDelivery: 'January 15, 2024',
      })

      const callArgs = mockEmailSend.mock.calls[0][0]
      const html = callArgs.html

      expect(html).toContain('MW-12345')
      expect(html).toContain('John Doe')
      expect(html).toContain('1Z999AA10123456784')
      expect(html).toContain('UPS')
      expect(html).toContain('https://www.ups.com/track?tracknum=1Z999AA10123456784')
      expect(html).toContain('January 15, 2024')
    })

    it('should handle different carriers', async () => {
      const carriers = [
        { name: 'USPS', tracking: '9400111899562537866033' },
        { name: 'FedEx', tracking: '123456789012' },
        { name: 'DHL', tracking: '1234567890' },
      ]

      for (const carrier of carriers) {
        mockEmailSend.mockClear()
        
        await emailService.sendShippingNotification({
          to: 'customer@example.com',
          orderNumber: 'MW-12345',
          customerName: 'John Doe',
          trackingNumber: carrier.tracking,
          carrier: carrier.name,
          carrierTrackingUrl: `https://track.${carrier.name.toLowerCase()}.com/${carrier.tracking}`,
          estimatedDelivery: 'January 15, 2024',
        })

        const callArgs = mockEmailSend.mock.calls[0][0]
        const html = callArgs.html

        expect(html).toContain(carrier.name)
        expect(html).toContain(carrier.tracking)
      }
    })

    it('should throw error when Resend API fails', async () => {
      mockEmailSend.mockRejectedValueOnce(new Error('Network timeout'))

      await expect(
        emailService.sendShippingNotification({
          to: 'customer@example.com',
          orderNumber: 'MW-12345',
          customerName: 'John Doe',
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
          carrierTrackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
          estimatedDelivery: 'January 15, 2024',
        })
      ).rejects.toThrow('Email service error: Network timeout')
    })
  })

  describe('sendAdminNotification', () => {
    it('should send admin notification email', async () => {
      await emailService.sendAdminNotification({
        to: 'admin@monowaves.com',
        subject: 'Order Processing Error',
        message: 'Failed to submit order to Gelato',
        orderNumber: 'MW-12345',
        error: 'Error: API timeout after 30 seconds',
      })

      expect(mockEmailSend).toHaveBeenCalledTimes(1)
      expect(mockEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.any(String),
          to: 'admin@monowaves.com',
          subject: '[ADMIN] Order Processing Error',
          html: expect.stringContaining('Order Processing Error'),
        })
      )
    })

    it('should include error details in email template', async () => {
      await emailService.sendAdminNotification({
        to: 'admin@monowaves.com',
        subject: 'Order Processing Error',
        message: 'Failed to submit order to Gelato',
        orderNumber: 'MW-12345',
        error: 'Error: API timeout after 30 seconds',
      })

      const callArgs = mockEmailSend.mock.calls[0][0]
      const html = callArgs.html

      expect(html).toContain('Order Processing Error')
      expect(html).toContain('Failed to submit order to Gelato')
      expect(html).toContain('MW-12345')
      expect(html).toContain('Error: API timeout after 30 seconds')
    })

    it('should handle notification without order number', async () => {
      await emailService.sendAdminNotification({
        to: 'admin@monowaves.com',
        subject: 'System Alert',
        message: 'Database connection pool exhausted',
      })

      const callArgs = mockEmailSend.mock.calls[0][0]
      const html = callArgs.html

      expect(html).toContain('System Alert')
      expect(html).toContain('Database connection pool exhausted')
      expect(html).not.toContain('Order Information')
    })

    it('should handle notification without error details', async () => {
      await emailService.sendAdminNotification({
        to: 'admin@monowaves.com',
        subject: 'Info Notification',
        message: 'Daily report generated successfully',
      })

      const callArgs = mockEmailSend.mock.calls[0][0]
      const html = callArgs.html

      expect(html).toContain('Info Notification')
      expect(html).toContain('Daily report generated successfully')
      expect(html).not.toContain('Error Details')
    })

    it('should not throw error when Resend API fails', async () => {
      mockEmailSend.mockRejectedValueOnce(new Error('API error'))

      // Should not throw - admin notification failures should not break the main flow
      await expect(
        emailService.sendAdminNotification({
          to: 'admin@monowaves.com',
          subject: 'Test',
          message: 'Test message',
        })
      ).resolves.not.toThrow()
    })

    it('should handle long error stack traces', async () => {
      const longError = `Error: Something went wrong
        at Function.test (/app/lib/service.ts:123:45)
        at async handler (/app/api/route.ts:67:89)
        at async processRequest (/app/middleware.ts:12:34)
        at async Server.handleRequest (/node_modules/next/server.js:456:78)`

      await emailService.sendAdminNotification({
        to: 'admin@monowaves.com',
        subject: 'Error with Stack Trace',
        message: 'An error occurred',
        error: longError,
      })

      const callArgs = mockEmailSend.mock.calls[0][0]
      const html = callArgs.html

      expect(html).toContain('Error: Something went wrong')
      expect(html).toContain('at Function.test')
    })
  })
})
