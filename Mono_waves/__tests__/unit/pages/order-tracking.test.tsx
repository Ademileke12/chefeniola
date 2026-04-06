/**
 * Unit tests for Order Tracking Page
 * 
 * Tests:
 * - Form validation
 * - Successful order lookup
 * - Failed order lookup
 * - Tracking info display
 * - Carrier URL generation for known carriers
 * 
 * Requirements: 6.2, 6.3, 6.4
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSearchParams } from 'next/navigation'
import OrderTrackingPage from '@/app/order/track/page'
import type { Order } from '@/types/order'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('Order Tracking Page', () => {
  const mockOrder: Order = {
    id: 'order-123',
    orderNumber: 'MW-ABC123',
    customerEmail: 'customer@example.com',
    customerName: 'John Doe',
    shippingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      addressLine2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      postCode: '10001',
      country: 'US',
      phone: '+1234567890',
    },
    items: [
      {
        productId: 'prod-1',
        productName: 'Custom T-Shirt',
        gelatoProductUid: 'tshirt-001',
        size: 'M',
        color: 'Black',
        quantity: 2,
        price: 25.00,
        designUrl: 'https://example.com/design.png',
      },
    ],
    subtotal: 50.00,
    shippingCost: 10.00,
    tax: 4.50,
    total: 64.50,
    stripePaymentId: 'pi_123',
    stripeSessionId: 'cs_test_123',
    status: 'shipped',
    trackingNumber: '1Z999AA10123456784',
    carrier: 'UPS',
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-10T14:30:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    })
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Requirement 6.2: Form validation', () => {
    it('should render tracking form with email and order number inputs', () => {
      render(<OrderTrackingPage />)

      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Order Number/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Track Order/i })).toBeInTheDocument()
    })

    it('should require email field', async () => {
      const user = userEvent.setup()
      render(<OrderTrackingPage />)

      const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /Track Order/i })

      // Try to submit without email
      await user.click(submitButton)

      // HTML5 validation should prevent submission
      expect(emailInput.validity.valid).toBe(false)
      expect(emailInput.validity.valueMissing).toBe(true)
    })

    it('should require order number field', async () => {
      const user = userEvent.setup()
      render(<OrderTrackingPage />)

      const orderNumberInput = screen.getByLabelText(/Order Number/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /Track Order/i })

      // Try to submit without order number
      await user.click(submitButton)

      // HTML5 validation should prevent submission
      expect(orderNumberInput.validity.valid).toBe(false)
      expect(orderNumberInput.validity.valueMissing).toBe(true)
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()
      render(<OrderTrackingPage />)

      const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement

      // Enter invalid email
      await user.type(emailInput, 'invalid-email')

      // HTML5 validation should mark as invalid
      expect(emailInput.validity.valid).toBe(false)
      expect(emailInput.validity.typeMismatch).toBe(true)
    })

    it('should accept valid email format', async () => {
      const user = userEvent.setup()
      render(<OrderTrackingPage />)

      const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement

      // Enter valid email
      await user.type(emailInput, 'customer@example.com')

      // HTML5 validation should mark as valid
      expect(emailInput.validity.valid).toBe(true)
    })

    it('should pre-populate form fields from URL parameters', () => {
      ;(useSearchParams as jest.Mock).mockReturnValue({
        get: jest.fn((param: string) => {
          if (param === 'email') return 'customer@example.com'
          if (param === 'orderNumber') return 'MW-ABC123'
          return null
        }),
      })

      render(<OrderTrackingPage />)

      const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement
      const orderNumberInput = screen.getByLabelText(/Order Number/i) as HTMLInputElement

      expect(emailInput.value).toBe('customer@example.com')
      expect(orderNumberInput.value).toBe('MW-ABC123')
    })
  })

  describe('Requirement 6.2: Successful order lookup', () => {
    it('should submit form and display order information on success', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      render(<OrderTrackingPage />)

      // Fill in form
      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')

      // Submit form
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/orders/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'customer@example.com',
            orderNumber: 'MW-ABC123',
          }),
        })
      })

      // Verify order details are displayed
      await waitFor(() => {
        expect(screen.getByText('MW-ABC123')).toBeInTheDocument()
        expect(screen.getByText('Custom T-Shirt')).toBeInTheDocument()
      })
    })

    it('should display loading state during API call', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ order: mockOrder }),
        }), 100))
      )

      render(<OrderTrackingPage />)

      // Fill in form
      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')

      // Submit form
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      // Check loading state
      expect(screen.getByRole('button', { name: /Tracking.../i })).toBeDisabled()

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('MW-ABC123')).toBeInTheDocument()
      })
    })

    it('should display order items with correct details', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText('Custom T-Shirt')).toBeInTheDocument()
        expect(screen.getByText(/Size: M • Color: Black • Qty: 2/)).toBeInTheDocument()
        expect(screen.getByText('$50.00')).toBeInTheDocument()
      })
    })

    it('should display order total', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText('$64.50')).toBeInTheDocument()
      })
    })
  })

  describe('Requirement 6.3: Failed order lookup', () => {
    it('should display error message when order is not found', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Order not found' }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-WRONG')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText(/Order not found/i)).toBeInTheDocument()
      })
    })

    it('should display generic error message on server error', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText(/Internal server error/i)).toBeInTheDocument()
      })
    })

    it('should display error message on network failure', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText(/An error occurred while tracking your order/i)).toBeInTheDocument()
      })
    })

    it('should clear previous error when submitting again', async () => {
      const user = userEvent.setup()
      
      // First request fails
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Order not found' }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-WRONG')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText(/Order not found/i)).toBeInTheDocument()
      })

      // Second request succeeds
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      await user.clear(screen.getByLabelText(/Email Address/i))
      await user.clear(screen.getByLabelText(/Order Number/i))
      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.queryByText(/Order not found/i)).not.toBeInTheDocument()
        expect(screen.getByText('MW-ABC123')).toBeInTheDocument()
      })
    })
  })

  describe('Requirement 6.3: Tracking info display', () => {
    it('should display order status with user-friendly message', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText('Shipped')).toBeInTheDocument()
        expect(screen.getByText(/Your order has been shipped and is on its way to you!/i)).toBeInTheDocument()
      })
    })

    it('should display tracking number when available', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText('1Z999AA10123456784')).toBeInTheDocument()
      })
    })

    it('should display carrier when available', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText('UPS')).toBeInTheDocument()
      })
    })

    it('should not display tracking section when tracking number is not available', async () => {
      const user = userEvent.setup()
      const orderWithoutTracking = {
        ...mockOrder,
        trackingNumber: undefined,
        carrier: undefined,
        status: 'payment_confirmed',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: orderWithoutTracking }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText('MW-ABC123')).toBeInTheDocument()
      })

      expect(screen.queryByText(/Tracking Information/i)).not.toBeInTheDocument()
    })

    it('should display estimated delivery date', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText(/Estimated Delivery/i)).toBeInTheDocument()
      })
    })

    it('should display order date', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText(/Order Date/i)).toBeInTheDocument()
        expect(screen.getByText(/Jan 5, 2024/i)).toBeInTheDocument()
      })
    })

    it('should display different status messages for different order statuses', async () => {
      const statuses: Array<{ status: string; title: string }> = [
        { status: 'payment_confirmed', title: 'Payment Confirmed' },
        { status: 'submitted_to_gelato', title: 'Order Submitted' },
        { status: 'printing', title: 'Printing in Progress' },
        { status: 'shipped', title: 'Shipped' },
        { status: 'delivered', title: 'Delivered' },
        { status: 'cancelled', title: 'Cancelled' },
        { status: 'failed', title: 'Processing Failed' },
      ]

      for (const { status, title } of statuses) {
        const user = userEvent.setup()
        const orderWithStatus = { ...mockOrder, status }

        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ order: orderWithStatus }),
        })

        const { unmount } = render(<OrderTrackingPage />)

        await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
        await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
        await user.click(screen.getByRole('button', { name: /Track Order/i }))

        await waitFor(() => {
          expect(screen.getByText(title)).toBeInTheDocument()
        })

        unmount()
      }
    })
  })

  describe('Requirement 6.4: Carrier URL generation for known carriers', () => {
    it('should generate correct USPS tracking URL', async () => {
      const user = userEvent.setup()
      const orderWithUSPS = {
        ...mockOrder,
        carrier: 'USPS',
        trackingNumber: '9400111899562537866033',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: orderWithUSPS }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        const trackingLink = screen.getByRole('link', { name: /Track on USPS Website/i })
        expect(trackingLink).toHaveAttribute(
          'href',
          'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899562537866033'
        )
      })
    })

    it('should generate correct UPS tracking URL', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        const trackingLink = screen.getByRole('link', { name: /Track on UPS Website/i })
        expect(trackingLink).toHaveAttribute(
          'href',
          'https://www.ups.com/track?tracknum=1Z999AA10123456784'
        )
      })
    })

    it('should generate correct FedEx tracking URL', async () => {
      const user = userEvent.setup()
      const orderWithFedEx = {
        ...mockOrder,
        carrier: 'FedEx',
        trackingNumber: '123456789012',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: orderWithFedEx }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        const trackingLink = screen.getByRole('link', { name: /Track on FedEx Website/i })
        expect(trackingLink).toHaveAttribute(
          'href',
          'https://www.fedex.com/fedextrack/?trknbr=123456789012'
        )
      })
    })

    it('should generate correct DHL tracking URL', async () => {
      const user = userEvent.setup()
      const orderWithDHL = {
        ...mockOrder,
        carrier: 'DHL',
        trackingNumber: '1234567890',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: orderWithDHL }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        const trackingLink = screen.getByRole('link', { name: /Track on DHL Website/i })
        expect(trackingLink).toHaveAttribute(
          'href',
          'https://www.dhl.com/en/express/tracking.html?AWB=1234567890'
        )
      })
    })

    it('should handle carrier names case-insensitively', async () => {
      const user = userEvent.setup()
      const orderWithLowercaseCarrier = {
        ...mockOrder,
        carrier: 'ups',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: orderWithLowercaseCarrier }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        const trackingLink = screen.getByRole('link', { name: /Track on ups Website/i })
        expect(trackingLink).toHaveAttribute(
          'href',
          'https://www.ups.com/track?tracknum=1Z999AA10123456784'
        )
      })
    })

    it('should generate Google search URL for unknown carriers', async () => {
      const user = userEvent.setup()
      const orderWithUnknownCarrier = {
        ...mockOrder,
        carrier: 'Unknown Carrier',
        trackingNumber: 'ABC123XYZ',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: orderWithUnknownCarrier }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        const trackingLink = screen.getByRole('link', { name: /Track on Unknown Carrier Website/i })
        expect(trackingLink).toHaveAttribute(
          'href',
          expect.stringContaining('https://www.google.com/search?q=')
        )
        expect(trackingLink.getAttribute('href')).toContain('Unknown%20Carrier')
        expect(trackingLink.getAttribute('href')).toContain('ABC123XYZ')
      })
    })

    it('should open tracking links in new tab', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        const trackingLink = screen.getByRole('link', { name: /Track on UPS Website/i })
        expect(trackingLink).toHaveAttribute('target', '_blank')
        expect(trackingLink).toHaveAttribute('rel', 'noopener noreferrer')
      })
    })
  })

  describe('Edge cases and user interactions', () => {
    it('should allow tracking another order after viewing results', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText('MW-ABC123')).toBeInTheDocument()
      })

      // Click "Track Another Order" button
      const trackAnotherButton = screen.getByRole('button', { name: /Track Another Order/i })
      await user.click(trackAnotherButton)

      // Form should be cleared and visible again
      const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement
      const orderNumberInput = screen.getByLabelText(/Order Number/i) as HTMLInputElement

      expect(emailInput.value).toBe('')
      expect(orderNumberInput.value).toBe('')
      expect(screen.queryByText('MW-ABC123')).not.toBeInTheDocument()
    })

    it('should provide Continue Shopping link', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: mockOrder }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        const continueShoppingLink = screen.getByRole('link', { name: /Continue Shopping/i })
        expect(continueShoppingLink).toBeInTheDocument()
        expect(continueShoppingLink).toHaveAttribute('href', '/')
      })
    })

    it('should display help section with support email', () => {
      render(<OrderTrackingPage />)

      expect(screen.getByText(/Need help with your order?/i)).toBeInTheDocument()
      const supportLink = screen.getByRole('link', { name: /support@monowaves.com/i })
      expect(supportLink).toHaveAttribute('href', 'mailto:support@monowaves.com')
    })

    it('should handle multiple items in order', async () => {
      const user = userEvent.setup()
      const orderWithMultipleItems = {
        ...mockOrder,
        items: [
          ...mockOrder.items,
          {
            productId: 'prod-2',
            productName: 'Custom Mug',
            gelatoProductUid: 'mug-001',
            size: 'Standard',
            color: 'White',
            quantity: 1,
            price: 15.00,
            designUrl: 'https://example.com/mug-design.png',
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: orderWithMultipleItems }),
      })

      render(<OrderTrackingPage />)

      await user.type(screen.getByLabelText(/Email Address/i), 'customer@example.com')
      await user.type(screen.getByLabelText(/Order Number/i), 'MW-ABC123')
      await user.click(screen.getByRole('button', { name: /Track Order/i }))

      await waitFor(() => {
        expect(screen.getByText('Custom T-Shirt')).toBeInTheDocument()
        expect(screen.getByText('Custom Mug')).toBeInTheDocument()
      })
    })
  })
})
