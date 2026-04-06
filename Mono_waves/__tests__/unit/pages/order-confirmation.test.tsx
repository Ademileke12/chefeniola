/**
 * Unit tests for Order Confirmation Page
 * 
 * Tests:
 * - Page renders with valid session ID
 * - Page handles missing session ID
 * - Page handles invalid session ID
 * - Conditional tracking display
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { notFound } from 'next/navigation'
import OrderConfirmationPage from '@/app/order/confirmation/page'
import { orderService } from '@/lib/services/orderService'
import type { Order } from '@/types/order'

// Mock dependencies
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}))

jest.mock('@/lib/services/orderService', () => ({
  orderService: {
    getOrderBySessionId: jest.fn(),
  },
  calculateEstimatedDelivery: jest.fn((date: Date) => {
    return 'Monday, January 15, 2024'
  }),
}))

describe('Order Confirmation Page', () => {
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
        productName: 'Custom T-Shirt',
        gelatoProductUid: 'tshirt-001',
        size: 'M',
        color: 'Black',
        quantity: 2,
        price: 25.00,
        designUrl: 'https://example.com/design.png',
      },
      {
        productName: 'Custom Mug',
        gelatoProductUid: 'mug-001',
        size: 'Standard',
        color: 'White',
        quantity: 1,
        price: 15.00,
        designUrl: 'https://example.com/mug-design.png',
      },
    ],
    subtotal: 65.00,
    shippingCost: 10.00,
    tax: 5.85,
    total: 80.85,
    stripePaymentId: 'pi_123',
    stripeSessionId: 'cs_test_123',
    status: 'payment_confirmed',
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-05T10:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Requirement 1.1: Session ID handling', () => {
    it('should render page with valid session ID', async () => {
      // Mock successful order fetch
      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(mockOrder)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      // Verify order details are displayed
      expect(screen.getByText('Order Confirmed!')).toBeInTheDocument()
      expect(screen.getByText('MW-ABC123')).toBeInTheDocument()
      expect(screen.getByText(/customer@example.com/)).toBeInTheDocument()
    })

    it('should call notFound when session ID is missing', async () => {
      await OrderConfirmationPage({
        searchParams: {},
      })

      expect(notFound).toHaveBeenCalled()
    })

    it('should call notFound when session ID is invalid', async () => {
      // Mock order not found
      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(null)

      await OrderConfirmationPage({
        searchParams: { session_id: 'invalid_session' },
      })

      expect(notFound).toHaveBeenCalled()
    })
  })

  describe('Requirement 1.2: Display order information', () => {
    it('should display order number', async () => {
      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(mockOrder)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      expect(screen.getByText('MW-ABC123')).toBeInTheDocument()
    })

    it('should display all items ordered', async () => {
      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(mockOrder)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      // Check first item
      expect(screen.getByText('Custom T-Shirt')).toBeInTheDocument()
      expect(screen.getByText(/Size: M • Color: Black • Qty: 2/)).toBeInTheDocument()
      expect(screen.getByText('$50.00')).toBeInTheDocument() // 25 * 2

      // Check second item
      expect(screen.getByText('Custom Mug')).toBeInTheDocument()
      expect(screen.getByText(/Size: Standard • Color: White • Qty: 1/)).toBeInTheDocument()
      expect(screen.getByText('$15.00')).toBeInTheDocument()
    })

    it('should display shipping address', async () => {
      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(mockOrder)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('123 Main St')).toBeInTheDocument()
      expect(screen.getByText('Apt 4B')).toBeInTheDocument()
      expect(screen.getByText(/New York, NY 10001/)).toBeInTheDocument()
      expect(screen.getByText('US')).toBeInTheDocument()
      expect(screen.getByText('+1234567890')).toBeInTheDocument()
    })

    it('should display total paid with breakdown', async () => {
      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(mockOrder)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      // Check order summary breakdown
      expect(screen.getByText('$65.00')).toBeInTheDocument() // Subtotal
      expect(screen.getByText('$10.00')).toBeInTheDocument() // Shipping
      expect(screen.getByText('$5.85')).toBeInTheDocument() // Tax
      expect(screen.getByText('$80.85')).toBeInTheDocument() // Total
    })

    it('should handle address without addressLine2', async () => {
      const orderWithoutLine2 = {
        ...mockOrder,
        shippingAddress: {
          ...mockOrder.shippingAddress,
          addressLine2: undefined,
        },
      }

      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(orderWithoutLine2)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      expect(screen.getByText('123 Main St')).toBeInTheDocument()
      expect(screen.queryByText('Apt 4B')).not.toBeInTheDocument()
    })
  })

  describe('Requirement 1.3: Estimated delivery date', () => {
    it('should display estimated delivery date', async () => {
      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(mockOrder)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      expect(screen.getByText('Monday, January 15, 2024')).toBeInTheDocument()
      expect(screen.getByText('(7-10 business days from order date)')).toBeInTheDocument()
    })
  })

  describe('Requirement 1.4: Track Order button', () => {
    it('should provide Track Order button with correct link', async () => {
      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(mockOrder)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      const trackButton = screen.getByRole('link', { name: /Track Order/i })
      expect(trackButton).toBeInTheDocument()
      expect(trackButton).toHaveAttribute(
        'href',
        '/order/track?email=customer%40example.com&orderNumber=MW-ABC123'
      )
    })
  })

  describe('Requirement 1.5: Conditional tracking display', () => {
    it('should display tracking number when available', async () => {
      const orderWithTracking = {
        ...mockOrder,
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
      }

      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(orderWithTracking)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      expect(screen.getByText('1Z999AA10123456784')).toBeInTheDocument()
      expect(screen.getByText('Carrier: UPS')).toBeInTheDocument()
    })

    it('should not display tracking section when tracking number is not available', async () => {
      const orderWithoutTracking = {
        ...mockOrder,
        trackingNumber: undefined,
        carrier: undefined,
      }

      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(orderWithoutTracking)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      expect(screen.queryByText(/Tracking Number/i)).not.toBeInTheDocument()
    })

    it('should display tracking number without carrier when carrier is not available', async () => {
      const orderWithTrackingNoCarrier = {
        ...mockOrder,
        trackingNumber: '1Z999AA10123456784',
        carrier: undefined,
      }

      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(orderWithTrackingNoCarrier)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      expect(screen.getByText('1Z999AA10123456784')).toBeInTheDocument()
      expect(screen.queryByText(/Carrier:/)).not.toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should handle order with zero tax', async () => {
      const orderWithZeroTax = {
        ...mockOrder,
        tax: 0,
        total: 75.00,
      }

      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(orderWithZeroTax)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      expect(screen.getByText('$0.00')).toBeInTheDocument() // Tax line
      expect(screen.getByText('$75.00')).toBeInTheDocument() // Total
    })

    it('should handle single item order', async () => {
      const singleItemOrder = {
        ...mockOrder,
        items: [mockOrder.items[0]],
        subtotal: 50.00,
        total: 65.85,
      }

      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(singleItemOrder)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      expect(screen.getByText('Custom T-Shirt')).toBeInTheDocument()
      expect(screen.queryByText('Custom Mug')).not.toBeInTheDocument()
    })

    it('should display order date in correct format', async () => {
      ;(orderService.getOrderBySessionId as jest.Mock).mockResolvedValue(mockOrder)

      const page = await OrderConfirmationPage({
        searchParams: { session_id: 'cs_test_123' },
      })

      render(page)

      // The date should be formatted as "Jan 5, 2024"
      expect(screen.getByText('Jan 5, 2024')).toBeInTheDocument()
    })
  })
})
